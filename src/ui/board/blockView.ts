import {
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  BoxGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type CanvasTexture,
} from 'three';
import { indexOf, inside, lineIdAt, pointOf, type Axis, type Point } from '../../engine/volume';
import { BROKEN, PAINTED } from '../../game/game';
import type { Puzzle } from '../../puzzles/format';
import { reducedMotion } from '../motion';
import { token } from '../tokens';
import { drawAtlas, faceUV, type FaceState } from './atlas';

interface FaceDef {
  axis: Axis;
  sign: 1 | -1;
  n: [number, number, number];
  /** Text right and up on the face, as seen from outside it. */
  r: [number, number, number];
  u: [number, number, number];
  /** Flat shading by direction, so the block reads as solid without lights. */
  shade: number;
}

const FACES: FaceDef[] = [
  { axis: 'y', sign: 1, n: [0, 1, 0], r: [1, 0, 0], u: [0, 0, -1], shade: 1 },
  { axis: 'y', sign: -1, n: [0, -1, 0], r: [1, 0, 0], u: [0, 0, 1], shade: 0.72 },
  { axis: 'z', sign: 1, n: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], shade: 0.93 },
  { axis: 'z', sign: -1, n: [0, 0, -1], r: [-1, 0, 0], u: [0, 1, 0], shade: 0.93 },
  { axis: 'x', sign: 1, n: [1, 0, 0], r: [0, 0, -1], u: [0, 1, 0], shade: 0.84 },
  { axis: 'x', sign: -1, n: [-1, 0, 0], r: [0, 0, 1], u: [0, 1, 0], shade: 0.84 },
];

/** Layers peeled off one side of the block, to see inside. */
export interface Cut {
  axis: Axis;
  /** How many layers are hidden, counted from the side facing the camera. */
  layers: number;
}

export interface Pick {
  cell: number;
  /** The axis of the face that was hit (the line its clue belongs to). */
  axis: Axis;
}

const MIN_PITCH = -1.2;
const MAX_PITCH = 1.35;

/**
 * The block in WebGL: one mesh of every visible cube face, each face showing the clue of
 * the line that runs into it. Draws only when something changes.
 */
export class BlockView {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 0.1, 200);
  private group = new Group();
  private mesh: Mesh;
  private faceMaterial: MeshBasicMaterial;
  private colorMaterial = new MeshBasicMaterial({ vertexColors: true });
  private atlas: CanvasTexture;
  private cursorBox: LineSegments;
  private faceCells: Int32Array = new Int32Array(0);
  private faceAxes: Axis[] = [];
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private spinUntil = 0;
  yaw = -0.6;
  pitch = 0.5;
  zoom = 1;
  cut: Cut | null = null;
  lit = new Set<number>();
  cursor: number | null = null;
  revealed = false;

  constructor(
    private puzzle: Puzzle,
    private blocks: Uint8Array,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'block-canvas';
    this.atlas = drawAtlas();
    this.atlas.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.faceMaterial = new MeshBasicMaterial({ map: this.atlas, vertexColors: true });
    this.mesh = new Mesh(new BufferGeometry(), this.faceMaterial);
    this.cursorBox = new LineSegments(
      new EdgesGeometry(new BoxGeometry(1.06, 1.06, 1.06)),
      new LineBasicMaterial({ depthTest: false, transparent: true }),
    );
    this.cursorBox.renderOrder = 1;
    this.cursorBox.visible = false;
    this.group.add(this.mesh, this.cursorBox);
    this.scene.add(this.group);
    this.applyTheme();
    this.rebuild();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
  }

  /** Re-reads the theme's colors (after a theme or contrast change). */
  applyTheme(): void {
    drawAtlas(this.atlas);
    (this.cursorBox.material as LineBasicMaterial).color = new Color(token('--accent'));
    this.rebuild();
  }

  private center(p: Point): Vector3 {
    const d = this.puzzle.dims;
    return new Vector3(p.x - d.x / 2 + 0.5, p.y - d.y / 2 + 0.5, p.z - d.z / 2 + 0.5);
  }

  /** Which side of the block the camera is on, along an axis. */
  private cameraSide(axis: Axis): 1 | -1 {
    if (axis === 'y') return 1;
    const v = this.cameraOffset();
    return (axis === 'x' ? v.x : v.z) >= 0 ? 1 : -1;
  }

  /** Whether a cube is hidden by the cut. */
  private cutAway(p: Point): boolean {
    if (!this.cut || !this.cut.layers) return false;
    const { axis, layers } = this.cut;
    const n = this.puzzle.dims[axis];
    return this.cameraSide(axis) === 1 ? p[axis] >= n - layers : p[axis] < layers;
  }

  private shown(p: Point): boolean {
    const d = this.puzzle.dims;
    if (!inside(d, p)) return false;
    const i = indexOf(d, p);
    if (this.revealed) return this.puzzle.solution[i] !== 0;
    return this.blocks[i] !== BROKEN && !this.cutAway(p);
  }

  /** Rebuilds the mesh from the blocks. Cheap enough to call after every change. */
  rebuild(): void {
    const { dims, clues } = this.puzzle;
    const pos: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    const index: number[] = [];
    const cells: number[] = [];
    const axes: Axis[] = [];
    const litCells = new Set<number>();
    for (const id of this.lit) for (const c of this.puzzle.lines[id].cells) litCells.add(c);
    const palette = this.puzzle.palette.map((name) => new Color(token(`--vox-${name}`)));
    for (let i = 0; i < this.blocks.length; i++) {
      const p = pointOf(dims, i);
      if (!this.shown(p)) continue;
      const c = this.center(p);
      for (const f of FACES) {
        const q = { ...p, [f.axis]: p[f.axis] + f.sign };
        if (this.shown(q)) continue;
        const base = pos.length / 3;
        const corners: [number, number][] = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ];
        for (const [a, b] of corners) {
          for (let k = 0; k < 3; k++)
            pos.push(c.getComponent(k) + (f.n[k] + a * f.r[k] + b * f.u[k]) / 2);
        }
        if (this.revealed) {
          const color = palette[this.puzzle.solution[i] - 1];
          for (let k = 0; k < 4; k++)
            col.push(color.r * f.shade, color.g * f.shade, color.b * f.shade);
          uv.push(0, 0, 0, 0, 0, 0, 0, 0);
        } else {
          const state: FaceState =
            this.blocks[i] === PAINTED ? 'painted' : litCells.has(i) ? 'lit' : 'solid';
          const [u0, v0, u1, v1] = faceUV(state, clues[lineIdAt(dims, f.axis, p)]);
          uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
          for (let k = 0; k < 4; k++) col.push(f.shade, f.shade, f.shade);
        }
        index.push(base, base + 1, base + 2, base, base + 2, base + 3);
        cells.push(i);
        axes.push(f.axis);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
    geometry.setIndex(index);
    geometry.computeBoundingSphere();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.material = this.revealed ? this.colorMaterial : this.faceMaterial;
    this.faceCells = Int32Array.from(cells);
    this.faceAxes = axes;
    this.updateCursor();
    this.invalidate();
  }

  private updateCursor(): void {
    this.cursorBox.visible = this.cursor !== null && !this.revealed;
    // For tests and debugging: the cube under the keyboard or mouse cursor.
    this.canvas.dataset.cursor = this.cursor === null ? '' : String(this.cursor);
    if (this.cursor !== null)
      this.cursorBox.position.copy(this.center(pointOf(this.puzzle.dims, this.cursor)));
  }

  setCursor(cell: number | null): void {
    this.cursor = cell;
    this.updateCursor();
    this.invalidate();
  }

  /** Where the camera sits relative to the block's center. */
  private cameraOffset(): Vector3 {
    const d = this.puzzle.dims;
    const radius = 0.5 * Math.hypot(d.x, d.y, d.z);
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const fit = radius / Math.sin(Math.min(vfov, hfov) / 2);
    const dist = (fit * 0.92) / this.zoom;
    return new Vector3(
      dist * Math.cos(this.pitch) * Math.sin(this.yaw),
      dist * Math.sin(this.pitch),
      dist * Math.cos(this.pitch) * Math.cos(this.yaw),
    );
  }

  /** Turns the camera around the block. Rebuilds if that changes which side a cut peels. */
  orbit(dYaw: number, dPitch: number): void {
    const sides = this.cut ? this.cameraSide(this.cut.axis) : 0;
    this.yaw += dYaw;
    this.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.pitch + dPitch));
    if (this.cut && this.cameraSide(this.cut.axis) !== sides) this.rebuild();
    else this.invalidate();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.6, Math.min(3, zoom));
    this.invalidate();
  }

  setCut(cut: Cut | null): void {
    this.cut = cut;
    this.rebuild();
  }

  /** The world axis that best matches the camera's right (for keyboard arrows). */
  screenAxes(): { right: [Axis, 1 | -1]; away: [Axis, 1 | -1] } {
    const v = this.cameraOffset();
    const away =
      Math.abs(v.x) > Math.abs(v.z)
        ? (['x', v.x > 0 ? -1 : 1] as const)
        : (['z', v.z > 0 ? -1 : 1] as const);
    const right =
      Math.abs(v.x) > Math.abs(v.z)
        ? (['z', v.x > 0 ? -1 : 1] as const)
        : (['x', v.z > 0 ? 1 : -1] as const);
    return { right: [...right], away: [...away] };
  }

  /** The cube face under a point on the screen. */
  pick(clientX: number, clientY: number): Pick | null {
    if (this.revealed) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new Raycaster();
    this.placeCamera();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObject(this.mesh)[0];
    if (!hit || hit.faceIndex == null) return null;
    const face = Math.floor(hit.faceIndex / 2);
    return { cell: this.faceCells[face], axis: this.faceAxes[face] };
  }

  /** Shows the solved shape in its colors and gives it a turn. */
  reveal(): void {
    this.revealed = true;
    this.lit.clear();
    this.cut = null;
    this.rebuild();
    if (!reducedMotion()) this.spinUntil = performance.now() + 2400;
    this.invalidate();
  }

  private placeCamera(): void {
    this.camera.position.copy(this.cameraOffset());
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  /** Asks for a redraw on the next frame. */
  invalidate(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0;
      if (now < this.spinUntil) {
        const left = (this.spinUntil - now) / 2400;
        this.yaw += 0.09 * Math.sin(left * Math.PI) + 0.004;
        this.invalidate();
      }
      this.placeCamera();
      this.renderer.render(this.scene, this.camera);
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.mesh.geometry.dispose();
    this.faceMaterial.dispose();
    this.colorMaterial.dispose();
    this.atlas.dispose();
    this.renderer.dispose();
  }
}

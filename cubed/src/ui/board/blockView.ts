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
import type { Clue } from '../../engine/clues';
import { indexOf, inside, lineIdAt, pointOf, type Axis, type Point } from '../../engine/volume';
import { BROKEN, PAINTED } from '../../game/game';
import type { Puzzle } from '../../puzzles/format';
import { reducedMotion } from '../motion';
import { token } from '../tokens';
import { drawAtlas, faceUV, STATES, type FaceState } from './atlas';

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

/** Layers peeled off one end of an axis, to see inside. Each axis has its own. */
export interface Peel {
  /** Which end: low (left, bottom, back) or high (right, top, front). */
  from: 'low' | 'high';
  layers: number;
}

/**
 * Lets a screen restyle faces: given a face's cube, axis and line, a state to draw
 * instead of the ordinary one, or null for the ordinary one.
 */
export type FaceStyler = (cell: number, axis: Axis, line: number) => FaceState | null;

export interface Pick {
  cell: number;
  /** The axis of the face that was hit (the line its clue belongs to). */
  axis: Axis;
}

const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

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
  /** One material per face state, each with its own clue texture. */
  private faceMaterials: MeshBasicMaterial[];
  private colorMaterial = new MeshBasicMaterial({ vertexColors: true });
  private atlases: CanvasTexture[];
  private cursorBox: LineSegments;
  private faceCells: Int32Array = new Int32Array(0);
  private faceAxes: Axis[] = [];
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private spinUntil = 0;
  yaw = -0.6;
  pitch = 0.5;
  zoom = 1;
  peels: Record<Axis, Peel> = {
    x: { from: 'high', layers: 0 },
    y: { from: 'high', layers: 0 },
    z: { from: 'high', layers: 0 },
  };
  lit = new Set<number>();
  /** Lines whose clue faces look finished. */
  done = new Set<number>();
  styler: FaceStyler | null = null;
  /** Lets a screen show a different clue for a line (a fight's fog, scrambles, forgeries). */
  clueFor: ((line: number) => Clue | null) | null = null;
  private tween: { from: number[]; to: number[]; start: number; ms: number } | null = null;
  cursor: number | null = null;
  revealed = false;
  /** The blocks as last drawn, to spot cubes that just broke. */
  private drawn: Uint8Array;
  /** Cubes breaking right now: chips that fly apart, shrink and fade. */
  private puffs: { mesh: Mesh; from: Vector3; to: Vector3; start: number }[] = [];
  private puffGeometry = new BoxGeometry(1, 1, 1);
  /** How long the last rebuild took, in ms (for checking big blocks stay quick). */
  lastBuildMs = 0;

  constructor(
    private puzzle: Puzzle,
    private blocks: Uint8Array,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    this.drawn = Uint8Array.from(blocks);
    this.canvas.className = 'block-canvas';
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.atlases = STATES.map((state) => {
      const tex = drawAtlas(state);
      tex.anisotropy = anisotropy;
      return tex;
    });
    this.faceMaterials = this.atlases.map(
      (map) => new MeshBasicMaterial({ map, vertexColors: true }),
    );
    this.mesh = new Mesh(new BufferGeometry(), this.faceMaterials);
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

  /** Shows a different puzzle (the editor's preview, as the shape changes). */
  setPuzzle(puzzle: Puzzle, blocks: Uint8Array): void {
    this.puzzle = puzzle;
    this.blocks = blocks;
    this.drawn = Uint8Array.from(blocks);
    this.rebuild();
  }

  /** Re-reads the theme's colors (after a theme or contrast change). */
  applyTheme(): void {
    STATES.forEach((state, i) => drawAtlas(state, this.atlases[i]));
    (this.cursorBox.material as LineBasicMaterial).color = new Color(token('--accent'));
    this.rebuild();
  }

  private center(p: Point): Vector3 {
    const d = this.puzzle.dims;
    return new Vector3(p.x - d.x / 2 + 0.5, p.y - d.y / 2 + 0.5, p.z - d.z / 2 + 0.5);
  }

  /** The end of an axis facing the camera. */
  facingEnd(axis: Axis): Peel['from'] {
    const v = this.cameraOffset();
    return v[axis] >= 0 ? 'high' : 'low';
  }

  /** Whether a cube is peeled away. */
  private cutAway(p: Point): boolean {
    for (const axis of ['x', 'y', 'z'] as const) {
      const { from, layers } = this.peels[axis];
      if (!layers) continue;
      const n = this.puzzle.dims[axis];
      if (from === 'high' ? p[axis] >= n - layers : p[axis] < layers) return true;
    }
    return false;
  }

  /** Whether a cube is peeled away (out of sight and out of reach). */
  isPeeled(cell: number): boolean {
    return this.cutAway(pointOf(this.puzzle.dims, cell));
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
    const t0 = performance.now();
    this.puffBroken();
    const { dims, clues } = this.puzzle;
    const pos: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    // Faces are drawn grouped by state (one material each); picking needs that order.
    const byState: { base: number; cell: number; axis: Axis }[][] = STATES.map(() => []);
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
        for (const [a, b] of CORNERS) {
          for (let k = 0; k < 3; k++) {
            pos.push(c.getComponent(k) + (f.n[k] + a * f.r[k] + b * f.u[k]) / 2);
          }
        }
        let state: FaceState = 'solid';
        if (this.revealed) {
          const color = palette[this.puzzle.solution[i] - 1];
          for (let k = 0; k < 4; k++) {
            col.push(color.r * f.shade, color.g * f.shade, color.b * f.shade);
          }
          uv.push(0, 0, 0, 0, 0, 0, 0, 0);
        } else {
          const line = lineIdAt(dims, f.axis, p);
          const painted = this.blocks[i] === PAINTED;
          const done = this.done.has(line);
          state =
            this.styler?.(i, f.axis, line) ??
            (litCells.has(i)
              ? 'lit'
              : painted
                ? done
                  ? 'painted-done'
                  : 'painted'
                : done
                  ? 'done'
                  : 'solid');
          const [u0, v0, u1, v1] = faceUV(this.clueFor ? this.clueFor(line) : clues[line]);
          uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
          for (let k = 0; k < 4; k++) col.push(f.shade, f.shade, f.shade);
        }
        byState[STATES.indexOf(state)].push({ base, cell: i, axis: f.axis });
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
    const index: number[] = [];
    const cells: number[] = [];
    const axes: Axis[] = [];
    byState.forEach((faces, material) => {
      const start = index.length;
      for (const { base, cell, axis } of faces) {
        index.push(base, base + 1, base + 2, base, base + 2, base + 3);
        cells.push(cell);
        axes.push(axis);
      }
      if (faces.length) geometry.addGroup(start, index.length - start, material);
    });
    geometry.setIndex(index);
    geometry.computeBoundingSphere();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.material = this.revealed ? this.colorMaterial : this.faceMaterials;
    this.faceCells = Int32Array.from(cells);
    this.faceAxes = axes;
    this.lastBuildMs = performance.now() - t0;
    // For the performance test: how long the last rebuild took.
    this.canvas.dataset.buildMs = this.lastBuildMs.toFixed(2);
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

  /** Turns the camera around the block. */
  orbit(dYaw: number, dPitch: number): void {
    this.tween = null;
    this.yaw += dYaw;
    this.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.pitch + dPitch));
    this.invalidate();
  }

  /** Moves the camera to a view, animated unless the player prefers reduced motion. */
  animateTo(yaw: number, pitch: number, zoom = this.zoom): void {
    // Take the short way round.
    const turn = Math.PI * 2;
    const target = this.yaw + ((((yaw - this.yaw) % turn) + turn * 1.5) % turn) - turn / 2;
    if (reducedMotion()) {
      [this.yaw, this.pitch, this.zoom] = [target, pitch, zoom];
      this.tween = null;
    } else {
      this.tween = {
        from: [this.yaw, this.pitch, this.zoom],
        to: [target, pitch, zoom],
        start: performance.now(),
        ms: 350,
      };
    }
    this.invalidate();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.6, Math.min(3, zoom));
    this.invalidate();
  }

  setPeel(axis: Axis, peel: Peel): void {
    this.peels[axis] = peel;
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

  /** Starts a puff for each cube broken since the last draw. */
  private puffBroken(): void {
    const broke: number[] = [];
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i] === BROKEN && this.drawn[i] !== BROKEN) broke.push(i);
    }
    this.drawn = Uint8Array.from(this.blocks);
    // A bomb or a reset can break a lot at once; a few cubes say it as well as many.
    if (!broke.length || reducedMotion() || this.revealed) return;
    const color = new Color(token('--cube-edge'));
    const now = performance.now();
    for (const cell of broke.slice(0, 12)) {
      const center = this.center(pointOf(this.puzzle.dims, cell));
      // Four chips from the cube's corners, flying out from its middle and a little up.
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const from = center.clone().add(new Vector3(dx * 0.22, 0.1, dz * 0.22));
        const to = center.clone().add(new Vector3(dx * 0.75, 0.55, dz * 0.75));
        const mesh = new Mesh(
          this.puffGeometry,
          new MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
        );
        mesh.position.copy(from);
        mesh.scale.setScalar(0.38);
        this.group.add(mesh);
        this.puffs.push({ mesh, from, to, start: now });
      }
    }
    this.invalidate();
  }

  /** Moves the puffs along; true while any are still going. */
  private animatePuffs(now: number): boolean {
    const PUFF_MS = 320;
    this.puffs = this.puffs.filter((p) => {
      const t = Math.min(1, (now - p.start) / PUFF_MS);
      const ease = 1 - (1 - t) ** 2;
      p.mesh.position.lerpVectors(p.from, p.to, ease);
      p.mesh.scale.setScalar(0.38 * (1 - ease * 0.6));
      p.mesh.rotation.set(ease * 0.8, ease * 1.1, 0);
      (p.mesh.material as MeshBasicMaterial).opacity = 0.85 * (1 - t * t);
      if (t < 1) return true;
      this.group.remove(p.mesh);
      (p.mesh.material as MeshBasicMaterial).dispose();
      return false;
    });
    return this.puffs.length > 0;
  }

  /** Shows the solved shape in its colors and gives it a turn. */
  reveal(): void {
    this.revealed = true;
    this.lit.clear();
    for (const axis of ['x', 'y', 'z'] as const) this.peels[axis].layers = 0;
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
      if (this.tween) {
        const t = Math.min(1, (now - this.tween.start) / this.tween.ms);
        const ease = 1 - (1 - t) ** 3;
        const [yaw, pitch, zoom] = this.tween.from.map(
          (f, k) => f + (this.tween!.to[k] - f) * ease,
        );
        [this.yaw, this.pitch, this.zoom] = [yaw, pitch, zoom];
        if (t < 1) this.invalidate();
        else this.tween = null;
      }
      if (this.puffs.length && this.animatePuffs(now)) this.invalidate();
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
    for (const p of this.puffs) (p.mesh.material as MeshBasicMaterial).dispose();
    this.puffGeometry.dispose();
    for (const m of this.faceMaterials) m.dispose();
    this.colorMaterial.dispose();
    for (const t of this.atlases) t.dispose();
    this.renderer.dispose();
  }
}

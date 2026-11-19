import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { footprint, type Brick, type BrickSize, type Rotation } from '@picross/block/build/bricks';
import type { BrickBuild } from '@picross/block/build/build';
import type { Puzzle } from '@picross/block/puzzles/format';
import { random } from '@picross/shared/engine/random';
import { reducedMotion } from '@picross/shared/ui/motion';
import { token } from '../tokens';

/** How tall a brick's body is (a cube is 1), leaving a hairline seam between layers. */
const BODY = 0.94;
/** The plate's thickness, under y = 0. */
const PLATE = 0.32;

interface Tween {
  start: number;
  ms: number;
  step(t: number): void;
  done?(): void;
}

/** A brick in the scene: its mesh, and where it rests on the model. */
interface Piece {
  mesh: Group;
  home: Vector3;
}

/** Extras for the bricks route (little kids). All off in Cubed's build stage. */
export interface BrickViewOptions {
  /** Nobody turns the camera: it sways a little on its own. */
  drift?: boolean;
  /** The ghosts a held brick could go in glow and bob, more than a plain highlight. */
  bob?: boolean;
}

/** How the finish looks. Default: Cubed's, the toy low in the stage above the end panel. */
export interface CelebrateOptions {
  /** Keep the toy in the middle of the stage (nothing lies over it). */
  middle?: boolean;
  /** How many happy hops the toy makes on its plate. */
  hops?: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The build in WebGL: the plate, the bricks built so far, a ghost of the layer being built,
 * the pile of bricks still to place, and the brick in your hand. Lit, unlike the puzzle's
 * flat-shaded block, so the bricks read as plastic.
 */
export class BrickView {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 0.1, 400);
  /** Turns as a whole on the turntable at the end. */
  private turntable = new Group();
  private built = new Group();
  private ghosts = new Group();
  private pileGroup = new Group();
  private held: Group | null = null;
  private heldKey = '';
  private pieces = new Map<string, Piece>();
  private ghostMeshes = new Map<number, Group>();
  private pile: { key: string; mesh: Group }[] = [];
  private materials = new Map<string, Material>();
  private geometries = new Map<string, BoxGeometry>();
  private studGeometry = new CylinderGeometry(0.29, 0.31, 0.14, 20);
  private capGeometry = new CylinderGeometry(0.17, 0.2, 0.05, 16);
  private tweens: Tween[] = [];
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private spinning = false;
  private lastFrame = 0;
  /** The camera: around the plate, looking at `targetY`. */
  yaw = -0.62;
  pitch = 0.58;
  zoom = 1;
  private targetY = 0.5;
  private palette: Color[];
  /** The drift's sway, added to `yaw`, and the clock the drift and bob run on. */
  private sway = 0;
  private clock = 0;

  constructor(
    private puzzle: Puzzle,
    private build: BrickBuild,
    private options: BrickViewOptions = {},
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'block-canvas build-canvas';
    this.palette = puzzle.palette.map((name) => new Color(token(`--vox-${name}`)));

    const sky = new HemisphereLight(0xffffff, new Color(token('--vox-stone')), 1.5);
    const sun = new DirectionalLight(0xffffff, 1.7);
    sun.position.set(4, 10, 7);
    this.scene.add(sky, sun, this.turntable);
    this.turntable.add(this.plate(), this.built, this.ghosts, this.pileGroup);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
  }

  // --- Building meshes -------------------------------------------------------------

  private material(key: string, make: () => Material): Material {
    let m = this.materials.get(key);
    if (!m) this.materials.set(key, (m = make()));
    return m;
  }

  private plastic(color: number): Material {
    return this.material(`solid:${color}`, () => {
      return new MeshStandardMaterial({
        color: this.palette[color - 1],
        roughness: 0.38,
        metalness: 0,
      });
    });
  }

  private body(sx: number, sz: number): BoxGeometry {
    const key = `${sx}x${sz}`;
    let g = this.geometries.get(key);
    if (!g) this.geometries.set(key, (g = new BoxGeometry(sx - 0.05, BODY, sz - 0.05)));
    return g;
  }

  /**
   * One brick, centered on its footprint with its bottom at 0. The studs are this game's
   * own: a wide, slightly tapered stud with a smaller step on top.
   */
  private brickMesh(size: BrickSize, rotation: Rotation, material: Material, studs = true) {
    const { sx, sz } = footprint(size, rotation);
    const group = new Group();
    const body = new Mesh(this.body(sx, sz), material);
    body.position.y = BODY / 2;
    group.add(body);
    if (studs) {
      for (let i = 0; i < sx; i++) {
        for (let k = 0; k < sz; k++) {
          const at = (n: number, s: number) => n - s / 2 + 0.5;
          const stud = new Mesh(this.studGeometry, material);
          stud.position.set(at(i, sx), BODY + 0.07, at(k, sz));
          const cap = new Mesh(this.capGeometry, material);
          cap.position.set(at(i, sx), BODY + 0.165, at(k, sz));
          group.add(stud, cap);
        }
      }
    }
    return group;
  }

  /** Where a brick at this corner sits, in the turntable's frame. */
  private placeOf(x: number, y: number, z: number, size: BrickSize, rotation: Rotation): Vector3 {
    const { sx, sz } = footprint(size, rotation);
    const d = this.puzzle.dims;
    return new Vector3(x + sx / 2 - d.x / 2, y, z + sz / 2 - d.z / 2);
  }

  private homeOf(brick: Brick): Vector3 {
    const { x, y, z } = brick.position;
    return this.placeOf(x, y, z, brick.size, brick.rotation);
  }

  private plate(): Group {
    const d = this.puzzle.dims;
    const [w, l] = [d.x + 2, d.z + 2];
    const material = this.material('plate', () => {
      return new MeshStandardMaterial({ color: token('--vox-stone'), roughness: 0.6 });
    });
    const plate = new Group();
    const slab = new Mesh(new BoxGeometry(w, PLATE, l), material);
    slab.position.y = -PLATE / 2;
    plate.add(slab);
    for (let i = 0; i < w; i++) {
      for (let k = 0; k < l; k++) {
        const stud = new Mesh(this.studGeometry, material);
        stud.position.set(i - w / 2 + 0.5, 0.07, k - l / 2 + 0.5);
        plate.add(stud);
      }
    }
    return plate;
  }

  // --- The build -----------------------------------------------------------------------

  private pieceKey = (layer: number, slot: number) => `${layer}:${slot}`;

  /** Draws every brick placed so far, solid, and (unless the pop will) the current ghost. */
  showBuild(ghost = true): void {
    this.build.layers.forEach((bricks, layer) =>
      bricks.forEach((_, slot) => {
        if (this.build.isFilled(layer, slot)) this.addPiece(layer, slot);
      }),
    );
    if (ghost) this.showGhost(false);
    this.targetY = this.layerY() + 0.5;
    this.invalidate();
  }

  private addPiece(layer: number, slot: number): Piece {
    const key = this.pieceKey(layer, slot);
    const existing = this.pieces.get(key);
    if (existing) return existing;
    const brick = this.build.layers[layer][slot];
    const mesh = this.brickMesh(brick.size, brick.rotation, this.plastic(brick.color));
    const home = this.homeOf(brick);
    mesh.position.copy(home);
    this.built.add(mesh);
    const piece = { mesh, home };
    this.pieces.set(key, piece);
    return piece;
  }

  /** The height of the current layer's bottom. */
  private layerY(): number {
    return this.build.current[0]?.position.y ?? 0;
  }

  /** The current layer's open slots, as faint see-through bricks. Fades in when asked. */
  showGhost(fade = true): void {
    this.ghosts.clear();
    this.ghostMeshes.clear();
    const layer = this.build.layer;
    const edge = new Color(token('--ink'));
    this.build.current.forEach((brick, slot) => {
      if (this.build.isFilled(layer, slot)) return;
      const color = this.palette[brick.color - 1];
      const fill = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const { sx, sz } = footprint(brick.size, brick.rotation);
      const group = new Group();
      const body = new Mesh(this.body(sx, sz), fill);
      body.position.y = BODY / 2;
      const lines = new LineSegments(
        new EdgesGeometry(this.body(sx, sz)),
        new LineBasicMaterial({ color: edge, transparent: true, opacity: 0 }),
      );
      lines.position.y = BODY / 2;
      group.add(body, lines);
      group.position.copy(this.homeOf(brick));
      group.userData = { fill, lines: lines.material, y: group.position.y };
      this.ghosts.add(group);
      this.ghostMeshes.set(slot, group);
    });
    this.setGhostLevel(fade && !reducedMotion() ? 0 : 1);
    if (fade && !reducedMotion()) this.tween(450, (t) => this.setGhostLevel(easeOut(t)));
    this.highlight(this.heldKey);
  }

  private ghostLevel = 1;
  private highlighted = new Set<number>();

  private setGhostLevel(level: number): void {
    this.ghostLevel = level;
    // With `bob`, the ghosts a held brick could go in pulse and bob (`bobbing`).
    const wave = this.bobbing() ? (Math.sin(this.clock * 0.006) + 1) / 2 : 0;
    for (const [slot, group] of this.ghostMeshes) {
      const lit = this.highlighted.has(slot);
      const { fill, lines, y } = group.userData as {
        fill: MeshBasicMaterial;
        lines: Material;
        y: number;
      };
      fill.opacity = level * (lit ? 0.6 + 0.25 * wave : 0.34);
      lines.opacity = level * (lit ? 1 : 0.5);
      group.position.y = y + (lit ? wave * 0.22 : 0);
    }
    this.invalidate();
  }

  /** The held brick's ghosts are bobbing: `bob` is on and something's lit. */
  private bobbing(): boolean {
    return !!this.options.bob && this.highlighted.size > 0 && !reducedMotion();
  }

  /** Brightens the open slots a held brick could go in (any way round). */
  highlight(kind: string): void {
    this.highlighted.clear();
    this.build.current.forEach((b, slot) => {
      if (kind && `${b.size}:${b.color}` === kind && !this.build.isFilled(this.build.layer, slot))
        this.highlighted.add(slot);
    });
    this.setGhostLevel(this.ghostLevel);
  }

  // --- The brick in your hand ----------------------------------------------------------

  /** Picks up a brick of this kind (null puts it down). */
  hold(kind: { size: BrickSize; color: number; rotation: Rotation } | null): void {
    if (this.held) this.turntable.remove(this.held);
    this.held = null;
    this.heldKey = kind ? `${kind.size}:${kind.color}` : '';
    if (kind) {
      const material = this.material(`held:${kind.color}`, () => {
        return new MeshStandardMaterial({
          color: this.palette[kind.color - 1],
          roughness: 0.38,
          transparent: true,
          opacity: 0.82,
        });
      });
      this.held = this.brickMesh(kind.size, kind.rotation, material);
      this.held.visible = false;
      this.turntable.add(this.held);
    }
    this.highlight(this.heldKey);
    this.invalidate();
  }

  /** Shows the held brick at a corner of the current layer: snug in a slot, or hovering. */
  moveHeld(x: number, z: number, size: BrickSize, rotation: Rotation, snapped: boolean): void {
    if (!this.held) return;
    this.held.visible = true;
    this.held.position.copy(this.placeOf(x, this.layerY(), z, size, rotation));
    if (!snapped) this.held.position.y += 0.35;
    this.invalidate();
  }

  hideHeld(): void {
    if (this.held) this.held.visible = false;
    this.invalidate();
  }

  /**
   * The grid corner under the pointer for a brick of this footprint, on the current layer's
   * top, or null off the plate's plane.
   */
  cornerAt(clientX: number, clientY: number, size: BrickSize, rotation: Rotation) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.placeCamera();
    const ray = new Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const local = ray.ray.clone().applyMatrix4(this.turntable.matrixWorld.clone().invert());
    const hit = local.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -(this.layerY() + BODY)),
      new Vector3(),
    );
    if (!hit) return null;
    const { sx, sz } = footprint(size, rotation);
    const d = this.puzzle.dims;
    return {
      x: Math.round(hit.x + d.x / 2 - sx / 2),
      z: Math.round(hit.z + d.z / 2 - sz / 2),
    };
  }

  /**
   * The held brick drops into its slot with a little squash; one from the pile goes. With
   * `from`, it flies there first from where it was dropped, turning on the way if `turned`.
   */
  placed(layer: number, slot: number, from?: { x: number; z: number; turned?: boolean }): void {
    const brick = this.build.layers[layer][slot];
    const piece = this.addPiece(layer, slot);
    const ghost = this.ghostMeshes.get(slot);
    if (ghost) this.ghosts.remove(ghost);
    this.ghostMeshes.delete(slot);
    this.highlighted.delete(slot);
    this.hideHeld();
    this.takeFromPile(`${brick.size}:${brick.color}`);
    if (reducedMotion()) return this.invalidate();
    const { mesh, home } = piece;
    const squash = () =>
      this.tween(220, (t) => {
        const e = easeOut(t);
        mesh.position.set(home.x, home.y + 0.35 * (1 - e), home.z);
        const s = t < 0.7 ? 1 : 1 - Math.sin(((t - 0.7) / 0.3) * Math.PI) * 0.12;
        mesh.scale.set(2 - s, s, 2 - s);
      });
    if (!from) return squash();
    // A short flight, an arc from the drop to just over the slot, then the squash.
    const start = this.placeOf(from.x, home.y, from.z, brick.size, brick.rotation);
    start.y += 0.6;
    const over = home.clone().setY(home.y + 0.35);
    const turn = from.turned ? Math.PI / 2 : 0;
    const height = 0.6 + Math.min(2, start.distanceTo(over) * 0.25);
    mesh.position.copy(start);
    mesh.rotation.y = turn;
    this.tween(
      340,
      (t) => {
        const e = easeInOut(t);
        mesh.position.lerpVectors(start, over, e);
        mesh.position.y += Math.sin(t * Math.PI) * height;
        mesh.rotation.y = turn * (1 - e);
      },
      () => {
        mesh.rotation.y = 0;
        squash();
      },
    );
  }

  /** A wrong drop: the held brick hops up and back a little, then is ready again. */
  bounce(x: number, z: number, size: BrickSize, rotation: Rotation): void {
    if (!this.held || reducedMotion()) return;
    const held = this.held;
    const from = this.placeOf(x, this.layerY(), z, size, rotation);
    held.visible = true;
    this.tween(360, (t) => {
      held.position.set(from.x, from.y + 0.35 + Math.sin(t * Math.PI) * 0.6, from.z);
      held.rotation.z = Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
    });
  }

  /** A finished layer: its bricks pop, the camera moves up, the next ghost fades in. */
  layerDone(layer: number): void {
    const meshes = this.build.layers[layer].map(
      (_, slot) => this.pieces.get(this.pieceKey(layer, slot))?.mesh,
    );
    if (!reducedMotion()) {
      this.tween(300, (t) => {
        const s = 1 + Math.sin(t * Math.PI) * 0.06;
        for (const m of meshes) m?.scale.set(s, s, s);
      });
    }
  }

  /** Moves the camera's aim to the layer now being built. */
  rise(): void {
    const from = this.targetY;
    const to = this.layerY() + 0.5;
    if (reducedMotion()) this.targetY = to;
    else this.tween(600, (t) => (this.targetY = from + (to - from) * easeInOut(t)));
    this.invalidate();
  }

  // --- The pile, and the pop -------------------------------------------------------------

  /** Where each still-to-build brick lies around the plate, scattered but always the same. */
  private pileSpot(i: number, n: number): { at: Vector3; turn: number } {
    const rand = random(i * 7919 + 17);
    const d = this.puzzle.dims;
    const r0 = Math.hypot(d.x + 2, d.z + 2) / 2 + 0.8;
    const angle = (i / n) * Math.PI * 2 + rand() * 0.5;
    const r = r0 + rand() * 2.4;
    return {
      at: new Vector3(Math.cos(angle) * r, -PLATE, Math.sin(angle) * r),
      turn: rand() * Math.PI * 2,
    };
  }

  /**
   * The solved block comes apart: it shows built of bricks, then every brick still to place
   * flies out and lands around the plate. Resolves once they've landed.
   */
  pop(): Promise<void> {
    const todo: { layer: number; slot: number; brick: Brick }[] = [];
    this.build.layers.forEach((bricks, layer) =>
      bricks.forEach((brick, slot) => {
        if (!this.build.isFilled(layer, slot)) todo.push({ layer, slot, brick });
      }),
    );
    // Everything shows built first, the way the sculpture looked.
    const flying = todo.map(({ brick }, i) => {
      const mesh = this.brickMesh(brick.size, brick.rotation, this.plastic(brick.color));
      const from = this.homeOf(brick);
      mesh.position.copy(from);
      this.pileGroup.add(mesh);
      const entry = { key: `${brick.size}:${brick.color}`, mesh };
      this.pile.push(entry);
      return { mesh, from, ...this.pileSpot(i, todo.length) };
    });
    this.targetY = this.puzzle.dims.y / 2;
    this.invalidate();
    const land = () => {
      for (const f of flying) {
        f.mesh.position.copy(f.at);
        f.mesh.rotation.set(0, f.turn, 0);
      }
      this.showGhost(true);
      this.rise();
    };
    if (reducedMotion()) {
      land();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // A beat to see it whole, then the top flies first, like it's bursting open.
      const top = this.puzzle.dims.y;
      let left = flying.length;
      if (!left) {
        land();
        return resolve();
      }
      flying.forEach((f, i) => {
        const rand = random(i * 31 + 5);
        const delay = 550 + (top - f.from.y) * 55 + rand() * 160;
        const height = 2.5 + rand() * 3 + f.from.y * 0.3;
        const spin = (rand() - 0.5) * 9;
        const ms = 750 + rand() * 300;
        window.setTimeout(() => {
          this.tween(
            ms,
            (t) => {
              const e = easeInOut(t);
              f.mesh.position.lerpVectors(f.from, f.at, e);
              // An arc up and over, with a small hop where it lands.
              f.mesh.position.y += Math.sin(Math.min(1, t / 0.88) * Math.PI) * height;
              if (t > 0.88) f.mesh.position.y += Math.sin(((t - 0.88) / 0.12) * Math.PI) * 0.25;
              f.mesh.rotation.set(
                spin * (1 - e) * 0.4,
                f.turn * e + spin * (1 - e),
                spin * 0.3 * (1 - e),
              );
            },
            () => {
              f.mesh.position.copy(f.at);
              f.mesh.rotation.set(0, f.turn, 0);
              if (--left === 0) {
                this.showGhost(true);
                this.rise();
                window.setTimeout(resolve, 300);
              }
            },
          );
        }, delay);
      });
    });
  }

  /** One brick of this kind leaves the pile (it's the one you just placed). */
  private takeFromPile(key: string): void {
    const i = this.pile.findIndex((p) => p.key === key);
    if (i < 0) return;
    const [{ mesh }] = this.pile.splice(i, 1);
    if (reducedMotion()) {
      this.pileGroup.remove(mesh);
      return;
    }
    this.tween(
      200,
      (t) => mesh.scale.setScalar(1 - t),
      () => this.pileGroup.remove(mesh),
    );
  }

  // --- The end -------------------------------------------------------------------------

  /** The finished toy turns on its plate, with a burst of little bricks. */
  celebrate(how: CelebrateOptions = {}): void {
    this.ghosts.clear();
    this.ghostMeshes.clear();
    this.hold(null);
    const from = this.targetY;
    // Aim below it, so the toy sits in the top of the stage, above the end's pictures.
    const to = how.middle ? this.puzzle.dims.y / 2 : 0;
    const zoomTo = how.middle ? 1 : 0.8;
    if (reducedMotion()) {
      this.targetY = to;
      this.invalidate();
      return;
    }
    const zoomFrom = this.zoom;
    const pitchFrom = this.pitch;
    this.tween(900, (t) => {
      const e = easeInOut(t);
      this.targetY = from + (to - from) * e;
      this.zoom = zoomFrom + (zoomTo - zoomFrom) * e;
      this.pitch = pitchFrom + (0.38 - pitchFrom) * e;
    });
    this.spinning = true;
    this.confetti();
    if (how.hops) this.hop(how.hops);
    this.invalidate();
  }

  /** The toy hops on its plate, `n` times, a little lower each time. */
  private hop(n: number): void {
    const ms = 380;
    this.tween(n * ms, (t) => {
      const k = t * n;
      const i = Math.min(n - 1, Math.floor(k));
      const up = Math.sin((k - i) * Math.PI) * 0.9 * (1 - i / n);
      this.built.position.y = Math.max(0, up);
      // A squash as it lands and a stretch in the air.
      const s = 1 + up * 0.06;
      this.built.scale.set(2 - s, s, 2 - s);
    });
  }

  private confetti(): void {
    const rand = random(99);
    const top = this.puzzle.dims.y;
    for (let i = 0; i < 36; i++) {
      const color = 1 + Math.floor(rand() * this.palette.length);
      const bit = this.brickMesh('1x1', 0, this.plastic(color));
      bit.scale.setScalar(0.45);
      const from = new Vector3(0, top * 0.6, 0);
      const out = new Vector3(rand() - 0.5, 0, rand() - 0.5)
        .normalize()
        .multiplyScalar(3 + rand() * 4);
      const up = 6 + rand() * 5;
      const spin = new Vector3(rand() * 8, rand() * 8, rand() * 8);
      this.scene.add(bit);
      this.tween(
        1300 + rand() * 500,
        (t) => {
          bit.position.set(from.x + out.x * t, from.y + up * t - 11 * t * t, from.z + out.z * t);
          bit.rotation.set(spin.x * t, spin.y * t, spin.z * t);
        },
        () => this.scene.remove(bit),
      );
    }
  }

  /** A picture of the toy as it is now, cropped to it, at most `max` px (for the end). */
  snapshot(max = 240): string {
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
    // The model's box on screen, so the picture is the toy and not the empty stage.
    const d = this.puzzle.dims;
    let [x0, y0, x1, y1] = [1, 1, -1, -1];
    for (const cx of [-d.x / 2 - 1, d.x / 2 + 1]) {
      for (const cy of [-PLATE, d.y + 0.3]) {
        for (const cz of [-d.z / 2 - 1, d.z / 2 + 1]) {
          const v = new Vector3(cx, cy, cz)
            .applyMatrix4(this.turntable.matrixWorld)
            .project(this.camera);
          [x0, y0, x1, y1] = [
            Math.min(x0, v.x),
            Math.min(y0, v.y),
            Math.max(x1, v.x),
            Math.max(y1, v.y),
          ];
        }
      }
    }
    const { width, height } = this.canvas;
    const left = Math.max(0, ((x0 + 1) / 2) * width);
    const top = Math.max(0, ((1 - y1) / 2) * height);
    const w = Math.min(width - left, ((x1 - x0) / 2) * width);
    const h = Math.min(height - top, ((y1 - y0) / 2) * height);
    const out = document.createElement('canvas');
    const scale = Math.min(1, max / Math.max(w, h));
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    out.getContext('2d')!.drawImage(this.canvas, left, top, w, h, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  // --- Camera and drawing -------------------------------------------------------------

  orbit(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(0.05, Math.min(1.35, this.pitch + dPitch));
    this.invalidate();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.6, Math.min(2.5, zoom));
    this.invalidate();
  }

  private placeCamera(): void {
    const d = this.puzzle.dims;
    const radius = 0.5 * Math.hypot(d.x + 3, d.y, d.z + 3);
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const dist = ((radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05) / this.zoom;
    const target = new Vector3(0, this.targetY, 0);
    this.camera.position.set(
      dist * Math.cos(this.pitch) * Math.sin(this.yaw + this.sway),
      this.targetY + dist * Math.sin(this.pitch),
      dist * Math.cos(this.pitch) * Math.cos(this.yaw + this.sway),
    );
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.turntable.updateMatrixWorld();
  }

  private tween(ms: number, step: (t: number) => void, done?: () => void): void {
    this.tweens.push({ start: performance.now(), ms, step, done });
    this.invalidate();
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  invalidate(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0;
      const running = this.tweens;
      this.tweens = [];
      for (const tw of running) {
        const t = Math.min(1, Math.max(0, (now - tw.start) / tw.ms));
        tw.step(t);
        if (t < 1) this.tweens.push(tw);
        else tw.done?.();
      }
      const dt = this.lastFrame ? Math.min(64, now - this.lastFrame) : 16;
      if (this.spinning) this.turntable.rotation.y += dt * 0.0007;
      const drifting = !!this.options.drift && !reducedMotion();
      const bobbing = this.bobbing();
      if (drifting || bobbing) this.clock += dt;
      // A slow sway either side, about 12 seconds there and back.
      if (drifting) this.sway = Math.sin(this.clock * 0.00052) * 0.26;
      if (bobbing) this.setGhostLevel(this.ghostLevel);
      this.lastFrame = now;
      this.placeCamera();
      this.renderer.render(this.scene, this.camera);
      if (this.tweens.length || this.spinning || drifting || bobbing) this.invalidate();
      else this.lastFrame = 0;
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.spinning = false;
    this.resizeObserver.disconnect();
    for (const m of this.materials.values()) m.dispose();
    for (const g of this.geometries.values()) g.dispose();
    this.studGeometry.dispose();
    this.capGeometry.dispose();
    this.renderer.dispose();
  }
}

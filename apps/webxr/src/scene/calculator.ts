import * as THREE from "three";
import { Calculator, type Key } from "@vrcalc/calculator-core";

/** Distribución de teclas, de arriba abajo. */
const LAYOUT: Key[][] = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["C", "0", "=", "+"],
];

const BODY = { width: 1.5, height: 2.1, depth: 0.25 };
const KEY_SIZE = 0.28;
const KEY_GAP = 0.06;
const KEY_DEPTH = 0.08;
/** Hundimiento de la tecla al pulsarla, en metros. */
const PRESS_TRAVEL = 0.05;

/** Calculadora 3D del tamaño de una persona, enlazada a la lógica de calculator-core. */
export class CalculatorView {
  readonly group = new THREE.Group();
  readonly keyMeshes: THREE.Mesh[] = [];
  private readonly logic = new Calculator();
  private readonly displayCanvas = document.createElement("canvas");
  private readonly displayTexture: THREE.CanvasTexture;
  /** Tiempo restante de animación de pulsado por tecla. */
  private readonly pressTimers = new Map<THREE.Mesh, number>();
  private hovered: THREE.Mesh | null = null;

  /** Crea la carcasa, la pantalla y las teclas. */
  constructor() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(BODY.width, BODY.height, BODY.depth),
      new THREE.MeshStandardMaterial({ color: 0x1d2333, metalness: 0.6, roughness: 0.35 }),
    );
    body.position.y = BODY.height / 2;
    this.group.add(body);

    this.displayCanvas.width = 1024;
    this.displayCanvas.height = 256;
    this.displayTexture = new THREE.CanvasTexture(this.displayCanvas);
    this.displayTexture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.325),
      new THREE.MeshBasicMaterial({ map: this.displayTexture }),
    );
    display.position.set(0, 1.78, BODY.depth / 2 + 0.002);
    this.group.add(display);

    this.buildKeys();
    this.renderDisplay();
  }

  /** Coloca la cuadrícula de 4x4 teclas en la cara frontal. */
  private buildKeys(): void {
    const step = KEY_SIZE + KEY_GAP;
    const topY = 1.42;
    LAYOUT.forEach((row, r) => {
      row.forEach((key, c) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(KEY_SIZE, KEY_SIZE, KEY_DEPTH), createKeyMaterials(key));
        mesh.position.set((c - 1.5) * step, topY - r * step, BODY.depth / 2 + KEY_DEPTH / 2);
        mesh.userData.key = key;
        mesh.userData.restZ = mesh.position.z;
        this.group.add(mesh);
        this.keyMeshes.push(mesh);
      });
    });
  }

  /** Pulsa una tecla: actualiza la lógica, la pantalla y lanza la animación. */
  press(mesh: THREE.Mesh): void {
    this.logic.press(mesh.userData.key as Key);
    this.renderDisplay();
    this.pressTimers.set(mesh, 0.15);
  }

  /** Pulsa una tecla por su símbolo (usado por el teclado de escritorio). */
  pressKey(key: Key): void {
    const mesh = this.keyMeshes.find((m) => m.userData.key === key);
    if (mesh) this.press(mesh);
  }

  /** Marca la tecla apuntada por un rayo (o ninguna) con un brillo suave. */
  setHovered(mesh: THREE.Mesh | null): void {
    if (this.hovered === mesh) return;
    if (this.hovered) setFrontEmissive(this.hovered, 0x000000);
    this.hovered = mesh;
    if (mesh) setFrontEmissive(mesh, 0x223355);
  }

  /** Avanza las animaciones de pulsado. */
  update(dt: number): void {
    for (const [mesh, time] of this.pressTimers) {
      const remaining = time - dt;
      const restZ = mesh.userData.restZ as number;
      if (remaining <= 0) {
        mesh.position.z = restZ;
        this.pressTimers.delete(mesh);
        if (mesh !== this.hovered) setFrontEmissive(mesh, 0x000000);
        else setFrontEmissive(mesh, 0x223355);
      } else {
        mesh.position.z = restZ - PRESS_TRAVEL;
        setFrontEmissive(mesh, 0x3366ff);
        this.pressTimers.set(mesh, remaining);
      }
    }
  }

  /** Dibuja el número actual (y el operador pendiente) en la textura de la pantalla. */
  private renderDisplay(): void {
    const ctx = this.displayCanvas.getContext("2d")!;
    const { width, height } = this.displayCanvas;
    const isError = this.logic.hasError;
    ctx.fillStyle = isError ? "#3a0d0d" : "#0d2a1f";
    ctx.fillRect(0, 0, width, height);

    ctx.font = "bold 180px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isError ? "#ff5a5a" : "#7dffb3";
    ctx.fillText(this.logic.display, width - 40, height / 2 + 10);

    const op = this.logic.pendingOperator;
    if (op) {
      ctx.font = "bold 90px monospace";
      ctx.textAlign = "left";
      ctx.fillText(symbolFor(op), 30, 70);
    }
    this.displayTexture.needsUpdate = true;
  }
}

/** Símbolo legible para cada tecla (× y ÷ en vez de * y /). */
function symbolFor(key: Key): string {
  return key === "*" ? "×" : key === "/" ? "÷" : key;
}

/** Materiales de una tecla: etiqueta en la cara frontal (+z) y color liso en el resto. */
function createKeyMaterials(key: Key): THREE.Material[] {
  const isOperator = "+-*/=".includes(key);
  const base = key === "C" ? "#b8333a" : isOperator ? "#e0882a" : "#3a4256";

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 80px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbolFor(key), 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const side = new THREE.MeshStandardMaterial({ color: base, roughness: 0.5 });
  const front = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 });
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z.
  return [side, side, side, side, front, side];
}

/** Cambia el brillo emisivo de la cara frontal de una tecla. */
function setFrontEmissive(mesh: THREE.Mesh, color: number): void {
  const front = (mesh.material as THREE.MeshStandardMaterial[])[4];
  front.emissive.setHex(color);
}

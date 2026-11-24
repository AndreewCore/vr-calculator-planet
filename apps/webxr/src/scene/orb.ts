import * as THREE from "three";

/** Colores asignados a cada botón de acción de los controles. */
export const ORB_COLORS = {
  A: 0xff3b3b,
  B: 0x3bff6a,
  X: 0x3b8bff,
  Y: 0xffd93b,
} as const;
export type OrbButton = keyof typeof ORB_COLORS;

/** Esfera flotante que cambia de color con los botones A/B/X/Y. */
export class Orb {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly light: THREE.PointLight;
  private readonly target = new THREE.Color(0xffffff);
  private readonly baseY: number;
  private elapsed = 0;

  /** Crea la esfera a la altura indicada (encima de la calculadora). */
  constructor(y: number) {
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 48, 24), this.material);
    this.light = new THREE.PointLight(0xffffff, 3, 6);
    this.mesh.add(this.light);
    this.baseY = y;
    this.mesh.position.y = y;
  }

  /** Cambia el color objetivo según el botón pulsado; la transición es animada en update(). */
  trigger(button: OrbButton): void {
    this.target.setHex(ORB_COLORS[button]);
  }

  /** Interpola el color hacia el objetivo y hace flotar la esfera. */
  update(dt: number): void {
    this.elapsed += dt;
    // Interpolación independiente del framerate (el Quest puede ir a 72, 90 o 120 Hz).
    const t = 1 - Math.exp(-dt * 10);
    this.material.color.lerp(this.target, t);
    this.material.emissive.lerp(this.target, t);
    this.light.color.lerp(this.target, t);
    this.mesh.position.y = this.baseY + Math.sin(this.elapsed * 1.5) * 0.05;
  }
}

import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import type { CalculatorView } from "../scene/calculator";
import type { Orb, OrbButton } from "../scene/orb";

const RAY_LENGTH = 5;

/**
 * Índices de los botones de acción en el layout "xr-standard" de WebXR:
 * 4 = A (derecho) / X (izquierdo), 5 = B (derecho) / Y (izquierdo).
 */
const ACTION_BUTTONS: Record<XRHandedness, [OrbButton, OrbButton] | null> = {
  right: ["A", "B"],
  left: ["X", "Y"],
  none: null,
};

interface ControllerState {
  controller: THREE.XRTargetRaySpace;
  ray: THREE.Line;
  source: XRInputSource | null;
  /** Estado previo de los botones 4 y 5, para disparar solo en el flanco de bajada. */
  prev: [boolean, boolean];
}

/** Gestiona ambos controles: rayo láser para pulsar teclas y botones A/B/X/Y para la esfera. */
export class ControllerInput {
  private readonly states: ControllerState[] = [];
  private readonly raycaster = new THREE.Raycaster();

  /** Crea los dos controles con su modelo 3D y su rayo, y los añade a la escena. */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    private readonly calculator: CalculatorView,
    private readonly orb: Orb,
  ) {
    const modelFactory = new XRControllerModelFactory();
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const ray = createRay();
      controller.add(ray);
      scene.add(controller);

      const grip = renderer.xr.getControllerGrip(i);
      grip.add(modelFactory.createControllerModel(grip));
      scene.add(grip);

      const state: ControllerState = { controller, ray, source: null, prev: [false, false] };
      controller.addEventListener("connected", (e) => (state.source = e.data));
      controller.addEventListener("disconnected", () => (state.source = null));
      // El gatillo dispara "select"; se usa selectstart para que la tecla responda al instante.
      controller.addEventListener("selectstart", () => {
        const hit = this.intersectKey(controller);
        if (hit) this.calculator.press(hit);
      });
      this.states.push(state);
    }
  }

  /** Actualiza rayos/hover y lee los botones de acción cada frame. */
  update(): void {
    let hovered: THREE.Mesh | null = null;
    for (const state of this.states) {
      const hit = this.intersectKey(state.controller, true);
      if (hit) hovered = hit.mesh;
      state.ray.scale.z = hit ? hit.distance : RAY_LENGTH;
      this.pollActionButtons(state);
    }
    this.calculator.setHovered(hovered);
  }

  /** Detecta pulsaciones nuevas de los botones de acción y cambia el color de la esfera. */
  private pollActionButtons(state: ControllerState): void {
    const gamepad = state.source?.gamepad;
    const mapping = state.source ? ACTION_BUTTONS[state.source.handedness] : null;
    if (!gamepad || !mapping) return;
    for (let i = 0; i < 2; i++) {
      const pressed = gamepad.buttons[4 + i]?.pressed ?? false;
      if (pressed && !state.prev[i]) this.orb.trigger(mapping[i]);
      state.prev[i] = pressed;
    }
  }

  /** Lanza un rayo desde el control y devuelve la tecla impactada (con distancia si se pide). */
  private intersectKey(controller: THREE.XRTargetRaySpace): THREE.Mesh | null;
  private intersectKey(controller: THREE.XRTargetRaySpace, withDistance: true): { mesh: THREE.Mesh; distance: number } | null;
  private intersectKey(controller: THREE.XRTargetRaySpace, withDistance = false) {
    this.raycaster.setFromXRController(controller);
    this.raycaster.far = RAY_LENGTH;
    const [hit] = this.raycaster.intersectObjects(this.calculator.keyMeshes, false);
    if (!hit) return null;
    const mesh = hit.object as THREE.Mesh;
    return withDistance ? { mesh, distance: hit.distance } : mesh;
  }
}

/** Línea de 1 m apuntando hacia -z; se escala en z para ajustarla a la distancia del impacto. */
function createRay(): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x9fd4ff }));
  line.scale.z = RAY_LENGTH;
  return line;
}

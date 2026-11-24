import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Key } from "@vrcalc/calculator-core";
import { createPlanetScene } from "./scene/planet";
import { CalculatorView } from "./scene/calculator";
import { Orb, type OrbButton } from "./scene/orb";
import { ControllerInput } from "./input/controllers";

/** Distancia entre el jugador y la calculadora, en metros. */
const CALCULATOR_DISTANCE = 1.8;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
// local-floor coloca y = 0 en el suelo real, así la calculadora queda apoyada en el terreno.
renderer.xr.setReferenceSpaceType("local-floor");
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 1000);
camera.position.set(0, 1.6, 0.6);

createPlanetScene(scene);

const calculator = new CalculatorView();
calculator.group.position.set(0, 0, -CALCULATOR_DISTANCE);
scene.add(calculator.group);

const orb = new Orb(2.5);
calculator.group.add(orb.mesh);

const controllers = new ControllerInput(renderer, scene, calculator, orb);
setupDesktopFallback();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  controllers.update();
  calculator.update(dt);
  orb.update(dt);
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * Permite probar sin visor: órbita con el ratón, clic en las teclas,
 * teclado para la calculadora y las letras A/B/X/Y para simular los botones de los controles.
 */
function setupDesktopFallback(): void {
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1.4, -CALCULATOR_DISTANCE);
  orbit.update();
  // En VR la cámara la controla el visor; OrbitControls la pelearía.
  renderer.xr.addEventListener("sessionstart", () => (orbit.enabled = false));
  renderer.xr.addEventListener("sessionend", () => (orbit.enabled = true));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = { x: 0, y: 0 };
  renderer.domElement.addEventListener("pointerdown", (e) => (downAt = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener("pointerup", (e) => {
    // Ignorar si el usuario arrastró para orbitar en vez de hacer clic.
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(calculator.keyMeshes, false);
    if (hit) calculator.press(hit.object as THREE.Mesh);
  });

  const orbKeys: Record<string, OrbButton> = { a: "A", b: "B", x: "X", y: "Y" };
  window.addEventListener("keydown", (e) => {
    const letter = e.key.toLowerCase();
    if (letter in orbKeys) return orb.trigger(orbKeys[letter]);
    const key = e.key === "Enter" ? "=" : e.key === "Escape" || letter === "c" ? "C" : e.key;
    if (/^[0-9+\-*/=C]$/.test(key)) calculator.pressKey(key as Key);
  });
}

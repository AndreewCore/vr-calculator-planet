import * as THREE from "three";

/** Radio del planeta sobre el que está el jugador; grande para que el horizonte se curve suavemente. */
const GROUND_RADIUS = 80;

/** Construye el escenario planetario completo: suelo, cielo estrellado, planeta gigante, luna y luces. */
export function createPlanetScene(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x05040f);
  scene.add(createGround());
  scene.add(createRocks());
  scene.add(createStarfield());
  scene.add(createGasGiant());
  scene.add(createMoon());
  addLights(scene);
}

/** Suelo rocoso: una esfera con relieve aleatorio cuya cima queda en y = 0. */
function createGround(): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(GROUND_RADIUS, 32);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Mantener plana la zona donde está el jugador para que no atraviese el suelo.
    const distFromTop = v.clone().normalize().distanceTo(new THREE.Vector3(0, 1, 0));
    // Ruido determinista por posición: IcosahedronGeometry no es indexada, y un valor aleatorio
    // distinto en cada copia del mismo vértice abriría grietas entre caras.
    const noise = Math.sin(v.x * 0.7) * Math.cos(v.z * 0.5) + Math.sin(v.x * 2.3 + v.z * 1.7) * 0.3;
    const bump = distFromTop < 0.08 ? 0 : noise * 0.6;
    v.setLength(GROUND_RADIUS + bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.95, flatShading: true });
  const ground = new THREE.Mesh(geometry, material);
  ground.position.y = -GROUND_RADIUS;
  return ground;
}

/** Rocas dispersas alrededor del jugador para dar escala y profundidad. */
function createRocks(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x5e3428, roughness: 1, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Dejar libre un radio de 4 m para no bloquear la calculadora.
    const dist = 4 + Math.random() * 25;
    const size = 0.2 + Math.random() * 1.2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), material);
    rock.position.set(Math.cos(angle) * dist, size * 0.3 - dist * dist / (2 * GROUND_RADIUS), Math.sin(angle) * dist);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    group.add(rock);
  }
  return group;
}

/** Cúpula de estrellas como nube de puntos lejana. */
function createStarfield(): THREE.Points {
  const count = 4000;
  const positions = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(450 + Math.random() * 50);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true });
  return new THREE.Points(geometry, material);
}

/** Planeta gaseoso con bandas y anillos que domina el cielo. */
function createGasGiant(): THREE.Group {
  const group = new THREE.Group();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(60, 64, 32),
    new THREE.MeshStandardMaterial({ map: createBandTexture(), roughness: 0.8 }),
  );
  group.add(planet);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(80, 120, 128),
    new THREE.MeshBasicMaterial({ color: 0xd9c7a3, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  );
  ring.rotation.x = Math.PI / 2.3;
  group.add(ring);

  group.position.set(-140, 90, -320);
  group.rotation.z = 0.3;
  return group;
}

/** Textura procedural de bandas horizontales para el planeta gaseoso. */
function createBandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const palette = ["#e8b27a", "#c97b4a", "#f3d6a8", "#a55a3c", "#ddb48c", "#8f4e36"];
  for (let y = 0; y < canvas.height; y += 8) {
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.fillRect(0, y, canvas.width, 8 + Math.random() * 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Luna pequeña y fría en el lado opuesto del cielo. */
function createMoon(): THREE.Mesh {
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xb8c4d6, roughness: 1, flatShading: true }),
  );
  moon.position.set(160, 120, -200);
  return moon;
}

/** Luz ambiental tenue más un "sol" direccional. */
function addLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0x8899ff, 0x331a10, 0.6));
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2);
  sun.position.set(50, 80, 30);
  scene.add(sun);
}

# vr-calculator-planet

Calculadora VR gigante (≈2 m) en la superficie de un planeta alienígena, hecha con WebXR + Three.js.
Monorepo pnpm. La versión Unity vive en el repo privado `vr-calculator-planet-unity`.

## Estructura
| Ruta | Contenido |
| --- | --- |
| `packages/calculator-core` | Lógica de la calculadora (TS puro) + tests vitest |
| `apps/webxr` | App WebXR (Vite + Three.js) |

## Uso
```bash
pnpm install
pnpm test          # tests de la lógica
pnpm dev           # https://<IP-LAN>:5173 → abrir en el navegador del Quest → ENTER VR
pnpm build         # build de producción en apps/webxr/dist
```

## Controles
| Entrada | Acción |
| --- | --- |
| Gatillo + rayo | Pulsar tecla |
| A (derecho) | Esfera roja |
| B (derecho) | Esfera verde |
| X (izquierdo) | Esfera azul |
| Y (izquierdo) | Esfera amarilla |

En escritorio: arrastrar para orbitar, clic o teclado para la calculadora, letras A/B/X/Y para la esfera.

## Reglas de la calculadora
- Operaciones `+ - × ÷`, evaluación secuencial (`2 + 3 × 4 = 20`).
- Máximo 6 dígitos: teclear el séptimo → `ERROR`; resultado con más de 6 dígitos enteros → `ERROR`.
- División entre 0 → `ERROR`. Los decimales se recortan a 6 dígitos totales (`10 ÷ 3 = 3.33333`).
- `C` limpia (también tras `ERROR`).

## Ramas
`feature|fix|hotfix|style|docu/*` → PR (squash) → `dev` → PR → `staging` → PR → `main` (tag de release).

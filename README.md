# Enrutador de Contenido

[![CI](https://github.com/manuelarguelles/enrutador-contenido/actions/workflows/ci.yml/badge.svg)](https://github.com/manuelarguelles/enrutador-contenido/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Convierte contenido guardado en un índice consultable mediante búsqueda
híbrida: **BM25 + multilingual E5 + Reciprocal Rank Fusion (RRF)**. También
puede proponer la categoría principal mediante **Jev** y aplicar una política
auditable: confirmar automáticamente o pedir revisión humana.

El núcleo es una CLI portable de Node.js. OpenClaw y Claude Code son
integraciones opcionales que invocan exactamente el mismo motor; ninguna
contiene una segunda copia de la lógica.

## Inicio rápido — sin credenciales

Requisitos: Node.js 22 o superior.

```bash
git clone https://github.com/manuelarguelles/enrutador-contenido.git
cd enrutador-contenido
npm ci
npm run verify
```

La demo usa seis registros sintéticos y embeddings determinísticos para poder
ejecutarse offline y producir resultados repetibles:

```bash
npm run demo
```

## Búsqueda híbrida real

La primera ejecución descarga la revisión fijada de
`Xenova/multilingual-e5-small`; no requiere API key.

```bash
node src/cli.mjs index \
  --records=examples/records \
  --index=.data/e5-index.json \
  --semantic=e5

node src/cli.mjs search \
  --index=.data/e5-index.json \
  --query="arquitectura de cache distribuida" \
  --top-k=3
```

`mock` es exclusivamente un modo de prueba. Para recuperación semántica real,
usa `e5`.

## Motor de decisiones con Jev

Jev es opcional: la indexación, la búsqueda y toda la verificación local siguen
funcionando sin credenciales. Para clasificar contenido:

```bash
export JEV_API_KEY="..."

node src/cli.mjs classify \
  --title="Búsqueda híbrida para RAG" \
  --summary="Combina BM25, embeddings y RRF para recuperar contexto."
```

La salida incluye:

- categoría y confianza elegidas por Jev;
- dos alternativas ordenadas por probabilidad;
- `decision: "auto"` cuando supera el umbral configurado;
- `decision: "ask"` cuando hay duda, falta contenido, la categoría es
  `uncategorized` o el umbral aún no está calibrado;
- razón, modelo, proveedor y consumo reportado para auditoría.

La política vive en [`config/decision-engine.json`](config/decision-engine.json).
El valor `0.90` es un punto de partida conservador: debe recalibrarse con
registros confirmados por una persona antes de habilitar decisiones autónomas
en otro corpus. Si una decisión automática es corregida, vuelve el sistema a
modo de confirmación humana hasta recalibrar.

Registra esa degradación de forma explícita:

```bash
node src/cli.mjs demote \
  --reason="La categoría automática fue corregida por una persona"
```

El comando cambia `threshold` a `null`; desde ese momento toda clasificación
devuelve `decision: "ask"` hasta que el responsable recalibre el corpus y
restaure deliberadamente un umbral numérico.

Solo se envían a Jev el **título y el resumen**. No se envían `analysis`,
credenciales, memoria, sesiones ni archivos originales.

## Un núcleo, dos integraciones

```text
enrutador-contenido/
├── src/                       # motor y CLI compartidos
├── config/                    # taxonomía y routing versionables
├── schemas/                   # contrato de los registros
├── examples/records/          # datos 100 % sintéticos
├── integrations/
│   ├── openclaw/              # skill/adaptador para un workspace existente
│   └── claude-code/           # skill e instrucciones project-scoped
├── scripts/                   # instaladores conservadores y security check
└── tests/                     # unidad, integración y adaptadores
```

### OpenClaw

La integración da por sentado que OpenClaw y el workspace ya están instalados
y configurados. **No incluye ni modifica** identidad, personalidad, perfil del
usuario, memorias, sesiones, canales, proveedores, credenciales o instrucciones
globales. Solo instala la skill `content-router`.

```bash
./scripts/install-openclaw.sh --dry-run /path/to/openclaw-workspace
./scripts/install-openclaw.sh /path/to/openclaw-workspace
```

### Claude Code

La integración es local al proyecto destino. No copia `~/.claude`, historial,
plugins, credenciales ni preferencias personales.

```bash
./scripts/install-claude-code.sh --dry-run /path/to/target-project
./scripts/install-claude-code.sh /path/to/target-project
```

Ambos instaladores rechazan sobrescribir una integración existente.

## Formato de un registro

```json
{
  "id": "CAC_001",
  "title": "Patrones de caché distribuida",
  "summary": "Comparación sintética de invalidación y consistencia.",
  "source": {
    "url": "https://example.com/cache-patterns",
    "platform": "demo"
  },
  "classification": {
    "categories": ["system_design"],
    "facets": ["architecture"],
    "tags": ["cache"]
  },
  "routing": {
    "provider": "jev",
    "model": "jev-latest",
    "suggested_category": "system_design",
    "confidence": 0.93,
    "decision": "auto",
    "alternatives": [],
    "reason": "confidence 0.93 meets threshold 0.9"
  }
}
```

Consulta el contrato completo en
[`schemas/content-record.schema.json`](schemas/content-record.schema.json).

## Cómo verificamos que no esté roto ni filtre información

`npm run verify` ejecuta cuatro puertas locales:

1. validación de todos los registros;
2. pruebas unitarias y end-to-end;
3. demo completa sin claves ni servicios privados;
4. escaneo de archivos personales, rutas locales y credenciales evidentes.

GitHub Actions repite la verificación en macOS y Ubuntu con Node 22 y 24,
ejecuta `npm audit`, escanea el historial con Gitleaks y prueba E5 real en cada
push a `main` (también puede lanzarse manualmente). Antes del primer release se
valida además un clon limpio desde cero.

Lee [la arquitectura](docs/architecture.md), la [política de
seguridad](SECURITY.md) y los [workflows](.github/workflows/).

## Límites actuales

- La ingesta desde redes sociales no forma parte del repositorio público.
- El índice es un JSON local: suficiente para la demo, no para alta concurrencia.
- No se versionan modelos, índices generados ni contenido privado.
- La precisión del juez depende de la taxonomía y del corpus; el starter no
  sustituye una calibración con verdad humana.

## Licencia

[MIT](LICENSE) © Manuel Argüelles.

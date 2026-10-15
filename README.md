# Enrutador de Contenido

[![CI](https://github.com/manuelarguelles/enrutador-contenido/actions/workflows/ci.yml/badge.svg)](https://github.com/manuelarguelles/enrutador-contenido/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Convierte contenido guardado en un índice consultable mediante búsqueda
híbrida: **BM25 + multilingual E5 + Reciprocal Rank Fusion (RRF)**.

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
    "categories": ["data_engineering"],
    "facets": ["architecture"],
    "tags": ["cache"]
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
ejecuta `npm audit` y escanea el historial con Gitleaks. También existe un
workflow manual para probar E5 real. Antes del primer release se valida además
un clon limpio desde cero.

Lee [la arquitectura](docs/architecture.md), la [política de
seguridad](SECURITY.md) y los [workflows](.github/workflows/).

## Límites actuales

- La ingesta desde redes sociales no forma parte del repositorio público.
- El índice es un JSON local: suficiente para la demo, no para alta concurrencia.
- No se versionan modelos, índices generados ni contenido privado.

## Licencia

[MIT](LICENSE) © Manuel Argüelles.

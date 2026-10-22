# Enrutador de Contenido

## Vision

Publicar un núcleo portable para capturar, clasificar e indexar contenido, con
adaptadores opcionales para OpenClaw y Claude Code.

## Stack

Node.js ESM, BM25, Xenova multilingual E5 Small, Reciprocal Rank Fusion y Jev
opcional como juez de categoría detrás de una política determinista `auto|ask`.

## Constraints

- El repositorio público contiene únicamente datos sintéticos.
- No depende de identidad, memoria, sesiones ni credenciales del autor.
- La demo debe funcionar sin claves ni servicios externos.
- Jev recibe solo título y resumen; la decisión autónoma requiere un umbral
  calibrado y cualquier corrección humana la desactiva hasta recalibrar.

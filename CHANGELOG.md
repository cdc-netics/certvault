# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Fixed

- **[READER dept-filter bug]** — `certificationsController.ts:236`
  Los usuarios con rol `READER` (Solo Lectura) no veían ninguna certificación al pertenecer
  a un departamento recién creado al vuelo. El filtro de `getCertifications` aplicaba
  restricción por departamento tanto a `READER` como a `TECNICO`, haciendo que un READER
  asignado a un departamento nuevo (sin certs) recibiera siempre lista vacía.
  Se corrigió excluyendo al rol `READER` del bloque de dept-scoping — ahora el READER
  consulta certs de todos los usuarios activos, sin restricción de departamento.
  Ref: `Docs/issue.md` → ISS-READER-DEPT-001

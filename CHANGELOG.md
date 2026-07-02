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

- **[TECNICO visible-users filter bug]** — `certificationsController.ts:240`
  Los usuarios con rol `TECNICO` no veían certificaciones aunque existieran en su
  departamento. El `userFilter` de `visibleUsers` incluía `department: userDeptId`,
  haciendo que la Condición B (`employeeId IN visibleUserIds`) fallara en departamentos
  nuevos o con pocos usuarios activos — resultado: lista vacía pese a existir certs.
  Se eliminó `userFilter.department` del bloque TECNICO: la restricción por dept queda
  exclusivamente en la Condición A (filtro directo sobre certs), que es suficiente.
  Ref: `Docs/issue.md` → ISS-TECNICO-VISIBLEUSERS-002

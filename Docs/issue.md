# Issues

---

## ISS-READER-DEPT-001 — READER sin visibilidad de certificaciones en departamento nuevo

| Campo        | Valor                                        |
|--------------|----------------------------------------------|
| **Estado**   | ✅ Corregido                                  |
| **Severidad**| Alta                                         |
| **Rol afect**| `READER` (Solo Lectura)                      |
| **Fecha**    | 2026-07-02                                   |
| **Archivo**  | `backend/src/controllers/certificationsController.ts` |
| **Línea**    | 236                                          |

### Descripción

Al crear un usuario desde la web con rol `READER`, asignándole un departamento y cargo
nuevos (creados al vuelo mediante `resolveDepartment` / `resolvePosition`), el usuario
iniciaba sesión pero no veía ninguna certificación en el listado.

### Causa raíz

El endpoint `getCertifications` aplicaba un filtro de departamento a todos los roles que
no son `ADMIN` ni `LIDER` (incluido `READER`). Al tratarse de un departamento recién
creado, no tenía ninguna certificación asociada, por lo que ambas condiciones del doble
`$and` retornaban vacío:

- **Condición A**: `certification.department === newDeptId` → 0 certs en dept nuevo
- **Condición B**: `employeeId in [newUserId]` → usuario nuevo sin certs asignadas

El usuario veía lista vacía aunque existieran certs en otros departamentos.

Adicionalmente, existe una inconsistencia con el contrato declarado en `canAccessCertification`
(línea 15), que indica que cualquier usuario autenticado tiene acceso de lectura.

### Fix aplicado

```diff
- if (currentUser && currentUser.department) {
+ if (currentUser && currentUser.department && currentUser.role !== UserRole.READER) {
```

El rol `READER` queda excluido del bloque de dept-scoping. Su `userFilter` contiene
únicamente `{ isActive: true }`, por lo que `visibleUsers` resuelve a todos los usuarios
activos del sistema y el READER puede ver el catálogo completo de certificaciones.

### Impacto post-fix

| Rol     | Comportamiento                                        |
|---------|-------------------------------------------------------|
| ADMIN   | Sin cambios — acceso global                           |
| LIDER   | Sin cambios — acceso global                           |
| READER  | **Corregido** — ve certs de todos los usuarios activos |
| TECNICO | Sin cambios — restringido a su departamento           |

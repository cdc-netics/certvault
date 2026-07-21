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

---

## ISS-TECNICO-VISIBLEUSERS-002 — TECNICO sin visibilidad de certificaciones de su departamento

| Campo        | Valor                                        |
|--------------|----------------------------------------------|
| **Estado**   | ✅ Corregido                                  |
| **Severidad**| Alta                                         |
| **Rol afect**| `TECNICO`                                    |
| **Fecha**    | 2026-07-02                                   |
| **Archivo**  | `backend/src/controllers/certificationsController.ts` |
| **Línea**    | 240                                          |

### Descripción

Un usuario con rol `TECNICO` no veía ninguna certificación al iniciar sesión. Al cambiar
el mismo usuario a rol `READER` o `ADMIN` sí las veía, descartando un problema de datos.

### Causa raíz

El doble filtro `$and` en `getCertifications` genera dos condiciones independientes:

- **Condición A** (sobre certs): `cert.department === tecnicoDeptId` — correcta
- **Condición B** (sobre certs): `cert.employeeId IN visibleUserIds` — problemática

`visibleUsers` se construía con `userFilter = { isActive: true, department: tecnicoDeptId }`.
En cualquiera de estos escenarios, la Condición B devuelve vacío y bloquea todos los resultados:

| Escenario | Por qué falla |
|-----------|---------------|
| Dept nuevo (sin más usuarios) | `visibleUserIds = [soloEl]`, sin certs propias → B vacío |
| Empleado movido a otro dept | Ya no aparece en `visibleUsers` del dept original → cert invisible |
| Empleado marcado `isActive: false` | Excluido de `visibleUsers` → cert invisible |

La Condición A ya garantiza la restricción de departamento sobre las certs. La asignación
`userFilter.department` era redundante y causaba estos falsos negativos.

### Fix aplicado

```diff
  const userDeptId = currentUser.department._id || currentUser.department;

- // Se limita la búsqueda de colaboradores del backend al mismo departamento
- userFilter.department = userDeptId;

  // Se limpia cualquier condición de departamento...
```

`userFilter` queda como `{ isActive: true }` (sin filtro de dept). `visibleUsers` resuelve
a todos los usuarios activos del sistema. La Condición B ya no descarta certs válidas.
La restricción de departamento la sigue aplicando exclusivamente la Condición A.

### Impacto post-fix

| Rol     | Comportamiento                                              |
|---------|-------------------------------------------------------------|
| ADMIN   | Sin cambios — acceso global                                 |
| LIDER   | Sin cambios — acceso global                                 |
| READER  | Sin cambios — ve certs de todos los usuarios activos        |
| **TECNICO** | **Corregido** — ve todas las certs de su dept (sin importar estado del empleado) |

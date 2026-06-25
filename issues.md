# Control de Issues y Mejoras del Proyecto

Este documento registra los problemas, vulnerabilidades, mejoras y tareas técnicas del proyecto, clasificadas por su estado.

## Issues Pendientes (To Do)

| ID          | Título                                                             | Componente         | Prioridad | Estado |
| ----------- | ------------------------------------------------------------------ | ------------------ | --------- | ------ |
| **ISS-010** | Departamentos dinámicos y asignación masiva de áreas               | Backend / Frontend | Alta      | To Do  |
| **ISS-011** | Selección dinámica y creación al vuelo de cargos y departamentos   | Backend / Frontend | Media     | To Do  |
| **ISS-012** | Panel visual de gestión de departamentos y asignación de líderes   | Backend / Frontend | Media     | To Do  |
| **ISS-013** | Listado compacto y administración de certificaciones en el perfil  | Frontend           | Baja      | To Do  |

## Issues Completados (Done)

| ID          | Título                                               | Componente         | Fecha de Cierre | Resolución                                                                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------- | ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISS-000** | Terminación SSL e HTTPS en Producción                | Infraestructura    | 27/05/2026      | Se incorporó un proxy inverso Nginx (`reverse-proxy`) en el puerto seguro `443` utilizando certificados locales en `certs/`.                                                                                                                                                                                  |
| **ISS-001** | Pérdida de cabecera segura en ruteo (QA Fix)         | Frontend / Nginx   | 27/05/2026      | Se corrigió el Nginx del frontend usando un mapeo dinámico para propagar correctamente `X-Forwarded-Proto` (HTTPS) hacia Express.                                                                                                                                                                             |
| **ISS-002** | Exposición de MongoDB sin TLS                        | Base de Datos      | 31/05/2026      | Se removió el mapeo de puertos públicos (`ports`) en `docker-compose.yml` aislando a MongoDB a nivel interno (`expose`), lo que previene accesos externos no cifrados y soluciona conflictos de puerto en el host.                                                                                            |
| **ISS-003** | Falta de Logs de Auditoría en Proxy                  | Infraestructura    | 28/05/2026      | Se creó un volumen persistente para guardar los logs de Nginx y se enriqueció el formato de logging con detalles de red y TLS. Además, se extendió el logging de auditoría a nivel de aplicación para capturar visualizaciones, descargas y errores del sistema, con soporte de filtrado en la interfaz.      |
| **ISS-004** | Alerta de vencimiento de certificado por correo      | Backend / Frontend | 28/05/2026      | Se implementó el servicio de envío de correos ante el vencimiento de certificados a los 60, 30, 15 y 3 días de expirar. Se programó la evaluación automática en un servicio cron y se añadió un toggle global en el panel de seguridad del Front-end.                                                         |
| **ISS-005** | Autenticación integrada con Active Directory (AD)    | Backend / Frontend | 29/05/2026      | Se agregó autenticación mediante LDAP y Azure AD configurables desde la UI. Se implementó encriptación AES-256-CBC para contraseñas/secretos en la BD y auto-aprovisionamiento Just-in-Time (JIT) con asignación de rol `READER` y redirección forzada a términos y correo de respaldo en primer login.       |
| **ISS-006** | Normalización del Emisor/Plataforma (Provider)       | Backend / Frontend | 29/05/2026      | Se implementó script de normalización case-insensitive al arrancar el servidor backend (unificando históricos a la moda predominante). Se integró normalización en altas/ediciones, se creó endpoint de proveedores y se actualizaron los filtros del frontend para usar datos completos de la base de datos. |
| **ISS-007** | Control de Accesos en Eliminación de Certificaciones | Backend / Frontend | 29/05/2026      | Se agregaron restricciones en el backend para la eliminación de certificaciones (permitiendo la acción solo al propietario, administrador o líder del área). Se aplicó la misma validación lógica en el frontend para controlar la visibilidad del botón borrar de cada certificado individualmente.          |
| **ISS-008** | Campo de correo personal ausente al recuperar clave  | Backend / Frontend | 25/06/2026      | Se validó el token en carga de página mediante `verify-reset-token` y se añadió condicionalmente el campo "Correo personal" al formulario reactivo si el backend lo requiere. Se implementó validador de disparidad de emails. |
| **ISS-009** | Desaparición de usuarios por expiración de tokens    | Backend            | 25/06/2026      | Se removieron los índices TTL sobre `passwordResetExpires` y `verificationExpires` en `User.ts` que eliminaban al usuario completo. Se integró eliminación automática de estos índices al conectar a la DB y rutina utilitaria de auto-recuperación de certificaciones huérfanas al crear o loguear usuarios. |


---

## Análisis de Código y Sugerencias de Mejora

### [ISS-002] Exposición de MongoDB sin TLS

- **Código Afectado**: [docker-compose.yml](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/docker-compose.yml#L6-L7)
  ```yaml
  ports:
    - "${MONGO_PORT}:27017" # Puerto expuesto en el host
  ```
- **Sugerencia de Mejora**:
  Si la base de datos solo debe ser accedida por el backend, se recomienda remover la directiva `ports` y usar únicamente `expose: - "27017"` para mantener el puerto oculto de la red pública. Si se requiere acceso externo (por ejemplo, para administración), se sugiere configurar autenticación de usuarios y habilitar cifrado de transporte TLS nativo en MongoDB montando certificados dedicados en el contenedor de base de datos.

---

### [ISS-008] Campo de correo personal ausente al recuperar clave

- **Código Afectado**: [reset-password.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/auth/reset-password/reset-password.component.ts)
- **Sugerencia de Mejora**:
  Para garantizar que la recuperación sea viable cuando la base de datos requiera configurar o actualizar el correo de respaldo, se valida el estado del token al cargar la vista. De ser necesario, se añade dinámicamente el control `personalEmail` al formulario reactivo y se incorporan las validaciones pertinentes para evitar el uso del correo institucional.

---

### [ISS-009] Desaparición de usuarios por expiración de tokens

- **Código Afectado**: [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts), [server.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/server.ts)
- **Sugerencia de Mejora**:
  Eliminar los índices TTL que apuntan a campos del modelo de usuario para evitar el borrado automático de registros. Se programa una limpieza automática de los índices en el arranque de la base de datos y se crea un resolvedor utilitario en `userHealer.ts` que escanea y vuelve a asociar automáticamente cualquier certificación huérfana por similitud de nombres y departamentos cuando los usuarios recrean sus cuentas.

---

### [ISS-010] Departamentos dinámicos y asignación masiva de áreas

- **Código Afectado (Backend)**: [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts), [Certification.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/Certification.ts), [usersController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/usersController.ts)
- **Código Afectado (Frontend)**: [user.model.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/core/models/user.model.ts), [users-list.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/users/users-list/users-list.component.ts), [users-list.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/users/users-list/users-list.component.html)
- **Propuesta de Implementación**:
  - **Backend**: Crear un modelo dinámico `Department` en Mongoose con campos como `name`, `code` (ID interno único e inmutable por si cambia el nombre del departamento), `leaderId` y `isActive`. Reemplazar las referencias enum de departamento en el modelo [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts) y en [Certification.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/Certification.ts) por referencias `ObjectId` a la colección de departamentos.
  - **Actualización Masiva**: Crear un endpoint `PATCH /api/users/bulk-department` en [usersController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/usersController.ts) que acepte un listado de IDs de usuario y el ID del nuevo departamento de destino.
  - **Frontend**: Modificar [users-list.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/users/users-list/users-list.component.html) para agregar checkboxes en las filas de usuarios, y una barra de herramientas flotante o botón superior para aplicar el cambio masivo de área abriendo un modal que consuma la lista de departamentos activos.

---

### [ISS-011] Selección dinámica y creación al vuelo de cargos y departamentos

- **Código Afectado (Backend)**: [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts), [authController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/authController.ts)
- **Código Afectado (Frontend)**: [profile.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.ts), [profile.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.html) y formularios de registro / edición de usuarios.
- **Propuesta de Implementación**:
  - **Backend**: Crear una colección `positions` con el modelo `Position` (`name`, `isActive`). En los endpoints de creación/actualización de usuarios en [authController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/authController.ts), si se envía una nueva posición o departamento no registrado (bajo la opción "Otro"), crear dinámicamente el documento en la base de datos y asociar su `_id` al perfil del usuario.
  - **Frontend**: Reemplazar los inputs de texto libre de cargo/posición y selectores estáticos de departamento por comboboxes dinámicos que se nutran de las APIs `/api/positions` y `/api/departments`. Si el usuario selecciona "Otro", habilitar un input de texto reactivo para ingresar el nuevo nombre, el cual será creado en la BD en el submit.

---

### [ISS-012] Panel visual de gestión de departamentos y asignación de líderes

- **Código Afectado (Backend)**: [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts) (permisos, roles y relaciones de departamentos liderados), rutas de administración.
- **Código Afectado (Frontend)**: Vistas del panel de administración (`settings`), interfaces de configuración de la organización.
- **Propuesta de Implementación**:
  - **Backend**: Integrar lógica bidireccional de modo que al asignar un usuario como líder de departamento en la colección `departments`, automáticamente se le asigne el rol `UserRole.LIDER` (si no posee ya privilegios superiores) y se añada dicho departamento a su campo `managedDepartments` en la colección `users`.
  - **Frontend**: Diseñar una nueva vista de administración visual bajo el módulo `settings` donde el administrador pueda listar, crear, renombrar e inactivar departamentos, y asignar un líder de área mediante un selector autocompletable que muestre a los usuarios activos del sistema. Esta relación deberá verse reflejada de forma dinámica en todos los dashboards y filtros del sistema.

---

### [ISS-013] Listado compacto y administración de certificaciones en el perfil

- **Código Afectado (Frontend)**: [profile.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.ts), [profile.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.html)
- **Propuesta de Implementación**:
  - **Frontend**: En la vista de perfil de usuario, incorporar una nueva pestaña (tab) "Mis Certificaciones" contigua a las opciones actuales. Cargar las certificaciones pertenecientes al usuario actual consumiendo el servicio de certificaciones (`CertificationService.getUserCertifications`).
  - **Diseño**: Renderizar la información en formato de tabla densa/listado compacto (optimizando espacio de pantalla). Cada fila del listado contará con columnas básicas (Título, Emisor, Fecha de Emisión/Vencimiento, Estado) y acciones rápidas utilizando iconos pequeños y limpios para ver/descargar el certificado, editar y eliminar con un diálogo modal de confirmación.

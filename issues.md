# Control de Issues y Mejoras del Proyecto

Este documento registra los problemas, vulnerabilidades, mejoras y tareas técnicas del proyecto, clasificadas por su estado.

## Issues Pendientes (To Do)

| ID          | Título                                                             | Componente         | Prioridad | Estado |
| ----------- | ------------------------------------------------------------------ | ------------------ | --------- | ------ |
| **ISS-027** | Errores del backend ilegibles en las descargas de tipo blob        | Frontend           | Baja      | To Do  |
| **ISS-030** | Criterio de acceso divergente entre descarga individual y en lote  | Backend            | Media     | To Do  |
| **ISS-031** | Ausencia de Content-Security-Policy en el origen del frontend      | Infraestructura    | Media     | To Do  |
| **ISS-032** | Certificaciones organizacionales no descargables por la API pública| Backend            | Baja      | To Do  |
| **ISS-033** | Validación incoherente de `certificateUrl` y asignación masiva     | Backend            | Baja      | To Do  |
| **ISS-019** | Corrección en motor de Branding: Renderizado y estilos dinámicos   | Frontend           | Alta      | To Do  |
| **ISS-020** | Panel de Reportes: Selector dinámico de departamentos activos      | Frontend           | Media     | To Do  |
| **ISS-021** | Descarga de Reportes: Corrección de filtros de fecha en exportación| Backend            | Alta      | To Do  |
| **ISS-026** | Selector de colaboradores truncado a 100 registros en los filtros  | Frontend           | Baja      | To Do  |

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
| **ISS-010** | Departamentos dinámicos y asignación masiva de áreas               | Backend / Frontend | 25/06/2026      | Creado modelo Department e integradas referencias ObjectId nativas en BD. Implementado endpoint bulk-department y modal visual para reasignación múltiple. |
| **ISS-011** | Selección dinámica y creación al vuelo de cargos y departamentos   | Backend / Frontend | 25/06/2026      | Incorporado modelo Position. Formularios de creación y registro cargan selectores dinámicos y resuelven la opción "Otro" creándola al vuelo en la base de datos de manera case-insensitive. |
| **ISS-012** | Panel visual de gestión de departamentos y asignación de líderes   | Backend / Frontend | 25/06/2026      | Implementado CRUD completo /settings/departments con tarjetas interactivas y lógica de asignación/promoción automática bidireccional a rol LIDER. |
| **ISS-013** | Listado compacto y administración de certificaciones en el perfil  | Frontend           | 25/06/2026      | Añadida pestaña de certificaciones propias en /profile con visualización interactiva y accesos rápidos de descarga, edición y borrado. |
| **ISS-014** | Mejoras en RBAC: Acceso de lectura global y certificaciones de área| Backend / Frontend | 25/06/2026      | Habilitada lectura global de líderes, soporte para campos organizacionales en Certificaciones con Mongoose, y descarga protegida de archivos basada en departamentos aplicables. |
| **ISS-015** | Subida y gestión de certificaciones de Compliance por Líderes      | Backend / Frontend | 25/06/2026      | Formularios frontend dinámicos con alcance organizacional/checks de áreas aplicables. Edición de compliance habilitada a cualquier líder y borrado corporativo restringido a creador/admin. |
| **ISS-016** | Flexibilidad en Departamentos: Creación inicial sin Líder de Área  | Backend / Frontend | 25/06/2026      | Permitida desvinculación a nulo de líderes, eliminando la asociación en managedDepartments y degradándolo automáticamente si no gestiona otras áreas. |
| **ISS-017** | Panel y ejecución de respaldos completos automáticos y rotativos   | Backend / Frontend | 25/06/2026      | Programado cron de respaldo diario comprimido en backend/backups/ con rotación física de hasta 10 archivos. Creada interfaz visual de configuración y control de backups locales. |
| **ISS-023** | Roles no-Admin reciben 403 al abrir certificaciones organizacionales | Backend            | 29/07/2026      | Corregido `getCertificationFile` en `certificationsController.ts`: la validación de acceso a certificaciones organizacionales solo eximía al rol `ADMIN`, dejando fuera a `LIDER` y `READER` pese a que ambos ya tienen lectura global habilitada en el listado (`getCertifications`, ISS-014). Se unificó el criterio de acceso global en ambos endpoints. |
| **ISS-028** | XSS almacenado mediante archivo de certificado servido en línea      | Backend            | 09/08/2026      | El filtro de subida confiaba en el `Content-Type` declarado por el cliente y conservaba la extensión del nombre original, de modo que un HTML declarado como PDF se almacenaba como `.html` y `res.sendFile` lo entregaba como `text/html` en línea. El frontend lo abre como `blob:`, que hereda el origen de la aplicación, y el token de sesión vive en `localStorage`. Se agregó `utils/certificateFile.ts` como fuente única de tipos admitidos: la subida exige coherencia entre tipo MIME y extensión, el archivo se guarda con la extensión canónica del tipo, y la descarga fija el `Content-Type` desde esa tabla junto con `X-Content-Type-Options: nosniff`, rechazando con `415` cualquier archivo heredado con extensión no admitida. |
| **ISS-029** | Reemplazo del archivo de cualquier certificación sin autorización    | Backend            | 09/08/2026      | `uploadCertificate` ejecutaba `findByIdAndUpdate` sin comprobación alguna de propiedad ni de rol, por lo que cualquier usuario autenticado —incluido `READER`— podía sustituir el archivo de cualquier certificación conociendo su ID. Se extrajo `canModifyCertification` (propietario o creador, `ADMIN`, o `LIDER` del área) como criterio único compartido con `updateCertification`, se descarta del disco el archivo recién subido cuando la petición se rechaza, y se elimina el archivo sustituido para no acumular huérfanos. |
| **ISS-018** | Descarga consolidada en ZIP de certificaciones desde el Perfil       | Backend / Frontend | 09/08/2026      | Verificado como ya implementado durante la revisión del 09/08/2026: `downloadAllUserCertifications` empaqueta con `adm-zip` las certificaciones con archivo asociado, nombrando cada entrada por número de certificado o título y resolviendo colisiones con índice incremental. La autorización contempla propietario, `ADMIN` y `LIDER` con `canManageDepartment`, y el armado del ZIP descarta rutas que escapen de `uploads/certificates`. El perfil expone el botón "Descargar ZIP" con estado de carga. Se levantó ISS-027 por la ilegibilidad de los errores en la descarga. |
| **ISS-022** | Listado de Certificaciones: Filtro por usuario y orden prioritario   | Backend / Frontend | 09/08/2026      | Verificado como ya implementado durante la revisión del 09/08/2026: `getCertifications` admite el filtro `employeeId` con validación de ObjectId y ordena por omisión por `expirationDate: 1` con `createdAt: -1` como criterio secundario; el listado del frontend expone el combobox "Colaborador" poblado dinámicamente y restringido por `canViewUsers()`. Se levantó ISS-026 por el truncamiento del selector a 100 registros. |
| **ISS-024** | Bypass de autenticación en el inicio de sesión con SSO               | Backend / Frontend | 09/08/2026      | El `id_token` de Azure AD se procesaba con `jwt.decode`, sin verificar la firma: bastaba un JWT fabricado con el correo de un administrador para autenticarse y aprovisionar la cuenta vía JIT. Se implementó `verifyAzureIdToken` (firma RS256 contra el JWKS del tenant, más `iss`, `aud`, `exp`/`nbf` y `tid`), se reemplazó la simulación `prompt()` del frontend por el flujo real Authorization Code + PKCE con MSAL, se acotó el modo simulado de LDAP a una activación explícita y se escapó el filtro de búsqueda LDAP (RFC 4515). |
| **ISS-025** | Enlace de restablecimiento de contraseña no funcional               | Backend / Frontend | 09/08/2026      | Corregidas dos causas concurrentes: `getFrontendBaseUrl` construía el enlace con el host interno del contenedor cuando las cabeceras de la petición no coincidían con `FRONTEND_URL`, y `resetPassword` exigía el correo personal ignorando la política `requirePersonalEmail` que sí respeta `verifyResetToken`, dejando el formulario sin ese campo y el envío en `400`. Además se elevó la vigencia por omisión a 60 minutos, se diferenciaron los motivos de rechazo (`TOKEN_EXPIRED` / `TOKEN_INVALID`) y se agregó traza del origen del enlace generado. |


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

---

### [ISS-014] Mejoras en RBAC: Acceso de lectura global y certificaciones de área

- **Código Afectado (Backend)**: [User.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/User.ts), [Certification.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/Certification.ts), [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts)
- **Propuesta de Implementación**:
  - **RBAC Global**: Ajustar las consultas en [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts) para que los usuarios con rol `LIDER` tengan permisos de lectura global sobre todas las certificaciones (permitiendo ver las de otros departamentos), pero restringiendo las acciones de edición y eliminación exclusivamente a sus propios departamentos o creadas por ellos.
  - **Certificaciones Organizacionales**: Añadir en el esquema de certificaciones los campos `isOrganizational: boolean` (para marcar certificaciones del área o empresa como SOC2, sin dueño individual) y `applicableDepartments: ObjectId[]` / `appliesToAllCompany: boolean` para definir su alcance.
  - **Restricción de Acciones**: Permitir la subida y modificación de estas certificaciones organizacionales únicamente a los Líderes de área y Administradores. Configurar el endpoint de descarga de archivos para que otros departamentos puedan ver los datos de cumplimiento, pero sin opción de descargar el archivo original o modificarlo (permitido solo a nivel de visualización).

---

### [ISS-015] Subida y gestión de certificaciones de Compliance por Líderes

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts), [certifications.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/routes/certifications.ts)
- **Código Afectado (Frontend)**: Formularios de subida y edición de certificaciones.
- **Propuesta de Implementación**:
  - **Permisos de Gestión**: En el backend, las certificaciones organizacionales bajo la categoría de `compliance` (cumplimiento normativo) podrán ser modificadas por cualquier líder de área para mantenerlas actualizadas. Sin embargo, para evitar pérdidas de datos, la eliminación estará restringida únicamente al líder creador (`createdBy`) y al Administrador.
  - **Formulario de Carga**: En el frontend, al seleccionar una certificación de tipo organizacional/compliance, desplegar una sección visual con checkboxes dinámicos (obtenidos de la API de departamentos) para asociar el cumplimiento a departamentos específicos o marcar la opción global "Toda la Empresa" (ISO 9001).

---

### [ISS-016] Flexibilidad en Departamentos: Creación inicial sin Líder de Área

- **Código Afectado (Backend)**: Modelo de Departamentos (`Department`), controlador de departamentos.
- **Código Afectado (Frontend)**: Vistas de gestión de departamentos en el módulo `settings`.
- **Propuesta de Implementación**:
  - **Backend**: Establecer el campo `leaderId` en el esquema de Mongoose del departamento como opcional (`required: false`) o permitir valores nulos. Ajustar las validaciones del backend para autorizar la creación o modificación de departamentos sin un líder de área asignado.
  - **Frontend**: Permitir que el selector de líder en el formulario de departamentos tenga una opción vacía ("Sin Líder Asignado" o "Asignar más tarde"), de manera que el administrador pueda registrar el área inmediatamente y vincular su líder en una edición posterior.

---

### [ISS-017] Panel y ejecución de respaldos completos automáticos y rotativos

- **Código Afectado (Backend)**: [backupService.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/services/backupService.ts), [settingsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/settingsController.ts), [settings.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/routes/settings.ts)
- **Código Afectado (Frontend)**: Pantalla de administración `/settings/backup`.
- **Propuesta de Implementación**:
  - **Configuración y Almacenamiento**: Crear un modelo de configuración de respaldos (`BackupSettings`) o extender `SecuritySettings` para guardar los parámetros: `autoBackupEnabled` (boolean) y `autoBackupIntervalDays` (number).
  - **Rutina Automática**: Desarrollar un servicio cron en el backend que corra diariamente. Si el backup automático está habilitado y la diferencia de días con el último respaldo es igual o mayor al intervalo configurado, generará un ZIP completo mediante [backupService.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/services/backupService.ts) y lo guardará en un directorio local dedicado en el servidor (`backend/backups/`).
  - **Rotación y Descarga**: Implementar lógica de rotación que analice el directorio de backups, ordenando por fecha de creación y manteniendo únicamente los últimos 10 archivos (eliminando los excedentes). Habilitar endpoints seguros para listar y descargar estos respaldos locales (`/api/settings/backup/download/:filename`) validando privilegios de administrador.
  - **Frontend**: Crear la interfaz correspondiente en la pestaña de Backup para activar el respaldo automático, fijar los días de intervalo y renderizar la tabla con la lista de los últimos 10 respaldos autogenerados para su descarga o eliminación manual.

---

### [ISS-018] Descarga consolidada en ZIP de certificaciones desde el Perfil

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts), [certifications.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/routes/certifications.ts)
- **Código Afectado (Frontend)**: [profile.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.ts), [profile.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/profile/profile.component.html)
- **Resolución**: Verificado como ya implementado durante la revisión del 09/08/2026; el issue permanecía abierto por falta de actualización del documento.
  - **Backend**: `downloadAllUserCertifications` resuelve el endpoint `GET /api/certifications/user/:userId/download-all`. Selecciona las certificaciones con `certificateUrl` presente, arma el ZIP en memoria con `adm-zip` nombrando cada entrada por número de certificado o título —saneado a caracteres seguros— y resolviendo colisiones con un índice incremental, y lo devuelve como descarga directa.
  - **Backend (autorización)**: Más allá de lo especificado, el endpoint valida que el solicitante sea el propietario, `ADMIN` o `LIDER` con `canManageDepartment` sobre el departamento del colaborador, y responde `403` en cualquier otro caso.
  - **Backend (integridad de rutas)**: Cada archivo se acepta solo si su URL parte de `/uploads/certificates/` y si la ruta resuelta permanece dentro de esa raíz, descartando intentos de path traversal.
  - **Frontend**: El perfil expone el botón "Descargar ZIP" (`fa-file-archive`) con indicador de progreso, que descarga el blob resultante.
- **Deuda detectada**: Los errores del endpoint no llegan legibles al usuario porque el cliente solicita la respuesta como `blob`. Se registró como [ISS-027], junto con dos observaciones menores del mismo flujo.

---

### [ISS-019] Corrección en motor de Branding: Renderizado y estilos dinámicos

- **Código Afectado (Frontend)**: [app.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/app.ts), [app.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/app.component.html), [login.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/auth/login/login.component.ts)
- **Propuesta de Implementación**:
  - **Carga Global**: Al inicializar la aplicación en [app.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/app.ts), invocar el servicio de branding para obtener la configuración guardada del backend. Almacenar el resultado en un Signal o BehaviorSubject para propagarlo a los componentes interesados.
  - **Estilos Dinámicos**: Si existen configuraciones de color (`primaryColor` y `secondaryColor`), inyectarlas dinámicamente a través de `document.documentElement.style.setProperty('--primary-color', color)` para sobrescribir los valores fijos de CSS. Cambiar el título del sitio `document.title` al nombre de aplicación configurado.
  - **Logos**: En [app.component.html](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/app.component.html) (sidebar) y en [login.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/auth/login/login.component.ts), reemplazar las imágenes hardcodeadas estáticas por etiquetas `<img>` reactivas que se carguen utilizando los campos `sidebarLogo` y `loginLogo` en Base64 o URL.

---

### [ISS-020] Panel de Reportes: Selector dinámico de departamentos activos

- **Código Afectado (Frontend)**: Vista de reportes de la organización (`reports-component` o `/settings/reports`).
- **Propuesta de Implementación**:
  - **Frontend**: Reemplazar la entrada de texto libre actual en los filtros del módulo de reportes por un elemento `<select>` o combobox autocompletable. Este selector debe cargarse dinámicamente llamando a la API de departamentos activos en el arranque de la vista para evitar ingresos incorrectos o inexistentes.

---

### [ISS-021] Descarga de Reportes: Corrección de filtros de fecha en exportación

- **Código Afectado (Backend)**: [settingsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/settingsController.ts) (función `exportReport`).
- **Propuesta de Implementación**:
  - **Backend**: Corregir la consulta en `exportReport` dentro de [settingsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/settingsController.ts). Actualmente ejecuta una búsqueda incondicional (`Certification.find()`), omitiendo los parámetros de filtrado enviados en el request. Se modificará para capturar los Query Params de `department`, `status`, `from` y `to` (usando `getDateRange(req)`), y aplicar dicho objeto de filtro en la consulta final a Mongoose antes de construir el archivo CSV de descarga.

---

### [ISS-023] Roles no-Admin reciben 403 al abrir certificaciones organizacionales

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (función `getCertificationFile`).
- **Causa Raíz**: El listado (`getCertifications`) otorga lectura global sobre certificaciones organizacionales a los roles `ADMIN`, `LIDER` y `READER` (ver ISS-014), pero la validación de descarga/apertura de archivo en `getCertificationFile` solo eximía al rol `ADMIN` de la restricción por departamento aplicable. Como resultado, un usuario `LIDER` o `READER` podía ver una certificación organizacional de otra área en la lista, pero al intentar abrirla o descargarla recibía `403 - acceso restringido a áreas aplicables` por no pertenecer al departamento asociado.
- **Resolución**: Se reemplazó el chequeo `isAdmin` por `hasGlobalReadAccess` (`ADMIN`, `LIDER` o `READER`), alineando el criterio de autorización del endpoint de archivo con el ya utilizado en el listado. `TECNICO` continúa restringido a su departamento aplicable.

---

### [ISS-022] Listado de Certificaciones: Filtro por usuario y orden prioritario

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts) (función `getCertifications`).
- **Código Afectado (Frontend)**: [certifications-list.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/certifications/certifications-list/certifications-list.component.ts)
- **Resolución**: Verificado como ya implementado durante la revisión del 09/08/2026; el issue permanecía abierto por falta de actualización del documento.
  - **Backend (Orden predeterminado)**: `getCertifications` construye el orden con `sortBy` por omisión en `expirationDate` y dirección ascendente, sumando `createdAt: -1` como criterio secundario. Las certificaciones más próximas a vencer encabezan el listado. El frontend no envía `sortBy`, por lo que este orden aplica efectivamente.
  - **Backend (Filtro de Usuario)**: `getCertifications` acepta el query param `employeeId`, valida que sea un ObjectId y responde `400` ante un valor mal formado antes de tocar la base de datos.
  - **Frontend (Filtro de Usuario)**: El formulario de filtros expone el combobox "Colaborador", poblado desde `UserService.getUsers` con los usuarios activos ordenados alfabéticamente, vacío por omisión ("Todos los colaboradores") y visible solo para roles con `canViewUsers()`.
- **Deuda detectada**: La carga del selector solicita un máximo de 100 colaboradores sin paginar ni buscar, por lo que en organizaciones más grandes el filtro omite silenciosamente al resto. Se registró como [ISS-026].

---

### [ISS-024] Revisión del inicio de sesión con SSO (Azure AD / LDAP)

- **Código Afectado (Backend)**: [authController.ts](file:///c:/Workspace/certvault/backend/src/controllers/authController.ts) (función `adLogin`, líneas ~890-1020).
- **Código Afectado (Frontend)**: [login.component.ts](file:///c:/Workspace/certvault/certif-app/src/app/features/auth/login/login.component.ts) (`loginWithAzure`, líneas ~233-252).
- **Causa Raíz**: `adLogin` procesaba el `id_token` con `jwt.decode`, que solo deserializa el payload sin comprobar la firma. La única validación era que el claim `tid` coincidiera con el tenant configurado, dato que viaja dentro del mismo token no verificado. Como el token llega desde el navegador —un canal que el atacante controla por completo—, cualquiera que alcanzara el endpoint podía autenticarse como cualquier correo corporativo enviando un JWT fabricado, y el aprovisionamiento JIT (ISS-005) le creaba además una cuenta persistente. El flujo del frontend no era un OIDC real: `loginWithAzure()` pedía el correo con `prompt()` y armaba un token ficticio en Base64, de modo que no existía ninguna verificación de identidad en todo el trayecto.
- **Hallazgos colaterales en la misma función**:
  - **Modo simulado de LDAP**: ante cualquier error de conexión, el `catch` aceptaba las credenciales sin contactar al Directorio Activo con solo que `NODE_ENV` no fuera `production` —o que faltara el módulo `ldapjs`—, y devolvía al cliente el mensaje de error interno del servidor LDAP.
  - **Inyección en el filtro LDAP**: el correo del formulario se interpolaba sin escapar en `(|(mail=${email})(userPrincipalName=${email}))`, permitiendo alterar la estructura de la consulta al directorio.
- **Resolución**:
  - **Backend (`azureToken.ts`)**: Nueva utilidad `verifyAzureIdToken` que valida el token con `jwt.verify` y la clave pública obtenida del JWKS del tenant (`jwks-rsa`, con caché y rotación automática de claves por `kid`), exigiendo algoritmo `RS256`, emisor `https://login.microsoftonline.com/{tenantId}/v2.0`, audiencia igual al Client ID registrado, vigencia (`exp`/`nbf`) y coincidencia de `tid`. Cualquier fallo rechaza el acceso con `401`, sin rutas alternativas. Si falta el Tenant ID o el Client ID en la configuración, el login se rechaza en lugar de degradar la validación.
  - **Backend (`ldap.ts`)**: `escapeLdapFilterValue` escapa los caracteres con significado sintáctico según RFC 4515, e `isLdapSimulationEnabled` restringe el modo simulado a una activación explícita (`LDAP_SIMULATION_ENABLED=true`) que además nunca aplica en producción. El error interno del servidor LDAP dejó de propagarse al cliente.
  - **Backend (`getAdConfig`)**: Expone `azureTenantId` y `azureClientId`, identificadores públicos del App Registration que el flujo del navegador necesita. El secreto del cliente no se expone ni es necesario en un SPA.
  - **Frontend (`azure-sso.service.ts`)**: Flujo real Authorization Code + PKCE con `@azure/msal-browser`. Se instancia MSAL de forma diferida en lugar de usar `@azure/msal-angular` porque el Tenant y el Client ID son configuración de base de datos que llega en tiempo de ejecución, mientras que el módulo de Angular los exige durante el bootstrap. La cancelación del popup se distingue de un error real y el botón de SSO solo se renderiza si el App Registration está declarado.
  - **Testing**: `ldap.spec.ts` cubre el escape del filtro —incluida la carga `*)(objectClass=*`— y las tres combinaciones del flag de simulación (24 casos en total entre ambas suites, en verde).
- **Requisito de despliegue**: el inicio de sesión con Microsoft exige un App Registration en Entra ID con plataforma **SPA** y el origen de CertVault como Redirect URI, y que el Tenant ID y el Client ID estén cargados en el panel de seguridad. Sin esa configuración el botón no se muestra y el endpoint rechaza cualquier token.

---

### [ISS-026] Selector de colaboradores truncado a 100 registros en los filtros

- **Código Afectado (Frontend)**: [certifications-list.component.ts](file:///c:/Workspace/certvault/certif-app/src/app/features/certifications/certifications-list/certifications-list.component.ts) (carga de `usersOptions`).
- **Síntoma**: El combobox "Colaborador" del listado de certificaciones (ISS-022) se puebla con `getUsers({ limit: 100, isActive: true })`. El endpoint de usuarios pagina sin tope superior, de modo que devuelve exactamente los primeros 100 registros: en una organización con más colaboradores activos, el resto no aparece en el selector y sus certificaciones dejan de ser filtrables por dueño. La omisión es silenciosa —no hay aviso ni indicador de truncamiento— y el comentario del código describe la llamada como "la lista completa de colaboradores", lo que oculta la limitación a quien lea el código.
- **Observaciones asociadas** (menores, del mismo bloque):
  - La interfaz `CertificationFilter` no declara `employeeId`. El filtro funciona porque `buildFilters()` castea el valor del formulario y el cast no elimina la propiedad, pero el tipo no refleja el contrato real del endpoint.
  - El selector solo lista usuarios activos, mientras que el listado sí muestra certificaciones de colaboradores desactivados (agrupadas como "no disponibles"). Esas certificaciones se ven pero no se pueden filtrar por su dueño.
- **Propuesta de Implementación**:
  - **Frontend**: Reemplazar la carga fija por un combobox con búsqueda server-side que consulte `UserService.getUsers({ search })` con *debounce* a medida que se escribe, manteniendo una precarga inicial acotada para el uso habitual. Así el tamaño del directorio deja de condicionar el filtro.
  - **Frontend (alternativa mínima)**: Si se prefiere no introducir búsqueda asíncrona, paginar la carga hasta agotar el total que informa el endpoint y, en su defecto, advertir explícitamente cuando la lista esté truncada. Lo que no debe permanecer es la omisión silenciosa.
  - **Tipado**: Declarar `employeeId?: string` en `CertificationFilter` y eliminar la dependencia del cast.
  - **Consistencia**: Definir si el selector debe incluir colaboradores desactivados para alinearlo con lo que el listado efectivamente muestra.

---

### [ISS-027] Errores del backend ilegibles en las descargas de tipo blob

- **Código Afectado (Frontend)**: [certification.service.ts](file:///c:/Workspace/certvault/certif-app/src/app/core/services/certification.service.ts) (4 llamadas), [settings.service.ts](file:///c:/Workspace/certvault/certif-app/src/app/core/services/settings.service.ts) (3 llamadas), [http-error.util.ts](file:///c:/Workspace/certvault/certif-app/src/app/core/utils/http-error.util.ts).
- **Síntoma**: Las descargas se solicitan con `responseType: 'blob'`, opción que se aplica también a las respuestas de error. Cuando el backend responde `403` o `404` con un cuerpo JSON explicativo, Angular lo entrega como `Blob` y `extractHttpErrorMessage` no encuentra `error.message` ni `error.error`, por lo que la vista muestra el texto genérico del status en lugar del motivo real. Detectado al verificar ISS-018: un usuario sin archivos recibe un error de HTTP crudo en vez de "No se encontraron archivos de certificaciones disponibles para este usuario", y lo mismo ocurre ante un `403` por permisos.
- **Alcance**: No es puntual del ZIP de certificaciones. Afecta a las siete descargas del sistema —archivo de certificación, ZIP consolidado, exportación de respaldos, descarga de backups locales y exportación de reportes—, todas construidas sobre el mismo patrón.
- **Observaciones asociadas** (del flujo de ISS-018):
  - **Nombre de archivo con caracteres no ASCII**: la cabecera `Content-Disposition` del ZIP se arma con `${firstName}_${lastName}` reemplazando solo espacios, de modo que un nombre con tilde o `ñ` produce una cabecera que RFC 6266 no admite sin la forma `filename*`. El navegador entrega el archivo con el nombre mutilado.
  - **ZIP construido íntegramente en memoria**: `zip.toBuffer()` materializa el archivo completo antes de enviarlo. Con el límite vigente de 5 MB por certificado, un colaborador con muchas certificaciones genera un buffer considerable por request. Hoy es improbable, pero degrada en silencio a medida que crece el histórico.
- **Propuesta de Implementación**:
  - **Frontend**: Añadir en `http-error.util.ts` un manejador para respuestas de error de tipo `Blob` que lea su contenido como texto, lo parsee como JSON y reconstruya el `ApiError` con el mensaje y el `reason` del backend, conservando el mensaje genérico como respaldo si el cuerpo no es JSON. Al ser asíncrono, conviene resolverlo con un operador que devuelva el observable de error ya enriquecido.
  - **Frontend**: Reemplazar los `catchError(this.handleError)` de las siete descargas por ese manejador, de modo que la corrección sea única y no se repita en cada servicio.
  - **Backend**: Codificar el nombre del ZIP en la cabecera con `filename*=UTF-8''` (RFC 6266), manteniendo un `filename` ASCII como respaldo para clientes antiguos.
  - **Backend (opcional)**: Evaluar el envío del ZIP por streaming si el volumen de certificaciones por colaborador crece, evitando materializar el buffer completo.
- **Nota**: La observación sobre el nombre del ZIP quedó resuelta en ISS-028/ISS-029 mediante `toSafeDownloadName`, que translitera tildes y descarta los caracteres que la cabecera no admite. Persiste como mejora el uso de `filename*=UTF-8''` para conservar el nombre original en lugar de transliterarlo.

---

### [ISS-028] XSS almacenado mediante archivo de certificado servido en línea

- **Código Afectado (Backend)**: [certifications.ts](file:///c:/Workspace/certvault/backend/src/routes/certifications.ts) (configuración de Multer), [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (`getCertificationFile`, `getPublicCertificationFile`), [certificateFile.ts](file:///c:/Workspace/certvault/backend/src/utils/certificateFile.ts).
- **Causa Raíz**: La cadena de explotación recorría toda la funcionalidad de archivos.
  1. El `fileFilter` de Multer aceptaba el archivo según `file.mimetype`, valor que viaja en la cabecera del multipart y que controla por completo quien sube el archivo.
  2. El nombre en disco conservaba `path.extname(file.originalname)`, de modo que un `payload.html` declarado como `application/pdf` se almacenaba con extensión `.html`.
  3. `res.sendFile` deducía el `Content-Type` de esa extensión y respondía `text/html`, con disposición `inline` por omisión.
  4. El frontend descarga el archivo como `Blob` y lo abre con `window.open(objectUrl)`; un `blob:` hereda el origen del documento que lo creó, así que el HTML se ejecutaba en el origen de la aplicación. El `'noopener'` no protege: solo bloquea `window.opener`, no el acceso al origen.
  5. No existe CSP en ese origen (ver [ISS-031]) y el token de sesión se guarda en `localStorage`, por lo que el script podía exfiltrarlo.
  - Bastaba una cuenta común para plantar el archivo; la ejecución ocurría con la sesión de quien lo abriera para revisarlo, incluido un administrador.
- **Resolución**: Se creó `utils/certificateFile.ts` como fuente única de verdad de los tipos admitidos (`application/pdf`, `image/jpeg`, `image/png`) con sus extensiones canónicas.
  - **Subida**: `isConsistentCertificateUpload` exige que la extensión declarada corresponda al tipo MIME, y el nombre en disco se compone con `canonicalExtensionForMimeType`, de manera que la extensión ya no proviene del cliente.
  - **Descarga**: `sendCertificateFile` fija el `Content-Type` resolviéndolo desde la tabla y añade `X-Content-Type-Options: nosniff`. Un archivo cuya extensión no corresponda a un tipo admitido —los ingresados antes de esta validación— se rechaza con `415` en lugar de servirse.
  - **Nombre de descarga**: `toSafeDownloadName` translitera tildes y descarta los caracteres que `Content-Disposition` no admite, lo que además corrige el `500` permanente que producía un título con raya, comillas tipográficas o emoji al lanzar `ERR_INVALID_CHAR` en `setHeader`.
  - **Testing**: `certificateFile.spec.ts` cubre el HTML disfrazado de PDF, otras extensiones ejecutables, la resolución del tipo de contenido y el saneamiento del nombre (14 casos).
- **Pendiente**: Los archivos subidos antes de la corrección conservan su extensión original. Corresponde auditar `uploads/certificates` en busca de extensiones fuera de la lista admitida; a partir de ahora esos archivos responden `415` en lugar de ejecutarse, pero siguen en disco.

---

### [ISS-029] Reemplazo del archivo de cualquier certificación sin autorización

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (`uploadCertificate`, `updateCertification`).
- **Causa Raíz**: `uploadCertificate` recibía el `id` por la ruta y ejecutaba directamente `Certification.findByIdAndUpdate(req.params.id, { certificateUrl })` sin verificar propiedad ni rol. La ruta solo atraviesa `authenticate`, de modo que cualquier usuario autenticado —incluido `READER`, que sí tiene vedada la edición de datos en `updateCertification`— podía sustituir el archivo de cualquier certificación conociendo su identificador. Encadenado con ISS-028, permitía plantar el archivo malicioso en una certificación ajena con mayor probabilidad de ser abierta.
- **Resolución**:
  - Se extrajo `canModifyCertification` como criterio único de escritura (propietario o creador, `ADMIN`, o `LIDER` del departamento de la certificación) y se aplicó tanto en `uploadCertificate` como en `updateCertification`, que duplicaba la misma lógica en línea. La excepción de ISS-015 para compliance organizacional se conserva como condición adicional.
  - El archivo ya está escrito en disco cuando la petición llega al controlador, por lo que un rechazo por permisos o por certificación inexistente lo elimina en lugar de dejar residuos.
  - El archivo sustituido se elimina tras una actualización exitosa, corrigiendo la acumulación de huérfanos.

---

### [ISS-030] Criterio de acceso divergente entre descarga individual y en lote

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (`canAccessCertification`, `downloadAllUserCertifications`).
- **Síntoma**: `canAccessCertification` devuelve `!!user`, por lo que la descarga individual de un archivo está abierta a cualquier usuario autenticado. En cambio `downloadAllUserCertifications` restringe la descarga en lote al propietario, `ADMIN` o `LIDER` con `canManageDepartment`. El mismo conjunto de documentos está protegido cuando se solicita completo y disponible cuando se solicita de a uno: un `READER` puede recuperar el diploma de cualquier colaborador iterando identificadores.
- **Consideración**: El comportamiento está documentado como deliberado en el propio código ("se permite el acceso de lectura y descarga de archivos a cualquier usuario autenticado"), de modo que no se modificó sin una decisión explícita. Los certificados son documentos personales —títulos, diplomas—, por lo que conviene definir si la apertura es intencional.
- **Propuesta de Implementación**: Unificar ambos criterios en una sola función de autorización de lectura de archivos. Si el acceso amplio es el deseado, relajar `downloadAllUserCertifications` para que sea coherente; si no lo es, aplicar en `getCertificationFile` el mismo criterio de propietario, `ADMIN` y `LIDER` del área, contemplando el acceso global de lectura ya concedido por ISS-014 para las certificaciones organizacionales.

---

### [ISS-031] Ausencia de Content-Security-Policy en el origen del frontend

- **Código Afectado (Infraestructura)**: [nginx.conf.template](file:///c:/Workspace/certvault/certif-app/nginx.conf.template).
- **Síntoma**: El servidor del frontend solo emite cabeceras de caché. `helmet` aplica su CSP a las respuestas del backend, pero no cubre el documento que sirve nginx ni los documentos `blob:` que la aplicación crea, los cuales heredan la política del origen que los generó. Detectado al analizar ISS-028: la ausencia de CSP era el último eslabón que permitía la ejecución del script.
- **Propuesta de Implementación**: Definir una CSP en el bloque `server` de nginx, comenzando por `default-src 'self'` y acotando `script-src` a `'self'`. Requiere verificar previamente si la aplicación depende de estilos o scripts en línea —Angular inyecta estilos de componente en línea, por lo que probablemente sea necesario `style-src 'self' 'unsafe-inline'`—, y desplegar primero en modo `Content-Security-Policy-Report-Only` para detectar rupturas antes de aplicarla.

---

### [ISS-032] Certificaciones organizacionales no descargables por la API pública

- **Código Afectado (Backend)**: [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (`getPublicCertificationFile`).
- **Síntoma**: El endpoint externo verifica que el propietario de la certificación exista y esté activo antes de entregar el archivo. Las certificaciones organizacionales no tienen `employeeId` —el modelo lo exige solo para las individuales—, por lo que la consulta devuelve `null` y el endpoint responde `404 Archivo no disponible`. Ninguna certificación organizacional puede descargarse por la API pública, y el mensaje no distingue esa situación de un archivo realmente ausente.
- **Propuesta de Implementación**: Decidir si la API pública debe exponer las certificaciones organizacionales. De ser así, omitir la validación de propietario cuando `isOrganizational` sea verdadero; en caso contrario, responder con un mensaje explícito que indique que el tipo de certificación no se expone por este canal.

---

### [ISS-033] Validación incoherente de `certificateUrl` y asignación masiva

- **Código Afectado (Backend)**: [Certification.ts](file:///c:/Workspace/certvault/backend/src/models/Certification.ts) (validación de `certificateUrl`), [certificationsController.ts](file:///c:/Workspace/certvault/backend/src/controllers/certificationsController.ts) (`updateCertification`).
- **Síntoma**: El modelo valida `certificateUrl` contra `/^https?:\/\/.+/`, pero el sistema almacena rutas internas del tipo `/uploads/certificates/…`, que nunca satisfacen esa expresión. La subida funciona porque `findByIdAndUpdate` no ejecuta validadores por omisión, mientras que `updateCertification` sí usa `runValidators: true` sobre `{ ...req.body }`: si un cliente incluyera `certificateUrl` en el `PUT`, recibiría "URL inválida" por un valor generado por la propia aplicación. La validación no protege nada y sí puede rechazar datos legítimos.
- **Observación asociada**: `updates = { ...req.body }` traslada al documento cualquier campo que envíe el cliente. Los campos sensibles (`isOrganizational`, rol de edición) están cubiertos por comprobaciones previas, y las rutas de descarga verifican el prefijo `/uploads/certificates/`, por lo que no hay impacto sobre la entrega de archivos; pero permite fijar valores arbitrarios en campos no contemplados.
- **Propuesta de Implementación**: Ajustar la validación del modelo para admitir la ruta interna que el sistema genera, o retirarla y validar en el controlador. Sustituir la propagación completa de `req.body` por una lista explícita de campos actualizables.

---

### [ISS-025] Enlace de restablecimiento de contraseña no funcional

- **Código Afectado (Backend)**: [authController.ts](file:///c:/Workspace/certvault/backend/src/controllers/authController.ts) (`forgotPassword`, `resetPassword`, `verifyResetToken`), [frontendUrl.ts](file:///c:/Workspace/certvault/backend/src/utils/frontendUrl.ts) (`buildResetLink`, `getFrontendBaseUrl`).
- **Código Afectado (Frontend)**: [reset-password.component.ts](file:///c:/Workspace/certvault/certif-app/src/app/features/auth/reset-password/reset-password.component.ts).
- **Síntoma**: Al solicitar el olvido de contraseña, el correo se envía correctamente, pero el enlace recibido no permite completar el restablecimiento.
- **Causa Raíz**: Dos defectos independientes que producían el mismo síntoma y se enmascaraban tras un único mensaje genérico ("enlace inválido o ya expiró").
  1. **URL base resuelta desde las cabeceras de la petición**: `getFrontendBaseUrl` devolvía `findConfiguredMatch(urls, origin) || origin`, es decir, adoptaba el origen declarado por la petición aun cuando no coincidía con ninguna URL de `FRONTEND_URL`. Detrás del proxy inverso, `X-Forwarded-Host` resuelve al host interno del contenedor, de modo que el enlace enviado por correo apuntaba a una dirección inalcanzable desde el equipo del destinatario. Un enlace de correo se abre fuera del contexto de la petición que lo originó, por lo que nunca debe depender de sus cabeceras.
  2. **Criterio divergente sobre el correo personal**: `verifyResetToken` respeta la política `requirePersonalEmail` para informar al formulario si debe pedir el correo de respaldo, pero `resetPassword` lo exigía incondicionalmente. Con la política desactivada, el formulario no renderizaba el campo y el envío moría con `400` pese a que el token era válido.
  - Contribuía además una vigencia por omisión de 10 minutos (`RESET_PASSWORD_EXPIRE_MINUTES`), que sumada a la latencia de entrega del correo podía expirar antes de que el usuario abriera el mensaje.
- **Resolución**:
  - **Backend (`frontendUrl.ts`)**: Se invirtió la precedencia. Las cabeceras de la petición ahora solo sirven para elegir *cuál* de las URLs declaradas en `FRONTEND_URL` usar cuando hay varias; si el origen no coincide con ninguna, se usa la primera URL configurada. El origen de la petición solo se acepta como base cuando no existe configuración declarada (desarrollo local). Se extrajo la resolución del origen a `resolveRequestOrigin` y se agregó `firstForwardedValue` para tomar únicamente el primer valor de las cabeceras `X-Forwarded-*` encadenadas por varios proxies.
  - **Backend (`authController.ts`)**: `resetPassword` aplica la misma política `requirePersonalEmail` que `verifyResetToken`. Se extrajo `findUserByResetToken`, que separa la validez del token de su vigencia (la expiración se evalúa en memoria, no en la consulta) para poder responder con el motivo exacto: `TOKEN_INVALID`, `TOKEN_EXPIRED` o `PERSONAL_EMAIL_REQUIRED`. La vigencia por omisión subió a 60 minutos y se registra en el log el origen del enlace generado (sin el token) para verificar en producción qué base se está resolviendo.
  - **Frontend**: `toApiError` en `http-error.util.ts` preserva el código `reason` del backend, que antes se perdía al colapsar la respuesta en un `Error` con solo el mensaje. La vista de restablecimiento distingue el enlace inutilizable —oculta el formulario y ofrece el acceso directo a solicitar uno nuevo— del error de campo, que mantiene el formulario activo.
  - **Testing**: `frontendUrl.spec.ts` cubre la regresión con cabeceras `Origin` y `X-Forwarded-Host` apuntando a hosts internos, cabeceras encadenadas y el fallback de desarrollo sin `FRONTEND_URL` (17 casos, en verde).
- **Pendiente de verificación en producción**: si tras el despliegue el síntoma persiste, la traza de `forgotPassword` indicará la base resuelta. Queda descartar la reescritura de los query params por mecanismos de "safe links" del gestor de correo corporativo, que no es observable desde la aplicación.



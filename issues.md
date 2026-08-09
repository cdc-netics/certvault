# Control de Issues y Mejoras del Proyecto

Este documento registra los problemas, vulnerabilidades, mejoras y tareas técnicas del proyecto, clasificadas por su estado.

## Issues Pendientes (To Do)

| ID          | Título                                                             | Componente         | Prioridad | Estado |
| ----------- | ------------------------------------------------------------------ | ------------------ | --------- | ------ |
| **ISS-018** | Descarga consolidada en ZIP de certificaciones desde el Perfil     | Backend / Frontend | Baja      | To Do  |
| **ISS-019** | Corrección en motor de Branding: Renderizado y estilos dinámicos   | Frontend           | Alta      | To Do  |
| **ISS-020** | Panel de Reportes: Selector dinámico de departamentos activos      | Frontend           | Media     | To Do  |
| **ISS-021** | Descarga de Reportes: Corrección de filtros de fecha en exportación| Backend            | Alta      | To Do  |
| **ISS-022** | Listado de Certificaciones: Filtro por usuario y orden prioritario  | Backend / Frontend | Media     | To Do  |
| **ISS-024** | Revisión del inicio de sesión con SSO (Azure AD / LDAP)            | Backend / Frontend | Alta      | To Do  |

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
- **Propuesta de Implementación**:
  - **Backend**: Crear el endpoint `/api/certifications/user/:userId/download-all` en [certifications.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/routes/certifications.ts). Esta función obtendrá todas las certificaciones de un usuario que tengan archivos asociados (`certificateUrl`), los empaquetará dinámicamente en memoria utilizando `adm-zip` nombrando cada archivo con su número de certificado y título, y retornará el buffer ZIP como una descarga directa de archivo.
  - **Frontend**: En el panel de perfil del usuario, añadir un botón de "Descargar todas mis certificaciones" (`fas fa-file-archive`) que realice la descarga de dicho archivo ZIP de manera transparente.

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
- **Propuesta de Implementación**:
  - **Backend (Orden predeterminado)**: Modificar la consulta principal de certificaciones en [certificationsController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/certificationsController.ts) para cambiar el orden predeterminado a la fecha de vencimiento más próxima a la fecha actual (`expirationDate: 1`), priorizando las que requieren renovación urgente en las revisiones.
  - **Frontend (Filtro de Usuario)**: Agregar un combobox dinámico en el formulario de filtros de [certifications-list.component.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/certif-app/src/app/features/certifications/certifications-list/certifications-list.component.ts) para seleccionar a un usuario por su nombre. Este listado se poblará dinámicamente mediante el servicio de usuarios (disponible para roles con privilegios adecuados). Por defecto, el filtro se mantendrá vacío (mostrando todos los colaboradores).

---

### [ISS-024] Revisión del inicio de sesión con SSO (Azure AD / LDAP)

- **Código Afectado (Backend)**: [authController.ts](file:///c:/Workspace/certvault/backend/src/controllers/authController.ts) (función `adLogin`, líneas ~890-1020).
- **Código Afectado (Frontend)**: [login.component.ts](file:///c:/Workspace/certvault/certif-app/src/app/features/auth/login/login.component.ts) (`loginWithAzure`, líneas ~233-252).
- **Hallazgos de la revisión preliminar**:
  - **El `idToken` de Azure AD no se valida criptográficamente**: `adLogin` usa `jwt.decode(idToken)`, que únicamente deserializa el payload sin verificar la firma contra las claves públicas (JWKS) de Microsoft Entra ID. La única comprobación es que el claim `tid` coincida con el tenant configurado, dato que viaja dentro del mismo token no verificado. En la práctica, cualquiera que conozca el endpoint puede autenticarse como cualquier correo corporativo enviando un JWT fabricado.
  - **El flujo SSO del frontend es una simulación**: `loginWithAzure()` no ejecuta un redirect OAuth2/OIDC real; solicita el correo mediante `prompt()` y construye un token ficticio (`mock-jwt-azure-sso-token-for-...`). No existe integración con MSAL ni obtención real de tokens.
  - **Fallback de LDAP degradable a modo simulado**: ante cualquier error de conexión LDAP, el `catch` entra en modo simulación si `NODE_ENV !== 'production'`, aceptando credenciales sin contactar al Directorio Activo. Depender de una variable de entorno como único freno es frágil.
  - **Aprovisionamiento JIT sobre identidad no verificada**: al crearse el usuario automáticamente (ISS-005) a partir de los claims del token, un token falsificado no solo permite el acceso, sino que crea cuentas persistentes en la base de datos.
- **Propuesta de Implementación**:
  - **Backend**: Reemplazar `jwt.decode` por `jwt.verify` con validación de firma vía JWKS remoto (`jwks-rsa`) contra `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys`, validando además `iss`, `aud` (client ID de la aplicación registrada), `exp` y `nbf`. Rechazar el token ante cualquier fallo, sin rutas alternativas.
  - **Backend (LDAP)**: Eliminar el modo simulado del `catch` o aislarlo tras un flag explícito de configuración (`ldapSimulationEnabled`) que nunca se active por omisión, devolviendo `401` en cualquier otro caso.
  - **Frontend**: Sustituir la simulación por el flujo OIDC real usando `@azure/msal-angular` (Authorization Code + PKCE), enviando al backend el `idToken` genuino emitido por Entra ID.
  - **Testing**: Suite de regresión que verifique el rechazo de tokens con firma inválida, tenant distinto, expirados y de audiencia incorrecta.

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



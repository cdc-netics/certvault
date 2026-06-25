# Changelog - CertVault

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se encuentra actualmente en fase de **versiones Beta**.

## [2.3.0-beta] - 2026-06-25 17:25

### Añadido
- **ISS-010 y ISS-011: Departamentos y Cargos Dinámicos:**
  - Creación del modelo independiente `Department` y el modelo `Position` (Cargos) en Mongoose con referencias de `ObjectId` en usuarios y certificaciones en reemplazo de strings estáticos.
  - Implementación de la utilidad `resolveEntities` para buscar o crear dinámicamente departamentos y cargos al vuelo de forma case-insensitive.
  - Endpoint `PATCH /api/users/bulk-department` para asignación de departamentos masiva.
  - Script de migración automática de datos ejecutado al arrancar el servidor backend para normalizar registros previos.
- **ISS-012: Panel de Gestión de Departamentos:**
  - Pestaña CRUD interactiva en `/settings/departments` con tarjetas visuales, estados activos/inactivos y selección de líderes.
  - Lógica bidireccional de promoción a rol `LIDER` e inclusión/remoción automática en el array `managedDepartments` al actualizar directores de área.
- **ISS-013: Vista de Certificaciones en Perfil:**
  - Pestaña "Mis Certificaciones" en la vista `/profile` con listado compacto, modal interactivo de detalles y descarga de adjuntos en línea.
- **ISS-014 e ISS-015: Certificaciones Organizacionales y de Compliance:**
  - Propiedades `isOrganizational`, `applicableDepartments` y `appliesToAllCompany` en certificaciones, con validación condicional de Mongoose (opcionalidad de empleado si aplica a la organización).
  - Formularios de creación y edición actualizados en el frontend con switches de alcance y selección múltiple de departamentos.
  - Control de accesos de descarga física de adjuntos restringido a administradores, creadores o miembros de áreas aplicables.
  - Habilitada actualización de compliance global para todos los líderes de departamentos del sistema.
- **ISS-016: Flexibilidad en Departamentos sin Líderes:**
  - Permitida la desvinculación a nulo (`leaderId: null`) de líderes, degradando al usuario anterior automáticamente a rol `reader` si ya no gestiona más áreas.
- **ISS-017: Respaldos Locales Automáticos y Rotativos:**
  - Rutina cron diaria para la creación física de respaldos ZIP completos (Base de datos + archivos adjuntos) en `backend/backups/`.
  - Rotación física automatizada en disco del servidor reteniendo únicamente los últimos 10 archivos.
  - Endpoints del administrador para listar, descargar (con protección rigurosa ante Path Traversal) y eliminar respaldos físicos del servidor.
  - Panel visual de auto-backup en el frontend (`/settings/backups`) con switch, frecuencia configurable, metadatos y tabla interactiva.
- **Suite de Verificación y QA:**
  - Diseñado e implementado el script de QA y verificación automatizada `backend/src/scripts/qa-verify.ts` que valida de forma empírica todas las reglas de negocio del backend y base de datos con un 100% de éxito.

### Modificado
- **Control de Eliminación Organizacional:**
  - Borrado de certificaciones de área restringido estrictamente al creador del registro y a administradores de CertVault.
- **Tipado del Frontend:**
  - Modificado el modelo de datos `certification.model.ts` en Angular para soportar las nuevas propiedades de alcance corporativo.

### Corregido
- **Validaciones de TypeScript:**
  - Corregidos errores de tipos y de asignación en los controladores y servicios del backend y frontend garantizando una compilación libre de warnings.

## [2.2.1-beta] - 2026-05-31 16:30

### Modificado
- **Robustecimiento y Aislamiento de MongoDB (docker-compose.yml):**
  - Incorporación de `start_period: 120s` para otorgar un margen de tiempo extendido a 2 minutos en inicios tras apagados no limpios, garantizando que WiredTiger complete la recuperación de datos sin marcar el contenedor como `unhealthy` incluso bajo condiciones críticas de disco.
  - Ajuste de `interval: 20s` y `timeout: 10s` para optimizar el rendimiento, disminuir la frecuencia de ejecución de `mongosh` y mitigar los logs repetitivos de accesos no autenticados.
  - Aislamiento completo de MongoDB a la red interna de Docker (`expose` en lugar de `ports`), resolviendo de forma definitiva las colisiones de puertos con la instancia de MongoDB nativa activa en el host (ISS-002).
- **Permisos de Lectura y Descarga de Certificaciones (certificationsController.ts):**
  - Se habilitó la lectura y descarga de archivos de certificados a todos los usuarios autenticados del sistema de manera global, eliminando las restricciones departamentales previas en el acceso de solo lectura.
- **Estrategia de Despliegue y Rollback en CI/CD (deploy.yml):**
  - Se mejoró el paso de sanitización en el host para identificar y remover automáticamente cualquier contenedor Docker que esté ocupando los puertos `80`, `443` o `27017` (`docker rm -f $(docker ps -q --filter "publish=...")`), prescindiendo por completo de comandos `sudo` interactivos o restrictivos en el runner.
  - Se estructuró el flujo para detener y remover de forma limpia el stack completo en producción (`docker compose down`) al inicio del pipeline (paso de sanitización), liberando todos los puertos y sockets físicos antes de realizar compilaciones y construcciones de nuevas imágenes.
  - Se actualizó la acción de checkout a `actions/checkout@v6` para ejecutarse de manera nativa sobre Node 24, eliminando por completo las advertencias de deprecación de Node 20 sin necesidad de usar variables de forzado.
  - Se corrigió la escritura de `.env` usando comillas simples (`echo '...'`) en el workflow para evitar que Bash expanda y vacíe las referencias a variables como `$APP_HOST` contenidas en los secretos.
- **Aislamiento de Puertos del Proxy Inverso (docker-compose.yml):**
  - Se eliminó por completo el mapeo del puerto HTTP `80` hacia el host en el servicio `reverse-proxy` (`certvault-proxy`), aislando la exposición del proxy únicamente al puerto seguro HTTPS `443` (mapeado mediante `FRONTEND_PORT`). Esto previene de forma definitiva cualquier colisión con servidores web nativos u otros servicios escuchando en el puerto 80 del host.

### Corregido
- **Mecanismo de Reintentos de Conexión en Backend (database.ts):**
  - Implementación de un ciclo de reintentos automático de conexión a nivel de Mongoose. El backend ahora realiza hasta 5 intentos con intervalos de 5 segundos en lugar de ejecutar un cierre inmediato del proceso (`process.exit(1)`) ante demoras iniciales de MongoDB.
- **Privilegios de Actualización de Certificaciones (certificationsController.ts):**
  - Se independizó y robusteció la validación de escritura al modificar una certificación, garantizando que solo el propietario original, administradores o líderes del departamento correspondiente puedan actualizar los registros, previniendo alteraciones no autorizadas.
- **Visualización de Versión en Pantalla de Login (login.component.ts):**
  - Se eliminó el texto de versión estático y desactualizado en el login del frontend, reemplazándolo por una variable de componente reactiva (`appVersion`) vinculada dinámicamente con la versión actual de la entrega (`2.2.1-beta`).
- **Prueba de Salud del Backend en CI/CD (deploy.yml):**
  - Se adaptó el paso de comprobación de salud del backend para ejecutarse internamente dentro del contenedor (`docker exec` con Node.js) en lugar de una llamada directa con `curl` hacia el localhost. Esto previene que el despliegue falle debido a que el puerto de desarrollo del backend (`3000`) no está expuesto públicamente en el host de producción.
- **Sanitización de Expresiones Regulares en Búsquedas (certificationsController.ts):**
  - Se implementó el escape de caracteres especiales de expresiones regulares en las cadenas de entrada del usuario en las funciones de búsqueda y autocompletado del backend, mitigando vulnerabilidades de inyección NoSQL y ataques de denegación de servicio (ReDoS).

### Eliminado
- **Procesos nativos en el servidor host:**
  - Desinstalación definitiva de servicios nativos (`nginx` y `mongodb-org`) que colisionaban con el entorno Docker de CertVault (puertos 80, 443 y 27017). Se centralizó toda la base de datos y proxy en contenedores aislados.

## [2.2.0-beta] - 2026-05-29 03:40

### Añadido
- **Autenticación integrada con Active Directory (ISS-005):**
  - Soporte completo para inicios de sesión únicos corporativos mediante LDAP y Azure AD.
  - Implementación de un panel de configuración dinámica de Directorio Activo en la UI de ajustes de seguridad (`/settings/security`) con validaciones de formato (UUID para Azure) y un botón de pruebas de conexión TCP de red integrado hacia el servidor.
  - Creación del módulo de criptografía simétrica (`crypto.ts`) bajo algoritmo `aes-256-cbc` para encriptar contraseñas de enlace LDAP y secretos de cliente de Azure AD al persistir en MongoDB, enmascarándolos a `'******'` al recuperarlos.
  - Implementación de aprovisionamiento Just-in-Time (JIT) para usuarios inexistentes validados en el AD con rol predeterminado de solo lectura (`READER`), forzando el registro de su correo personal y firma de términos y condiciones en su primer login.
- **Endpoint de Emisores Únicos (ISS-006):**
  - Creación de ruta `GET /api/certifications/providers` que consulta todos los proveedores únicos en la base de datos de manera directa y optimizada.

### Modificado
- **Normalización del Emisor/Plataforma (ISS-006):**
  - Implementación de normalización case-insensitive al crear o actualizar certificaciones para unificar variantes duplicadas (ej. 'BeyondTrust' vs 'beyondtrust').
  - Incorporación de un script de unificación masiva en el arranque del servidor backend (`server.ts`) para normalizar registros preexistentes a la variante dominante (moda) de cada proveedor.
  - Actualización del frontend para obtener las opciones del filtro de proveedores directamente del backend en lugar de extraerlos de la paginación local.
  - Normalización e inspección case-insensitive en la lista de proveedores devuelta por el API (`getProviders`) y en las consultas de búsqueda/filtros del backend para evitar duplicados en la interfaz y garantizar compatibilidad con datos inconsistentes preexistentes.
- **Control de Accesos en Eliminación (ISS-007):**
  - Restricción del endpoint de borrado de certificaciones en el backend para permitir la operación exclusivamente a su propietario, a un administrador global, o al líder de área asignado al departamento correspondiente.
  - Condicionamiento visual del botón "Borrar" en el frontend mediante validación lógica individual por cada certificado.

### Corregido
- **Ajustes de QA en Compilación:**
  - Tipado explícito de parámetros en callbacks de `ldapjs` y uso de `// @ts-ignore` en importaciones dinámicas para corregir fallos con `noImplicitAny` y dependencias faltantes en desarrollo.
  - Corrección de unificación de moda en `server.ts` con operador de coalescencia nula para resolver advertencias de variables posiblemente indefinidas (`noUncheckedIndexedAccess`).
  - Resolución de la advertencia `NG8107` en el compilador de Angular reemplazando opcionales redundantes en directivas HTML (`selectedCertification.tags?.length` por `selectedCertification.tags.length`).

---

## [2.1.0-beta] - 2026-05-28 09:30

### Añadido
- **Alertas de Vencimiento de Certificados por Correo (ISS-004):**
  - Implementación de un servicio cron diario `checkCertificateExpirationAlerts` que evalúa los certificados de los usuarios y despacha alertas automáticas por correo electrónico a los 60, 30, 15 y 3 días restantes de vigencia.
  - Función `sendCertificateExpirationWarningEmail` en el servicio de correo (`emailService.ts`) con plantilla HTML en español.
  - Interruptor toggle global en la interfaz `/settings/security` para habilitar o deshabilitar estas alertas.
- **Acciones y Errores en Logs de Auditoría (ISS-003):**
  - Nuevas acciones de auditoría en `AuditAction` (`view`, `view_failed`, `download`, `download_failed`, `error`).
  - Registro automático en el middleware de auditoría cuando un usuario visualiza o descarga un certificado, o cuando ocurre cualquier error HTTP (código `>= 400`).
  - Filtros y visualización de colores (badges) adaptados para estos nuevos logs en el panel de auditoría del frontend (`/settings/audit`).

### Modificado
- **Logs de Auditoría en Proxy Nginx (ISS-003):**
  - Se configuró la persistencia de logs en el host mapeando el volumen `./logs/nginx:/var/log/nginx` en `docker-compose.yml`.
  - Se definió un formato detallado `audit_detailed` en `nginx.conf` para capturar IP real, tiempos de respuesta, Host y protocolo/cifrado SSL.
- **Renombramiento de Servicios de Cron:**
  - Se centralizó el inicio de los servicios cron renombrando `startPasswordExpirationCron` a `startCronServices` para ejecutar el control diario de claves y certificados conjuntamente.

---

## [2.0.0-beta] - 2026-05-27 18:00

### Añadido
- **Proxy Inverso para HTTPS/SSL:** Incorporación de un contenedor Nginx (`reverse-proxy`) en `docker-compose.yml` que actúa como proxy inverso en el puerto seguro estándar `443` y redirige el tráfico HTTP (puerto `80`) a HTTPS.
- **Directorio de Certificados (`certs/`):** Creación del directorio local `certs/` en la raíz del proyecto para el almacenamiento seguro de los certificados TLS corporativos (`certvault-fullchain.pem` y `certvault.key`).
- **Control de Issues y Mejoras (`issues.md`):** Creación del archivo `issues.md` en la raíz para el seguimiento formal de vulnerabilidades, auditorías y mejoras de código pendientes.

### Modificado
- **Puertos de Producción por Defecto:** Configuración de `FRONTEND_PORT=443` para HTTPS y `MONGO_PORT=27017` para MongoDB en el archivo `.env` y `.env.example`, eliminando puertos no estándar de las URLs públicas (`FRONTEND_URL`, `PUBLIC_API_BASE_URL` y `ALLOWED_ORIGINS`).
- **Aislamiento de Red del Frontend:** Remoción de la exposición directa de puertos al host para el contenedor `certvault-frontend`, configurándolo con `expose` interno en el puerto `80` para forzar todo el tráfico a través del proxy seguro.

### Corregido
- **Propagación del Protocolo SSL (QA Fix):** Implementación de una directiva `map` en la plantilla de Nginx del frontend (`certif-app/nginx.conf.template`) para propagar correctamente el header `X-Forwarded-Proto` (HTTPS) desde el proxy externo hacia el backend en Express, evitando fallos con cookies de sesión y tokens JWT.
- **Resolución de Nombres en el Arranque (DevOps Hotfix):** Configuración del resolvedor DNS interno de Docker (`127.0.0.11`) y uso de variables en el `proxy_pass` del proxy inverso Nginx para evitar caídas en el inicio (`host not found in upstream`) si el contenedor del frontend tarda en inicializarse.

---

## [1.9.0-beta] - 2026-05-26 23:45

### Añadido
- **Resiliencia en Registro de Usuarios:** Tolerancia a fallos SMTP en el registro (`/api/auth/register`); si el servidor de correo no está disponible, se completa la creación del usuario (código `201`) y se registra el enlace de activación en la consola para facilitar el testing.
- **Acceso para Rol Lector (`READER`):** Habilitada la visualización y descarga de certificados del mismo departamento para usuarios con rol `READER`, manteniendo el bloqueo a las opciones de edición y eliminación.
- **Diseño Mejorado en Plantillas de Correo:** Rediseño de las plantillas de correo (`reset-password.html` y `verify-email.html`) con estilo responsivo, botón principal de acción y enlace alternativo en texto plano para copiar y pegar.
- **Exclusión de Seguridad para Administrador de Semilla:** Excepción automática para el usuario configurado en `ADMIN_EMAIL` (`.env`) que omite la obligatoriedad del cambio de contraseña (`mustChangePassword`) y la aceptación de términos (`termsAccepted`) para evitar bloqueos en el usuario de prueba.

### Corregido
- **Visualización de Errores de Validación:** Propagación en el frontend de los mensajes de error detallados del backend en el registro, incluyendo feedback sobre la fortaleza de contraseña (mayúsculas, minúsculas, números).
- **Generación de Enlaces de Correo Dinámicos:** Modificación en la resolución de URLs en el backend para obtener dinámicamente el protocolo (`http` o `https`) y el host desde la petición (`req`), resolviendo problemas de conexión al usar múltiples URLs en `FRONTEND_URL`.
- **Control de Modal de Términos:** Ajuste en el frontend para forzar la visualización del modal de términos y condiciones en usuarios cuya firma no se ha registrado, exceptuando páginas críticas como inicio de sesión o cambio forzado de contraseña.
- **Prevención de Error 500 en Login (Cuentas Heredadas):** Uso de `validateBeforeSave: false` en los autoguardados del inicio de sesión del backend, previniendo fallos en cuentas antiguas por campos obligatorios añadidos posteriormente (como `personalEmail`).
- **Eliminación y Respaldo Completo de Certificaciones:** Corrección en el borrado de usuarios donde la búsqueda de certificaciones ahora consulta por coincidencia de nombre y departamento (`employeeName` y `department`), asegurando la exportación de todos los registros asociados en el respaldo.
- **Inicialización del Servicio de Correo:** Remoción del método bloqueante `transporter.verify()` al instanciar el servicio SMTP para evitar demoras y bloqueos de red en el arranque del servidor.

---

## [1.8.0-beta] - 2026-05-26 20:15

### Añadido
- **Términos y Condiciones de Uso:**
  - Modal bloqueante en el frontend (`TermsModalComponent`) que obliga a la lectura completa (mediante validación de scroll vertical) antes de habilitar la aceptación.
  - Endpoint `POST /api/auth/accept-terms` en el backend para almacenar de forma persistente la fecha y firma del acuerdo.
  - Propiedades `termsAccepted` (booleano) y `termsAcceptedAt` (fecha) en la base de datos de usuarios.
  - Mecanismo de migración automática (backfill) en el arranque del servidor para inicializar el estado de aceptación en usuarios preexistentes.
- **Flujo de Cambio de Contraseña Forzado:**
  - Componente de interfaz de usuario `/force-password-change` para la renovación obligatoria de credenciales.
  - Captura y actualización del correo personal si este no se encuentra registrado o coincide con el de la empresa.
- **Actualización de pnpm:**
  - Se actualizó el gestor de paquetes de la versión `10.22.0` a la última versión estable `11.3.0` tanto en los archivos de configuración (`package.json`) como en los entornos de empaquetado de Docker (`Dockerfile`) de backend y frontend.

### Corregido
- **Detección de Variables en Reset:** Solucionado un bug en el backend (`authController.ts`) que causaba `ReferenceError` al intentar actualizar el correo personal durante el restablecimiento de contraseñas.
- **Tipado de Mongo:** Corregida incompatibilidad de tipos entre `Schema.Types.ObjectId` y `Types.ObjectId` en el guardado del modificador de las configuraciones de seguridad.
- **Aceptación de Términos y Condiciones:** Modificado el método de guardado en el backend para utilizar `User.updateOne` en lugar de `user.save()`. Esto previene fallos por validaciones de campos no modificados (como correos personales idénticos a corporativos en cuentas heredadas) que impedían guardar la firma.
- **Flujo de Activación del Modal:** Se reestructuró la lógica en el frontend para que el modal de términos y condiciones aparezca de manera exclusiva inmediatamente después de realizar un cambio exitoso de contraseña, y solo si el usuario nunca ha firmado los términos, evitando bloqueos invasivos al iniciar sesión en entornos cotidianos.

---

## [1.7.0-beta] - 2026-05-26 17:35

### Añadido
- **Políticas de Seguridad y Expiración:**
  - Nueva colección y esquema de base de datos `SecuritySettings` para habilitar la expiración periódica de claves de acceso por meses.
  - Panel de administración reactivo en la ruta `/settings/security` para configurar las políticas de seguridad.
  - Servicio cron diario en segundo plano (`cronService.ts`) que evalúa la antigüedad de las claves de los usuarios y despacha alertas automáticas por correo electrónico a los 15, 10, 5, 3 y 1 días restantes de vigencia.
- **Acción Masiva de Administrador:**
  - Endpoint `POST /api/users/force-password-change` para forzar el cambio de clave masivo a una lista de IDs de usuario.
  - Checkboxes y botón de selección masiva en la lista de usuarios del frontend para forzar la expiración inmediata de cuentas.
  - Control de exclusión para evitar que el administrador inicie un forzado sobre su propia cuenta.
- **Auditoría e Integridad de Datos en Borrado:**
  - Logueo explícito de diagnósticos e informes SMTP directamente en el módulo `/settings/audit`.
  - Historial de eventos enriquecido con metadata (recipiente de respaldo, cantidad de certificaciones adjuntas y estado de la entrega física).

### Corregido
- **Casteo de Backups (Bug Raíz):** Corregido el importador de datos en `backupService.ts` que guardaba referencias y fechas de certificados como cadenas de texto en lugar de tipos nativos `ObjectId` y `Date` de MongoDB.
- **Ruta de Adjuntos de Correo:** Se reemplazó la resolución basada en `__dirname` por `process.cwd()` en la localización de los adjuntos PDF, solucionando fallas de reenvío silencioso de respaldos al eliminar usuarios.
- **Validación de Email Personal:** Restricción reactiva y validación en el esquema del usuario para forzar el ingreso de un correo personal de portabilidad diferente al correo corporativo.

---

## [1.0.0-beta] - 2026-05-22 13:30

### Añadido
- Inicialización del proyecto CertVault.
- Gestión de certificaciones, roles RBAC y asignación de departamentos.
- Módulo SMTP y configurador de backups inicial.

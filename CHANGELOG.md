# Changelog - CertVault

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se encuentra actualmente en fase de **versiones Beta**.

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

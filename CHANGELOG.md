# Changelog - CertVault

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se encuentra actualmente en fase de **versiones Beta**.

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

# Control de Issues y Mejoras del Proyecto

Este documento registra los problemas, vulnerabilidades, mejoras y tareas técnicas del proyecto, clasificadas por su estado.

## Issues Pendientes (To Do)

| ID | Título | Prioridad | Componente | Descripción Completa |
|---|---|---|---|---|
| **ISS-002** | Exposición de MongoDB sin TLS | Media | Base de Datos | MongoDB está expuesto en el puerto `27017` en el host de producción, lo que permite conexiones externas directas. Si el host no tiene firewall perimetral, la base de datos podría quedar expuesta a la red sin cifrado de transporte. |
| **ISS-005** | Autenticación integrada con Active Directory (AD) | Media | Backend / Frontend | Agregar opción de inicio de sesión único (SSO) con "Netics AD" (Azure AD o LDAP). Debe poder configurarse dinámicamente por el administrador en la vista de ajustes de seguridad `/settings/security` (Tenant ID, Client ID, URLs, etc.) de manera que los parámetros no queden fijos en archivos de entorno. Al ingresar por primera vez, se aprovisiona automáticamente como `READER`, solicitando su correo personal y firma de términos al concluir. |

## Issues Completados (Done)

| ID | Título | Componente | Fecha de Cierre | Resolución |
|---|---|---|---|---|
| **ISS-000** | Terminación SSL e HTTPS en Producción | Infraestructura | 27/05/2026 | Se incorporó un proxy inverso Nginx (`reverse-proxy`) en el puerto seguro `443` utilizando certificados locales en `certs/`. |
| **ISS-001** | Pérdida de cabecera segura en ruteo (QA Fix) | Frontend / Nginx | 27/05/2026 | Se corrigió el Nginx del frontend usando un mapeo dinámico para propagar correctamente `X-Forwarded-Proto` (HTTPS) hacia Express. |
| **ISS-003** | Falta de Logs de Auditoría en Proxy | Infraestructura | 28/05/2026 | Se creó un volumen persistente para guardar los logs de Nginx y se enriqueció el formato de logging con detalles de red y TLS. Además, se extendió el logging de auditoría a nivel de aplicación para capturar visualizaciones, descargas y errores del sistema, con soporte de filtrado en la interfaz. |
| **ISS-004** | Alerta de vencimiento de certificado por correo | Backend / Frontend | 28/05/2026 | Se implementó el servicio de envío de correos ante el vencimiento de certificados a los 60, 30, 15 y 3 días de expirar. Se programó la evaluación automática en un servicio cron y se añadió un toggle global en el panel de seguridad del Front-end. |

---

## Análisis de Código y Sugerencias de Mejora

### [ISS-002] Exposición de MongoDB sin TLS
* **Código Afectado**: [docker-compose.yml](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/docker-compose.yml#L6-L7)
  ```yaml
  ports:
    - "${MONGO_PORT}:27017" # Puerto expuesto en el host
  ```
* **Sugerencia de Mejora**:
  Si la base de datos solo debe ser accedida por el backend, se recomienda remover la directiva `ports` y usar únicamente `expose: - "27017"` para mantener el puerto oculto de la red pública. Si se requiere acceso externo (por ejemplo, para administración), se sugiere configurar autenticación de usuarios y habilitar cifrado de transporte TLS nativo en MongoDB montando certificados dedicados en el contenedor de base de datos.

---

### [ISS-003] Falta de Logs de Auditoría en Proxy
* **Código Afectado**: [docker-compose.yml](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/docker-compose.yml#L48-L60) y [nginx/nginx.conf](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/nginx/nginx.conf)
* **Sugerencia de Mejora**:
  Crear una carpeta `logs/nginx/` en la raíz del proyecto y montarla como volumen en el contenedor del proxy (`./logs/nginx:/var/log/nginx`). Adicionalmente, definir en la configuración de Nginx los formatos personalizados de logs que registren la IP real del cliente (`$http_x_forwarded_for`) para auditoría y correlación de eventos en un SIEM.

---

### [ISS-004] Alerta de vencimiento de certificado por correo
* **Código Afectado**:
  - **Backend (Modelo)**: [backend/src/models/SecuritySettings.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/SecuritySettings.ts)
  - **Backend (Servicio)**: [backend/src/services/cronService.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/services/cronService.ts)
  - **Frontend (Vista)**: `certif-app/src/app/features/settings/security-settings/security-settings.component.ts` (potencial modificación)
* **Sugerencia de Mejora**:
  1. **Modelo**: Añadir el campo booleano `certificateExpirationAlertsEnabled: { type: Boolean, required: true, default: true }` a `ISecuritySettings` en [SecuritySettings.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/SecuritySettings.ts).
  2. **Cron Service**: Crear la función `checkCertificateExpirationAlerts` en [cronService.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/services/cronService.ts) para buscar los certificados próximos a expirar (`daysRemaining` en `[60, 30, 15, 3]`) y enviar un correo de advertencia llamando a un nuevo método en `emailService.ts`.
  3. **Frontend**: Añadir un switch toggle en el componente `/settings/security` que se enlace con esta propiedad de la base de datos para permitir que el administrador active o desactive la notificación de manera global.

---

### [ISS-005] Autenticación integrada con Active Directory (AD)
* **Código Afectado**:
  - **Backend (Rutas/Controladores)**: [backend/src/routes/auth.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/routes/auth.ts) y [backend/src/controllers/authController.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/controllers/authController.ts)
  - **Frontend (Login)**: `certif-app/src/app/features/auth/login/login.component.ts` (HTML y TS)
* **Sugerencia de Mejora**:
  Existen dos formas principales de integrar Active Directory según el tipo de infraestructura:
  1. **LDAP Local (On-Premise)**: Si se trata de un Active Directory tradicional hospedado de forma local, se utiliza el protocolo LDAP. En el Backend, se puede usar la librería `ldapjs` o `passport-ldapauth`. Al recibir las credenciales, el backend se conecta al servidor AD corporativo para validar el usuario y contraseña.
  2. **Azure AD / Microsoft Entra ID (Nube)**: Si la empresa utiliza Microsoft 365 / Azure, se implementa mediante el protocolo estándar OpenID Connect (OIDC) / OAuth2. En el Frontend (Angular) se instala la librería oficial de Microsoft `@azure/msal-angular` para redirigir al usuario al portal oficial de Microsoft. Tras autenticarse, Microsoft devuelve un ID Token (JWT) que el frontend envía al backend corporativo para validar su firma y autenticidad usando `passport-azure-ad` o verificando el token con la clave pública de Microsoft.
  
  **Aprovisionamiento automático JIT (Just-In-Time)**:
  - Cuando el backend reciba la confirmación del AD de que el usuario es válido, se buscará al usuario en la base de datos por su correo o nombre de usuario.
  - Si el usuario **no existe**, el backend lo creará en la base de datos de manera automática con las propiedades:
    - `role`: `'reader'` (Acceso de solo lectura por defecto).
    - `termsAccepted`: `false` (Fuerza la firma del modal de términos).
    - `personalEmail`: `""` o `null` (Lo que obligará al flujo de inicio de sesión a solicitarle que ingrese su correo personal).
  - Al completar el primer ingreso exitoso, el frontend detectará que no tiene correo personal configurado o que no ha aceptado los términos, forzando la redirección al modal/formulario correspondiente.

  **Configuración Dinámica desde el Panel**:
  - Para evitar configuraciones estáticas en archivos de entorno, se extenderá la colección `SecuritySettings` en [SecuritySettings.ts](file:///c:/Users/despinoza/OneDrive%20-%20synet%20spa/Hola/Proyectos/certvault/backend/src/models/SecuritySettings.ts) para almacenar:
    - `adLoginEnabled`: booleano para activar/desactivar la opción en el login.
    - `adProvider`: tipo de proveedor (`'ldap'` o `'azure'`).
    - **Campos Azure AD**: `azureTenantId`, `azureClientId`, `azureClientSecret`.
    - **Campos LDAP**: `ldapUrl`, `ldapBaseDN`, `ldapBindDN`, `ldapBindPassword`.
  - El backend expondrá estos campos de manera segura (encriptando campos sensibles como secretos o contraseñas utilizando la llave `SMTP_ENCRYPTION_KEY` antes de guardarlos en MongoDB).
  - En el frontend, se añadirá una sección "Configuración de Directorio Activo" en `/settings/security` visible solo para administradores, la cual mostrará los campos según el proveedor seleccionado y un botón para probar la conexión con el servidor AD.

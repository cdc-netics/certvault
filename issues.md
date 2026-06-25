# Control de Issues y Mejoras del Proyecto

Este documento registra los problemas, vulnerabilidades, mejoras y tareas técnicas del proyecto, clasificadas por su estado.

## Issues Pendientes (To Do)

_No hay issues pendientes registrados._

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



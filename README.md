# CertVault – Sistema de Gestión de Certificaciones Enterprise

**CertVault** es una plataforma corporativa robusta diseñada para el registro, almacenamiento, control y portabilidad de certificaciones profesionales de los colaboradores. Desarrollado con una arquitectura moderna de microservicios, proporciona una administración centralizada y ágil para el departamento de TI y las jefaturas de la organización.

---

## 🚀 Ajustes Rápidos de Implementación (Quickstart con Docker)

La infraestructura de producción está completamente contenerizada. Sigue estos 3 pasos rápidos para levantar todo el sistema:

### Paso 1: Configurar el Entorno
Copia la plantilla de variables de entorno y ajusta las credenciales SMTP, JWT y MongoDB:
```bash
cp .env.example .env
```

### Paso 2: Compilar e Iniciar Servicios
Utiliza Docker Compose para construir las imágenes sin caché del Backend (Node) y Frontend (Nginx/Angular), y levantar el entorno:
```bash
docker compose build --no-cache && docker compose up -d
```

### Paso 3: Acceder al Sistema
Una vez listos los contenedores, el sistema estará accesible en:
* **Frontend Web:** [http://localhost:8080](http://localhost:8080)
* **API Health Check:** [http://localhost:8080/api/health](http://localhost:8080/api/health)

---

## 🔑 Credenciales por Defecto (Seed Inicial)

Al iniciar el sistema por primera vez, se inyectará el usuario administrador con las credenciales por defecto (configuradas en tu `.env`):
* **Usuario:** `admin` (o el valor de `ADMIN_USERNAME`)
* **Email:** `admin@empresa.com` (o el valor de `ADMIN_EMAIL`)
* **Contraseña:** `Admin123!` (o el valor de `ADMIN_PASSWORD`)

> [!WARNING]
> Es de carácter obligatorio cambiar la contraseña y verificar la validez del correo personal de respaldo del administrador tras el primer inicio de sesión.

---

## 🔐 Configuración del Inicio de Sesión Corporativo (SSO)

CertVault admite dos proveedores de directorio, excluyentes entre sí: **Microsoft Entra ID** (Azure AD) mediante OpenID Connect, y **LDAP** contra un Directorio Activo propio. Ambos se habilitan desde `Configuración → Seguridad` en la interfaz de administración; no requieren variables de entorno salvo lo indicado más abajo.

> [!IMPORTANT]
> El backend verifica criptográficamente el token que recibe del navegador. Si el App Registration no está correctamente declarado, el inicio de sesión se rechaza en lugar de degradarse: es el comportamiento esperado, no una falla de configuración.

### Opción A — Microsoft Entra ID (Azure AD)

**1. Registrar la aplicación en Entra ID**

En el portal de Azure, `Microsoft Entra ID → App registrations → New registration`:

| Campo | Valor |
|-------|-------|
| **Name** | `CertVault` (o el nombre que use la organización) |
| **Supported account types** | *Accounts in this organizational directory only* (single tenant) |
| **Redirect URI — plataforma** | **Single-page application (SPA)** |
| **Redirect URI — valor** | El origen público de CertVault, sin ruta: `https://certvault.netics.corp` |

> [!WARNING]
> La plataforma debe ser **SPA**, no *Web*. El flujo usa Authorization Code + PKCE desde el navegador; un registro de tipo *Web* espera un secreto de cliente y rechazará la autenticación con `AADSTS9002326`.

Si el sistema se publica en más de un origen (por ejemplo IP interna y dominio corporativo), agrega **cada uno** como Redirect URI adicional.

**2. Configurar los permisos y claims**

En `API permissions`, verifica que estén concedidos los permisos delegados de Microsoft Graph `openid`, `profile` y `email` (vienen por defecto).

Los campos de departamento y cargo del usuario se toman de los claims `department` y `jobTitle`. No están incluidos en el token por defecto: para poblarlos automáticamente en el aprovisionamiento JIT, agrégalos en `Token configuration → Add optional claim → ID`. Si se omiten, el usuario se crea con `Sin Departamento` y `Colaborador`, valores editables después desde el panel.

**3. Cargar los identificadores en CertVault**

Desde `Configuración → Seguridad`, con perfil de administrador:

| Campo | Dónde obtenerlo |
|-------|-----------------|
| **Habilitar login por Directorio Activo** | Activar |
| **Proveedor** | `Azure` |
| **Tenant ID** | `Overview → Directory (tenant) ID` del App Registration |
| **Client ID** | `Overview → Application (client) ID` del App Registration |

El **secreto de cliente no es necesario** y no debe cargarse: una aplicación de página única no puede custodiar secretos, y el flujo PKCE no los usa.

**4. Verificar**

Cierra sesión y abre la pantalla de login. El botón *Cuenta Corporativa Microsoft* solo se renderiza si el Tenant ID y el Client ID están cargados. Al pulsarlo debe abrirse la ventana de Microsoft, y tras autenticarte, CertVault crea la cuenta con rol `READER` y solicita aceptar los términos y registrar un correo personal de respaldo.

**Qué valida el backend.** Cada token se comprueba contra las claves públicas del tenant (`https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys`): firma `RS256`, emisor, audiencia igual al Client ID, vigencia y correspondencia de tenant. Un fallo en cualquiera de esos puntos responde `401`.

### Opción B — LDAP / Directorio Activo

Desde `Configuración → Seguridad`, seleccionando el proveedor `LDAP`:

| Campo | Ejemplo |
|-------|---------|
| **URL del servidor** | `ldap://dc01.empresa.corp:389` (o `ldaps://…:636`) |
| **Base DN** | `dc=empresa,dc=corp` |
| **Bind DN** | `cn=svc_certvault,ou=Servicios,dc=empresa,dc=corp` |
| **Contraseña del Bind DN** | Se almacena cifrada con AES-256-CBC en la base de datos |

La cuenta de servicio del Bind DN solo necesita permisos de **lectura** sobre la rama consultada. La validación de la contraseña del usuario se hace mediante un *bind* secundario con sus propias credenciales, que nunca se almacenan.

El usuario se busca por `mail` o `userPrincipalName`, y su perfil se mapea desde los atributos `givenName`/`cn`, `sn`, `department` y `title`.

**Modo simulado (solo desarrollo).** La variable `LDAP_SIMULATION_ENABLED=true` permite probar el flujo sin un servidor LDAP disponible, aceptando cualquier contraseña distinta de `error`. Requiere activación explícita y **nunca se habilita con `NODE_ENV=production`**. Debe permanecer en `false`.

### Aprovisionamiento automático de cuentas (JIT)

Con cualquiera de los dos proveedores, el primer inicio de sesión de un colaborador crea su cuenta local con rol `READER` y lo obliga a aceptar los términos de uso y registrar un correo personal de respaldo. La elevación de privilegios es siempre manual, desde el módulo de usuarios.

---

## 📎 Formatos de Archivo Admitidos

El tipo de archivo se valida contra una lista blanca y la extensión con la que se almacena se deriva de esa lista, nunca del nombre ni del tipo que declara el cliente.

| Uso | Formatos | Tamaño máximo | Variable |
|-----|----------|---------------|----------|
| Certificados | PDF, JPEG, PNG | 5 MB | `MAX_CERTIFICATE_FILE_SIZE` |
| Avatares | PNG, JPEG, WEBP, GIF | 2 MB | `MAX_AVATAR_FILE_SIZE` |

> [!NOTE]
> **SVG está excluido de forma deliberada.** Es el único formato de imagen que admite scripts embebidos, y los avatares se sirven como archivos estáticos.

> [!WARNING]
> **Al actualizar una instalación existente**, los archivos subidos antes de esta validación conservan su extensión original. Los certificados con una extensión fuera de la lista responden `415` en lugar de entregarse, pero **los avatares se siguen sirviendo como estáticos**. Revisa el directorio de avatares antes de dar por completo el despliegue:
> ```bash
> docker compose exec backend ls uploads/avatars | grep -viE '\.(png|jpg|jpeg|webp|gif)$'
> ```
> Cualquier archivo que aparezca en ese listado debe eliminarse y el avatar volverse a cargar.

---

## ✅ Verificación y Pruebas

Ambos proyectos incluyen suites de pruebas unitarias que deben pasar antes de desplegar:

```bash
# Backend — Jest
cd backend && pnpm test

# Frontend — Karma sobre Chrome headless
cd certif-app && pnpm test -- --watch=false --browsers=ChromeHeadless
```

La cobertura se concentra en la lógica sensible: verificación de tokens de Entra ID, resolución de las URLs de los correos, cifrado simétrico de secretos, saneamiento de nombres de archivo y validación de formatos de subida.

---

## 📁 Estructura General del Repositorio

```
certvault/
├── Docs/               # Manuales y documentación técnica detallada
├── backend/            # REST API y lógica de negocios (NodeJS + TypeScript)
├── certif-app/         # Aplicación Frontend web SPA (Angular 21)
├── docker-compose.yml  # Orquestador de contenedores (Mongo, Backend, Frontend)
├── CHANGELOG.md        # Bitácora de control de versiones y actualizaciones
└── README.md           # Guía de inicio rápido
```

---

## 📖 Documentación Detallada del Sistema

Para conocer a fondo el funcionamiento, despliegue y mantenimiento de CertVault, consulta los manuales especializados en la carpeta [Docs](./Docs):

* [📘 Manual de Despliegue en Producción](./Docs/deploy.md): Instrucciones completas para configurar volúmenes persistentes, redes de contenedores y puesta en marcha con Docker Compose.
* [📗 Flujo de Trabajo en Git y Reconstrucciones](./Docs/git-workflow.md): Ciclo de ramas Git Flow y procedimiento para aplicar recompilaciones automáticas tras cada `git pull` en producción.
* [📙 Especificación Técnica de la API REST](./Docs/api-spec.md): Detalle de endpoints, autenticación JWT, flujo de forzado masivo y aceptación interactiva de términos de uso.

---
*Desarrollado y mantenido por el departamento de Tecnología de la Información.*

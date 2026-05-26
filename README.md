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

## 📁 Estructura General del Repositorio

```
certvault/
├── Docs/               # Manuales y documentación técnica detallada
├── backend/            # REST API y lógica de negocios (NodeJS + TypeScript)
├── certif-app/         # Aplicación Frontend web SPA (Angular 17+)
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

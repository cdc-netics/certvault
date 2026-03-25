# Netics-CertiVault - Sistema de Gestión de Certificaciones Empresariales

### Netics-CertiVault
Sistema web para la gestión centralizada de certificaciones empresariales. Permite administrar, monitorear y hacer seguimiento de certificaciones técnicas y profesionales de empleados, con control de usuarios, roles y reportes.

### ¿Qué es este sistema?
Netics-CertiVault es una plataforma moderna que ayuda a empresas a organizar y controlar todas sus certificaciones internas y externas, facilitando la gestión documental, la trazabilidad y el cumplimiento normativo.

## ✨ Características Principales

### 🔐 Autenticación y Usuarios
- Login seguro con JWT (email o username)
- Administración de usuarios y roles (Admin, Líder, Técnico, Lector)
- Recuperación y cambio de contraseña con validación avanzada

### 📜 Gestión de Certificaciones
- CRUD completo de certificaciones
- Fechas de emisión y expiración, tipos, niveles, tecnologías y proveedores
- Asignación por empleado y departamento
- Certificaciones de usuarios desactivados quedan archivadas y solo visibles para administradores/líderes

### 📊 Dashboard y Reportes
- Panel de control con métricas y estadísticas
- Exportación de datos (CSV, Excel)
- Alertas de certificaciones próximas a expirar

### 🎨 Interfaz Moderna
- UI responsiva (Angular 17+, Bootstrap 5)
- Filtros avanzados, paginación y búsqueda
- Accesibilidad y experiencia de usuario mejorada

---

## 🛠️ Tecnologías

- **Backend:** Node.js + TypeScript + Express + MongoDB (Mongoose)
- **Frontend:** Angular 17+, Bootstrap 5, RxJS
- **Seguridad:** JWT, bcryptjs, Helmet, validación robusta

---

## 📁 Estructura del Proyecto

```
CertiVault/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de negocio y API
│   │   ├── models/         # Modelos de datos (Mongoose)
│   │   ├── routes/         # Endpoints de la API
│   │   ├── middleware/     # Seguridad y validaciones
│   │   ├── utils/          # Utilidades y seeders
│   │   └── server.ts       # Entrada principal del servidor
│   ├── .env                # Variables de entorno
│   ├── package.json
│   └── tsconfig.json
└── certif-app/
    ├── src/
    │   ├── app/
    │   │   ├── core/       # Servicios, modelos, guards
    │   │   ├── features/   # Funcionalidades principales
    │   │   ├── shared/     # Componentes reutilizables
    │   │   └── app.component.ts
    │   ├── assets/
    │   └── styles.scss
    ├── package.json
    └── angular.json
```

---

## 🔒 Seguridad

### Decisiones de Seguridad y Checklist Pre-producción

#### Autenticación y Autorización

**JWT Tokens:**
- Duración: 4h (usuarios autenticados)
- Algoritmo: HS256
- Secret: variable `JWT_SECRET` en `.env` (puede generarse con `openssl rand -base64 32`)
- Clock skew tolerance: ±60 segundos (ver manejo en backend/src/controllers/authController.ts)

**RBAC (Control de Acceso Basado en Roles):**
- **admin:** Acceso completo
- **lider:** Gestión y visibilidad extendida
- **tecnico:** Operación diaria
- **reader:** Solo lectura

**Validación de Roles:**
- Middleware: `auth.ts` (autenticación y autorización)
- Endpoints sensibles protegidos con validación de roles (`checkRole` en backend/src/middleware/auth.ts)

#### Cifrado de Datos

**Contraseñas de Usuarios:**
- Hash con bcryptjs (12 salt rounds, ver backend/src/models/User.ts)
- Nunca se almacenan contraseñas en texto plano

**Datos sensibles:**
- Variables de entorno para secretos y credenciales (`.env`)
- Acceso restringido a uploads y recursos privados (ver rutas protegidas en backend/src/routes/)

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn
- MongoDB (local o Atlas)
- Angular CLI (opcional)

### 1. Clonar el proyecto
```bash
git clone https://github.com/tu-org/Certif-app-2.5.git
cd Certif-app-2.5
```

### 2. Backend
```bash
cd backend
npm install
# Configurar .env (ver .env.example)

npm run dev # o npm start
```

### 3. Frontend
```bash
cd ../certif-app
npm install
ng serve # o ng build
```

### 4. Acceso Inicial
- Navegar a http://localhost:4200
- Login con usuario administrador (ver datos en seed o .env)

---

## 🛡️ Seguridad y Buenas Prácticas
- Autenticación JWT y refresh tokens
- Contraseñas encriptadas (bcrypt)
- Rate limiting y Helmet.js
- Validación estricta de datos
- Certificaciones de usuarios desactivados solo visibles para roles elevados

---

## 📄 Licencia y Soporte

Desarrollado por Netics. Todos los derechos reservados.
Para soporte, migración o nuevas versiones, contactar a soporte@netics.cl
### 2. Configurar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
# Editar el archivo .env con tu configuración:
# - MONGODB_URI: URL de conexión a MongoDB
# - JWT_SECRET: Clave secreta para JWT (cambiar en producción)
# - ADMIN_EMAIL y ADMIN_PASSWORD: Credenciales del administrador

# Compilar TypeScript
npm run build

# Ejecutar en desarrollo
npm run dev

# O ejecutar en producción
npm start
```

### 3. Configurar el Frontend

```bash
cd ../certif-app

# Instalar dependencias
npm install

# Ejecutar en desarrollo
ng serve

# O compilar para producción
ng build
```

### 4. Configurar MongoDB

**Opción A: MongoDB Local**
1. Instalar MongoDB Community Edition
2. Iniciar el servicio MongoDB
3. La aplicación creará la base de datos automáticamente

**Opción B: MongoDB Atlas (Recomendado)**
1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear un cluster gratuito
3. Obtener la cadena de conexión
4. Actualizar `MONGODB_URI` en el archivo `.env`

## 🔑 Credenciales por Defecto

El sistema crea automáticamente un usuario administrador (Consultar .env)


## 🚀 Uso de la Aplicación

### 1. Acceso Inicial
- Navegar a `http://localhost:4200`
- Iniciar sesión con las credenciales de administrador
- Cambiar la contraseña por defecto

### 2. Gestión de Usuarios
- Acceder al panel de administración
- Crear usuarios para cada empleado
- Asignar roles apropiados (Admin, Manager, User)

### 3. Gestión de Certificaciones
- Registrar nuevas certificaciones
- Configurar fechas de expiración
- Asignar certificaciones a empleados
- Monitorear estados y vencimientos

### 4. Dashboard y Reportes
- Visualizar estadísticas generales
- Exportar datos en diferentes formatos
- Configurar notificaciones

## 🛡️ Seguridad

- **Autenticación JWT** con refresh tokens
- **Encriptación bcrypt** para contraseñas
- **Rate limiting** para prevenir ataques
- **Helmet.js** para headers de seguridad
- **Validación de entrada** en todas las rutas
- **Cors configurado** para frontend específico

## 🚦 Scripts Disponibles

### Backend
```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm start        # Producción
npm run lint     # Linting
```

### Frontend
```bash
ng serve         # Servidor de desarrollo
ng build         # Compilar para producción
ng test          # Ejecutar tests
ng lint          # Linting
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request


## 🗺️ Roadmap

- [ ] Integración con APIs de proveedores de certificaciones
- [ ] Dashboard avanzado con gráficos interactivos
- [ ] Aplicación móvil
- [ ] Integración con Active Directory/LDAP
- [ ] Flujos de aprobación para certificaciones
- [ ] Sistema de backup automático
- [ ] Multi-idioma (i18n)

---

**Desarrollado con ❤️ para la gestión eficiente de certificaciones empresariales**

# Netics-CertiVault - Sistema de Gestión de Certificaciones Empresariales

## 📋 Descripción

Netics-CertiVault es una aplicación web completa para la gestión centralizada de certificaciones de todas las áreas de una empresa. Permite administrar, monitorear y hacer seguimiento de las certificaciones técnicas y profesionales de los empleados.

## 🚀 Características Principales

- **🔐 Sistema de Autenticación**: Login/registro con JWT tokens y roles de usuario
- **👥 Gestión de Usuarios**: Panel administrativo para gestión de usuarios y permisos
- **📜 Gestión de Certificaciones**: CRUD completo para certificaciones con:
  - Fechas de emisión y expiración
  - Tipos y niveles de certificación
  - Tecnologías y proveedores
  - Asignación por empleado y departamento
- **📊 Dashboard**: Panel de control con estadísticas y métricas
- **🔔 Notificaciones**: Alertas de certificaciones próximas a expirar
- **📈 Reportes**: Exportación de datos en múltiples formatos
- **🎨 Diseño Moderno**: UI responsiva con Bootstrap 5

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** con **TypeScript**
- **Express.js** - Framework web
- **MongoDB** con **Mongoose** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **Helmet** - Seguridad
- **Express Rate Limit** - Rate limiting

### Frontend
- **Angular 17+** con **TypeScript**
- **Bootstrap 5** - Framework CSS
- **RxJS** - Programación reactiva
- **Angular Material** - Componentes UI adicionales

## 📁 Estructura del Proyecto

```
Certif-app-2.0/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controladores de la API
│   │   ├── models/         # Modelos de MongoDB
│   │   ├── routes/         # Rutas de la API
│   │   ├── middleware/     # Middleware personalizado
│   │   ├── utils/          # Utilidades
│   │   └── server.ts       # Punto de entrada del servidor
│   ├── dist/              # Código compilado
│   ├── .env               # Variables de entorno
│   ├── package.json
│   └── tsconfig.json
└── certif-app/
    ├── src/
    │   ├── app/
    │   │   ├── core/           # Servicios, modelos, guards
    │   │   ├── features/       # Módulos de funcionalidades
    │   │   ├── shared/         # Componentes compartidos
    │   │   └── app.component.ts
    │   ├── assets/
    │   └── styles.scss
    ├── package.json
    └── angular.json
```

## ⚡ Instalación y Configuración

### Prerrequisitos

- **Node.js** (versión 18 o superior)
- **npm** o **yarn**
- **MongoDB** (local o MongoDB Atlas)
- **Angular CLI** (opcional pero recomendado)

### 1. Clonar el proyecto

```bash
cd "C:\Users\areyes\Desktop\Certif-app-2.0"
```

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

El sistema crea automáticamente un usuario administrador:

- **Email**: `admin@empresa.com`
- **Contraseña**: `Admin123!`

> ⚠️ **IMPORTANTE**: Cambiar estas credenciales en producción

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

## 📝 Variables de Entorno

Configurar las siguientes variables en el archivo `.env` del backend:

```bash
# Entorno
NODE_ENV=development
PORT=3000

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/certif-app

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Usuario Admin
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=Admin123!
ADMIN_USERNAME=admin

# Frontend
FRONTEND_URL=http://localhost:4200

# Uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

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

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Email: soporte@empresa.com
- Issues: [GitHub Issues](link-to-issues)

## 🗺️ Roadmap

- [ ] Módulo de notificaciones por email
- [ ] Integración con APIs de proveedores de certificaciones
- [ ] Dashboard avanzado con gráficos interactivos
- [ ] Aplicación móvil
- [ ] Integración con Active Directory/LDAP
- [ ] Flujos de aprobación para certificaciones
- [ ] Sistema de backup automático
- [ ] Multi-idioma (i18n)

---

**Desarrollado con ❤️ para la gestión eficiente de certificaciones empresariales**
# Especificación de la API REST – CertVault

Este documento detalla los principales endpoints de la API de **CertVault**, describiendo la estructura de peticiones, respuestas y códigos de estado HTTP aplicados, especialmente para las políticas de seguridad y la auditoría.

---

## 1. Autenticación y Sesión (`/api/auth`)

### Iniciar Sesión (Login)
* **Ruta:** `POST /api/auth/login`
* **Cuerpo de la Petición:**
  ```json
  {
    "email": "usuario@empresa.com",
    "password": "Password123!"
  }
  ```
* **Respuesta Exitosa (200 OK):**
  Devuelve la sesión e incluye los flags de control de seguridad obligatorios:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "_id": "69861ca096a46d7b664e8a10",
        "username": "usuario123",
        "email": "usuario@empresa.com",
        "personalEmail": "usuario_personal@gmail.com",
        "role": "reader",
        "mustChangePassword": false,
        "termsAccepted": true,
        "termsAcceptedAt": "2026-05-26T23:45:00.000Z"
      },
      "expiresIn": 604800
    },
    "message": "Inicio de sesion exitoso"
  }
  ```

---

### Aceptación de Términos y Condiciones
* **Ruta:** `POST /api/auth/accept-terms`
* **Encabezados:** `Authorization: Bearer <Token>`
* **Cuerpo de la Petición:** *Ninguno (vacío)*
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Términos y condiciones aceptados correctamente",
    "data": {
      "termsAccepted": true,
      "termsAcceptedAt": "2026-05-26T23:46:10.512Z"
    }
  }
  ```

---

### Cambio de Contraseña y Correo Personal
* **Ruta:** `PUT /api/auth/change-password`
* **Encabezados:** `Authorization: Bearer <Token>`
* **Cuerpo de la Petición:**
  Se requiere la contraseña actual y la nueva contraseña. Opcionalmente admite `personalEmail` para recolectarlo en el mismo flujo si falta en la cuenta:
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewPassword123!",
    "personalEmail": "correo_personal_nuevo@gmail.com"
  }
  ```
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña actualizada exitosamente"
  }
  ```

---

## 2. Gestión de Usuarios (`/api/users`)

### Forzar Cambio de Clave Masivo
* **Ruta:** `POST /api/users/force-password-change`
* **Encabezados:** `Authorization: Bearer <Token>` (Requiere rol `admin`)
* **Cuerpo de la Petición:**
  Recibe un arreglo con los identificadores de los usuarios a los que se les requiere cambiar su contraseña en su próximo login:
  ```json
  {
    "userIds": [
      "69861ca096a46d7b664e8a10",
      "69f90c7263456e3bfd5184c5"
    ]
  }
  ```
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Se ha forzado el cambio de contraseña para los usuarios seleccionados correctamente."
  }
  ```

---

### Eliminar Usuario (Borrado Físico y Envío Condicional de Respaldo)
* **Ruta:** `DELETE /api/users/:id`
* **Encabezados:** `Authorization: Bearer <Token>` (Requiere rol `admin`)
* **Respuesta Exitosa (200 OK):**
  Dispara el borrado físico de la base de datos y de disco. Si la política SMTP `sendBackupOnDelete` está habilitada, genera y envía automáticamente un correo con un ZIP conteniendo las certificaciones del usuario. Si la política está deshabilitada, el usuario se elimina sin envío de respaldo. Registra un log detallado en el módulo de auditoría:
  ```json
  {
    "success": true,
    "message": "Usuario eliminado exitosamente y copia de respaldo enviada a su correo personal."
  }
  ```

---

### Asignación Masiva de Departamento
* **Ruta:** `PATCH /api/users/bulk-department`
* **Encabezados:** `Authorization: Bearer <Token>` (Requiere rol `admin` o `lider`)
* **Cuerpo de la Petición:**
  ```json
  {
    "userIds": [
      "69861ca096a46d7b664e8a10",
      "69f90c7263456e3bfd5184c5"
    ],
    "departmentId": "69f124b763456e3bfd51814e"
  }
  ```
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Departamento actualizado masivamente para los usuarios seleccionados correctamente."
  }
  ```

---

## 3. Políticas del Sistema y Expiración (`/api/settings`)

### Configuración de Políticas de Expiración de Claves
* **Obtener Configuración:** `GET /api/settings/security`
* **Actualizar Configuración:** `PUT /api/settings/security`
* **Encabezados:** `Authorization: Bearer <Token>` (Requiere rol `admin`)
* **Cuerpo de la Petición (PUT):**
  ```json
  {
    "passwordExpirationEnabled": true,
    "passwordExpirationMonths": 3
  }
  ```
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "69f124b763456e3bfd51814d",
      "passwordExpirationEnabled": true,
      "passwordExpirationMonths": 3,
      "updatedBy": "69861ca096a46d7b664e8a10",
      "createdAt": "2026-05-26T23:33:00.000Z",
      "updatedAt": "2026-05-26T23:33:00.000Z"
    },
    "message": "Configuracion de seguridad actualizada exitosamente"
  }
  ```

---

### Gestión de Respaldos Locales (Backups en Servidor)
Todos estos endpoints requieren privilegios de rol `admin`:

* **Listar Respaldos Locales:**
  * **Ruta:** `GET /api/settings/backup/local`
  * **Respuesta Exitosa (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "filename": "backup-20260625-171500.zip",
          "sizeBytes": 1054320,
          "createdAt": "2026-06-25T21:15:00.000Z"
        }
      ]
    }
    ```

* **Crear Respaldo Manual Local:**
  * **Ruta:** `POST /api/settings/backup/local`
  * **Respuesta Exitosa (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "filename": "backup-20260625-171800.zip"
      },
      "message": "Respaldo local generado exitosamente"
    }
    ```

* **Descargar Respaldo Físico:**
  * **Ruta:** `GET /api/settings/backup/local/download/:filename`
  * **Respuesta (200 OK):** Retorna la descarga directa del archivo ZIP comprimido (Base de datos + archivos adjuntos) protegiendo el host de Path Traversal.

* **Eliminar Respaldo Físico:**
  * **Ruta:** `DELETE /api/settings/backup/local/:filename`
  * **Respuesta Exitosa (200 OK):**
    ```json
    {
      "success": true,
      "message": "Respaldo local eliminado exitosamente"
    }
    ```

---

### Políticas SMTP (Directivas Globales del Sistema)
* **Obtener Políticas Activas:** `GET /api/settings/smtp-policy`
* **Encabezados:** `Authorization: Bearer <Token>`
* **Descripción:** Retorna las directivas activas del perfil SMTP global. Utilizado por el frontend para determinar dinámicamente si el correo personal es obligatorio y si se envían respaldos al eliminar usuarios.
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "sendBackupOnDelete": true,
      "requirePersonalEmail": false
    }
  }
  ```
* **Respuesta sin Configuración (200 OK):**
  Si no existe un perfil SMTP activo, retorna valores por defecto:
  ```json
  {
    "success": true,
    "data": {
      "sendBackupOnDelete": true,
      "requirePersonalEmail": true
    }
  }
  ```

---

## 4. Códigos de Estado Especiales de Seguridad

La API de CertVault aplica códigos de estado e interceptores específicos para forzar la seguridad del usuario en el middleware de autenticación:

| Código HTTP | Código Interno / Mensaje | Causa |
| :--- | :--- | :--- |
| `403 Forbidden` | `PASSWORD_CHANGE_REQUIRED` | El usuario está logueado pero tiene el flag `mustChangePassword === true` activo y está intentando consumir recursos protegidos distintos al cambio de perfil/clave. |
| `401 Unauthorized` | `Usuario no autenticado` | Token inválido, expirado o ausente en el encabezado `Authorization`. |
| `400 Bad Request` | `Debe ingresar un correo personal válido...` | Se intentó realizar un cambio de clave o registro con correos corporativo y personal idénticos. |

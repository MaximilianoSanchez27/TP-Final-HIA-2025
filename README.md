# Sistema de Gestión de Federación de Voley (TP Final HIA 2025)

Este repositorio contiene el código fuente del Trabajo Práctico Final para la materia Herramientas de Inteligencia Artificial (HIA) 2025. Es una aplicación web completa para la gestión de una Federación de Voley, incluyendo clubes, afiliados, cobros, pases y credenciales.

## 🚀 Tecnologías Utilizadas

El proyecto está construido utilizando una arquitectura moderna de **MEAN Stack** (modificada con PostgreSQL):

### Frontend (`frontend_FJV`)

- **Framework:** Angular 19
- **Estilos:** Bootstrap 5, FontAwesome, Animate.css
- **Gráficos:** Chart.js
- **Utilidades:** ExcelJS, jsPDF, html2canvas, QRCode
- **Lenguaje:** TypeScript

### Backend (`backend_FJV`)

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Base de Datos:** PostgreSQL (usando Sequelize ORM)
- **Autenticación:** JWT (JSON Web Tokens), Passport.js (Google, LinkedIn OAuth)
- **Seguridad:** Bcryptjs, CORS
- **Otros:** Multer (subida de archivos), MercadoPago SDK, Swagger (documentación API)

### Infraestructura

- **Contenedores:** Docker, Docker Compose

## 📂 Estructura del Proyecto

```
TP-Final-HIA-2025/
├── backend_FJV/        # Código fuente del servidor (API REST)
│   ├── src/
│   │   ├── controllers/# Lógica de negocio
│   │   ├── models/     # Modelos de base de datos (Sequelize)
│   │   ├── routes/     # Definición de endpoints
│   │   └── ...
├── frontend_FJV/       # Código fuente de la aplicación cliente (Angular)
# Sistema de Gestión de Federación de Voley (TP Final HIA 2025)

Este repositorio contiene el código fuente del Trabajo Práctico Final para la materia Herramientas de Inteligencia Artificial (HIA) 2025. Es una aplicación web completa para la gestión de una Federación de Voley, incluyendo clubes, afiliados, cobros, pases y credenciales.

## 🚀 Tecnologías Utilizadas

El proyecto está construido utilizando una arquitectura moderna de **MEAN Stack** (modificada con PostgreSQL):

### Frontend (`frontend_FJV`)

- **Framework:** Angular 19
- **Estilos:** Bootstrap 5, FontAwesome, Animate.css
- **Gráficos:** Chart.js
- **Utilidades:** ExcelJS, jsPDF, html2canvas, QRCode
- **Lenguaje:** TypeScript

### Backend (`backend_FJV`)

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Base de Datos:** PostgreSQL (usando Sequelize ORM)
- **Autenticación:** JWT (JSON Web Tokens), Passport.js (Google, LinkedIn OAuth)
- **Seguridad:** Bcryptjs, CORS
- **Otros:** Multer (subida de archivos), MercadoPago SDK, Swagger (documentación API)

### Infraestructura

- **Contenedores:** Docker, Docker Compose

## 📂 Estructura del Proyecto

```

TP-Final-HIA-2025/
├── backend_FJV/ # Código fuente del servidor (API REST)
│ ├── src/
│ │ ├── controllers/# Lógica de negocio
│ │ ├── models/ # Modelos de base de datos (Sequelize)
│ │ ├── routes/ # Definición de endpoints
│ │ └── ...
├── frontend_FJV/ # Código fuente de la aplicación cliente (Angular)
│ ├── src/
│ │ ├── app/
│ │ │ ├── pages/ # Vistas y componentes principales
│ │ │ ├── services/# Comunicación con el backend
│ │ │ └── ...
├── config/ # Archivos de configuración
├── docker-compose.prod.yml # Orquestación de contenedores (Producción)
└── README.md # Este archivo

````

## 🛠️ Instalación y Configuración (Local)

### Prerrequisitos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)
- Angular CLI (`npm install -g @angular/cli`)

### 1. Configuración del Backend

1.  Navega al directorio del backend:
    ```bash
    cd backend_FJV
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Crea un archivo `.env` basado en el ejemplo (si existe) o configura las variables de entorno necesarias (DB_HOST, DB_USER, DB_PASS, JWT_SECRET, etc.).
4.  Inicializa la base de datos (si es necesario):
    ```bash
    # El proyecto usa Sequelize, por lo que las tablas se crean al iniciar
    npm run start
    ```
5.  (Opcional) Inicializar usuarios de prueba:
    ```bash
    npm run init-admin  # Crea un usuario administrador
    npm run init-user   # Crea un usuario regular
    ```

### 2. Configuración del Frontend

1.  Navega al directorio del frontend:
    ```bash
    cd frontend_FJV
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm start
    ```
4.  Abre tu navegador en `http://localhost:4200`.

## 🐳 Ejecución con Docker

Si prefieres usar Docker para levantar todo el entorno (Frontend + Backend + Base de Datos):

1.  Asegúrate de tener Docker y Docker Compose instalados.
2.  Desde la raíz del proyecto, ejecuta:
    ```bash
    docker-compose -f docker-compose.prod.yml up --build
    ```
3.  La aplicación debería estar accesible en los puertos configurados en el `docker-compose.prod.yml` (usualmente 80 o 4200 para frontend y 3000/4000 para backend).

## ✨ Funcionalidades Principales

- **Gestión de Clubes:** Alta, baja, modificación y listado de clubes afiliados. Paginación y filtrado avanzado.
- **Gestión de Afiliados:** Registro de jugadores, control de categorías y estados de afiliación.
- **Cobros y Pagos:** Integración con MercadoPago, seguimiento de estados de pago.
- **Credenciales:** Generación de credenciales digitales con código QR.
- **Pases:** Gestión de transferencias de afiliados entre clubes.
- **Dashboard:** Visualización de estadísticas y métricas clave.
- **Seguridad:** Roles de usuario (Admin/Usuario), protección de rutas.

## 👥 Autores

- _Desarrollo Inicial y Mantenimiento_
- **Equipo HIA 2025**

---

© 2025 Federación de Voley - TP Final HIA
````

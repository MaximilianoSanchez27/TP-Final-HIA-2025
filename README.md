# Sistema de Gestión de Federación de Voley (TP Final HIA 2025)

![Estado del Proyecto](https://img.shields.io/badge/Estado-Terminado-success?style=for-the-badge)
![Arquitectura](https://img.shields.io/badge/Arquitectura-Microservicios%20HA-orange?style=for-the-badge)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue?style=for-the-badge)
![Versión](https://img.shields.io/badge/Versión-1.0.0-blue?style=for-the-badge)

Este proyecto despliega una aplicación web completa para la gestión de una **Federación de Voley** bajo una arquitectura de **microservicios contenerizada diseñada para Alta Disponibilidad (HA)**.

El sistema integra seguridad perimetral, escalabilidad horizontal, clúster de bases de datos con replicación y automatización de mantenimiento, cumpliendo con estándares de infraestructura moderna.

---

## 📑 Tabla de Contenidos

- [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [🚀 Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [🛠️ Guía de Despliegue (Producción)](#️-guía-de-despliegue-entorno-productivo)
- [🌐 Puntos de Acceso](#-puntos-de-acceso-seguros)
- [🛡️ Seguridad Implementada](#️-seguridad-implementada)
- [✨ Funcionalidades](#-funcionalidades-del-sistema)
- [👥 Equipo](#-autores)

---

## 🏗️ Arquitectura del Sistema

El sistema se compone de estratos interconectados mediante una red interna aislada (`dbnet`), garantizando la seguridad y el rendimiento:

1.  **🔒 Capa de Acceso (Gateway):** Proxy Inverso **Nginx** con terminación SSL/TLS y mitigación Anti-DDoS.
2.  **💻 Capa de Aplicación:** Frontend (**Angular**) y Backend (**Node.js**).
3.  **💾 Capa de Datos:** Clúster **PostgreSQL** (1 Maestro + 2 Réplicas) gestionado por `repmgr` y balanceado por `Pgpool-II`.
4.  **🔧 Capa de Mantenimiento:** Backups automáticos y optimización de índices.
5.  **📊 Capa de Observabilidad:** Stack de monitoreo (**Prometheus**, **Grafana**, **cAdvisor**).

---

## 🚀 Tecnologías Utilizadas

El proyecto utiliza un **MEAN Stack** modificado y robustecido para entornos empresariales:

### 🎨 Frontend (`frontend_FJV`)

| Tecnología      | Descripción                                  |
| --------------- | -------------------------------------------- |
| **Angular 19**  | Framework SPA de última generación.          |
| **Bootstrap 5** | Diseño responsivo y componentes UI.          |
| **Chart.js**    | Visualización de métricas y estadísticas.    |
| **Utilidades**  | `ExcelJS`, `jsPDF`, `QRCode`, `Animate.css`. |

### ⚙️ Backend (`backend_FJV`)

| Tecnología              | Descripción                                    |
| ----------------------- | ---------------------------------------------- |
| **Node.js + Express 5** | API RESTful escalable.                         |
| **PostgreSQL**          | Base de datos relacional con `Sequelize ORM`.  |
| **Seguridad**           | `JWT`, `Passport.js` (OAuth), `Bcryptjs`.      |
| **Integraciones**       | `MercadoPago SDK`, `Swagger` (Docs), `Multer`. |

### 🏗️ Infraestructura y DevOps

| Componente       | Tecnología                                   |
| ---------------- | -------------------------------------------- |
| **Orquestación** | Docker & Docker Compose                      |
| **Gateway**      | Nginx (Proxy Inverso + Seguridad)            |
| **Database HA**  | Bitnami PostgreSQL-Repmgr + Pgpool-II        |
| **Monitoreo**    | Prometheus + Grafana + cAdvisor + Watchtower |

---

## 🛠️ Guía de Despliegue (Entorno Productivo)

### Requisitos Previos

- **Docker Engine** v20.10+
- **Docker Compose** v2.0+
- **Puertos libres**: `8888` (HTTP), `443` (HTTPS).

### 1️⃣ Configuración de Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto.

> **⚠️ IMPORTANTE:** Nunca subas este archivo al repositorio.

```dotenv
# --- Credenciales del Clúster PostgreSQL ---
POSTGRESQL_USERNAME=appuser
POSTGRESQL_PASSWORD=cambiar_por_contraseña_segura
POSTGRESQL_DATABASE=appdb
POSTGRESQL_POSTGRES_PASSWORD=cambiar_por_contraseña_admin
REPMGR_PASSWORD=cambiar_por_secreto_replicacion

# --- Credenciales de Pgpool (Balanceador) ---
PGPOOL_SR_CHECK_USER=repmgr
PGPOOL_SR_CHECK_PASSWORD=cambiar_por_secreto_replicacion
PGPOOL_ADMIN_PASSWORD=cambiar_por_admin_pool
```

### 2️⃣ Certificados SSL

Para habilitar HTTPS en el Gateway, el proyecto requiere certificados en la carpeta `/certs`.

- **Entorno Académico:** Los certificados autofirmados (`nginx.crt` y `nginx.key`) ya se encuentran incluidos para facilitar el despliegue.
- **Entorno Real:** Reemplazar por certificados válidos emitidos por una CA (ej. Let's Encrypt).

### 3️⃣ Despliegue del Clúster

Ejecuta el siguiente comando para levantar la infraestructura completa, forzando la recreación para aplicar políticas de seguridad:

```bash
docker-compose -f docker-compose.prod.yml -p hia-prod --profile monitoring up -d --force-recreate
```

---

## 🌐 Puntos de Acceso Seguros

Debido a la implementación de seguridad, el acceso directo a los puertos de los servicios (`3000`, `8080`, `5432`) está **bloqueado**. Todo el tráfico debe pasar por el Gateway Seguro.

| Servicio        | URL de Acceso                | Descripción                                                         |
| --------------- | ---------------------------- | ------------------------------------------------------------------- |
| **Frontend**    | `https://localhost`          | Aplicación Web Principal (Redirige tráfico HTTP desde puerto 8888). |
| **Backend API** | `https://localhost/api/`     | Endpoints de la API REST.                                           |
| **PgAdmin 4**   | `https://localhost/pgadmin/` | Panel de Administración de Base de Datos.                           |
| **Grafana**     | `http://localhost:3001`      | Dashboards de Métricas (Usuario: `admin`/`admin`).                  |

> **Nota:** Al usar certificados autofirmados, el navegador mostrará una advertencia. Selecciona "Configuración avanzada" -> "Continuar a localhost".

---

## 🛡️ Seguridad Implementada

- **🧱 Aislamiento de Red:** Los servicios backend y bases de datos no exponen puertos al host (`expose` en lugar de `ports`), siendo inaccesibles desde internet.
- **🔒 Cifrado SSL/TLS:** Nginx fuerza el uso de HTTPS con protocolos modernos (TLSv1.2/1.3) y cifrados fuertes.
- **🛡️ Defensa Activa (Anti-DDoS):** Implementación de Rate Limiting en Nginx (límite de 10 req/s + ráfaga controlada) para mitigar ataques de denegación de servicio.
  - _Se incluye el script de prueba `ataque_ddos.ps1` para validar esta funcionalidad._

---

## ✨ Funcionalidades del Sistema

- 🏢 **Gestión de Clubes:** Alta, baja, modificación y listado de clubes afiliados.
- 👥 **Gestión de Afiliados:** Registro de jugadores, control de categorías y estados.
- 💳 **Cobros y Pagos:** Integración con MercadoPago y seguimiento de estados.
- 🆔 **Credenciales Digitales:** Generación de credenciales con código QR único.
- 🔄 **Pases:** Gestión de transferencias de afiliados entre clubes.
- 📊 **Dashboard:** Visualización de estadísticas clave en tiempo real.

---

## 👥 Autores

**Desarrollado por el Equipo HIA 2025**
_Desarrollo Inicial y Mantenimiento_

---

© 2025 Federación de Voley - TP Final HIA

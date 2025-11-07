/**
 * Punto de entrada principal de la aplicación
 *
 * Configura Express, carga middlewares y rutas, y arranca el servidor
 */

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

// Importar configuraciones y modelos
const { sequelize, connectDB } = require("./config/database");
const passport = require("./config/passport");
const { defineAssociations } = require("./models/associations");
const corsOptions = require("./config/cors");

// --- Inicialización de Express ---
const app = express();

// === MIDDLEWARES ===
// Parseo de JSON y URL encoded
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS - Usar la configuración centralizada
app.use(cors(corsOptions));

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/contacto', require('./routes/contacto.routes'));


// Sesiones para autenticación
app.use(
  session({
    secret: process.env.JWT_SECRET || "tu_clave_secreta_jwt",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 día
    },
  })
);

// Passport para autenticación
app.use(passport.initialize());
app.use(passport.session());

// Puerto
app.set("port", process.env.PORT || 3000);

// === RUTAS ===
// La API base (comentada para evitar conflicto con webhook handler)
/*
app.get("/", (req, res) => {
  res.json({
    name: "API de la Federación Jujeña de Voley",
    version: "1.0.0",
    status: "OK",
  });
});
*/

// Importante: asegurar que las rutas de autenticación se carguen primero
app.use("/api/auth", require("./routes/auth.routes"));

// Resto de rutas de la API
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/usuario", require("./routes/usuario.routes"));
app.use("/api/rol", require("./routes/rol.routes"));
app.use("/api/personas", require("./routes/persona.routes")); 
app.use("/api/afiliados", require("./routes/afiliados"));
app.use("/api/clubs", require("./routes/club.routes"));
app.use("/api/categorias", require("./routes/categoria.routes"));
app.use("/api/equipos", require("./routes/equipo.routes"));
app.use("/api/cobros", require("./routes/cobro.routes")); 
app.use("/api/credenciales", require("./routes/credencial.routes")); 
app.use("/api/noticias", require("./routes/noticia.routes")); 
app.use("/api/pases", require("./routes/pase.routes")); 
app.use("/api/ipguide", require("./routes/ipGuide.routes.js")); 
app.use("/api/ip-guide", require("./routes/ipGuide.routes.js")); 

// Rutas para mercado pago
app.use("/api/mp", require("./routes/mp.routes.js"));

// Rutas para pagos con MercadoPago
app.use("/api/pagos", require("./routes/pago.routes"));

// Rutas para pagos públicos
app.use("/api/public-payment", require("./routes/public-payment.routes"));

// Rutas para configuración del hero
app.use("/api/hero-config", require("./routes/hero-config.routes"));

// Rutas para configuración de áreas de trabajo
app.use("/api/work-areas", require("./routes/work-areas.routes"));

// Rutas para momentos destacados
app.use("/api/momentos-destacados", require("./routes/momentos-destacados.routes"));

// === RUTAS DE WEBHOOKS MERCADOPAGO ===
// MercadoPago puede enviar webhooks a diferentes rutas, vamos a capturarlas todas

// Ruta principal de webhooks
app.use("/api/webhooks", require("./routes/webhook.routes"));

// Rutas alternativas para webhooks de MercadoPago (por si llegan con URLs malformadas)
const webhookController = require("./controllers/webhook.controller");

// Capturar webhooks que llegan directamente a la raíz
app.post("/", webhookController.mercadoPago);

// Solo capturar GET en raíz si tiene parámetros de MercadoPago
app.get("/", (req, res, next) => {
  // Si tiene parámetros de MercadoPago, procesar como webhook
  if ((req.query.id && req.query.topic) || (req.query['data.id'] && req.query.type)) {
    return webhookController.mercadoPago(req, res, next);
  }
  
  // Si no, responder con información de la API
  res.json({
    name: "API de la Federación Jujeña de Voley",
    version: "1.0.0",
    status: "OK",
  });
});

// Capturar webhooks con doble barra (URL malformada)
app.post("//api/webhooks/mercadopago", webhookController.mercadoPago);
app.get("//api/webhooks/mercadopago", webhookController.mercadoPago);

// Capturar webhooks en ruta absoluta sin /api
app.post("/webhooks/mercadopago", webhookController.mercadoPago);
app.get("/webhooks/mercadopago", webhookController.mercadoPago);

// Middleware para manejo de errores 404 - DEBE SER EL ÚLTIMO
app.use((req, res, next) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// === INICIAR SERVIDOR ===
async function startServer() {
  try {
    // 1. Conectar a la base de datos
    await connectDB();
    console.log("✔ Conexión a la base de datos establecida correctamente.");

    // 2. Definir asociaciones entre modelos
    defineAssociations();

    // 3. Sincronizar modelos con la base de datos
    await sequelize.sync({ alter: false });
    console.log(
      "✔ Todos los modelos fueron sincronizados exitosamente con la base de datos."
    );

    // 4. Inicializar datos iniciales si es necesario (roles por defecto, etc.)
    await initializeDefaultData();

    // 5. Inicializar usuario administrador si no existe
    await initializeAdminUser();

    // 6. Inicializar usuario regular si no existe
    await initializeRegularUser();

    // 7. Iniciar el servidor HTTP
    app.listen(app.get("port"), () => {
      const port = app.get("port");
      const isProduction = process.env.NODE_ENV === "production";
      
      if (isProduction) {
        console.log(`🚀 Servidor backend desplegado correctamente en producción`);
        console.log(`   - Puerto: ${port}`);
        console.log(`   - Entorno: Producción`);
      } else {
        console.log(`🚀 Servidor backend escuchando en http://localhost:${port}`);
        console.log(`   - Entorno: Desarrollo`);
      }
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

/**
 * Inicializa datos por defecto necesarios para el funcionamiento del sistema
 */
async function initializeDefaultData() {
  try {
    const Rol = require("./models/Rol");

    // Verificar si ya existen roles
    const rolesCount = await Rol.count();

    if (rolesCount === 0) {
      console.log("Creando roles predeterminados...");

      // Crear roles básicos
      await Rol.bulkCreate([
        { nombre: "admin", descripcion: "Administrador del sistema" },
        { nombre: "usuario", descripcion: "Usuario regular" },
        { nombre: "usuario_social", descripcion: "Usuario de redes sociales" },
      ]);

      console.log("✓ Roles predeterminados creados correctamente");
    } else {
      console.log(`✓ Ya existen ${rolesCount} roles en el sistema`);
    }
  } catch (error) {
    console.error("Error al inicializar datos predeterminados:", error);
    throw error; // Propagar error para que se maneje en startServer
  }
}

/**
 * Inicializa un usuario administrador si no existe
 */
async function initializeAdminUser() {
  try {
    const Rol = require("./models/Rol");
    const Usuario = require("./models/Usuario");

    // Buscar rol de administrador
    let adminRol = await Rol.findOne({ where: { nombre: "admin" } });

    // Si no existe el rol admin, salir (debería haberse creado en initializeDefaultData)
    if (!adminRol) {
      console.error(
        "❌ No se encontró el rol de administrador. No se pudo crear usuario admin."
      );
      return;
    }

    // Verificar si existe algún usuario con rol admin
    const adminExists = await Usuario.findOne({
      where: { rolId: adminRol.id },
    });

    if (adminExists) {
      console.log("✓ Usuario administrador ya existe:", adminExists.email);
      return;
    }

    // Datos del administrador por defecto
    const adminUser = await Usuario.create({
      nombre: process.env.ADMIN_NOMBRE,
      apellido: process.env.ADMIN_APELLIDO,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      rolId: adminRol.id,
      emailVerificado: true,
    });

    console.log("✅ Usuario administrador creado exitosamente:");
    console.log(`   - Email: ${adminUser.email}`);
    console.log(`   - Contraseña: ${process.env.ADMIN_PASSWORD || "Admin123!"}`);
    console.log(
      "⚠️  IMPORTANTE: Cambie la contraseña después del primer inicio de sesión"
    );
  } catch (error) {
    console.error("❌ Error al inicializar usuario administrador:", error);
  }
}

/**
 * Inicializa un usuario regular si no existe
 */
async function initializeRegularUser() {
  try {
    const Rol = require("./models/Rol");
    const Usuario = require("./models/Usuario");

    // Buscar rol de usuario
    let userRol = await Rol.findOne({ where: { nombre: "usuario" } });

    // Si no existe el rol usuario, salir (debería haberse creado en initializeDefaultData)
    if (!userRol) {
      console.error(
        "❌ No se encontró el rol de usuario. No se pudo crear usuario regular."
      );
      return;
    }

    // Verificar si existe algún usuario con rol usuario
    const userExists = await Usuario.findOne({
      where: { rolId: userRol.id },
    });

    if (userExists) {
      console.log("✓ Usuario regular ya existe:", userExists.email);
      return;
    }

    // Datos del usuario regular por defecto
    const regularUser = await Usuario.create({
      nombre: "Usuario",
      apellido: "Regular",
      email: "usuario@sistema.com",
      password: "Usuario123!",
      rolId: userRol.id,
      emailVerificado: true,
    });

    console.log("✅ Usuario regular creado exitosamente:");
    console.log(`   - Email: ${regularUser.email}`);
    console.log(`   - Contraseña: Usuario123!`);
  } catch (error) {
    console.error("❌ Error al inicializar usuario regular:", error);
  }
}

// Iniciar el servidor
startServer();

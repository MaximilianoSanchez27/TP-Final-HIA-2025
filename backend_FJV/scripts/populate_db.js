const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const rootEnv = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
  console.log(`Loaded env from ${rootEnv}`);
} else {
  dotenv.config();
}

const { Sequelize, DataTypes } = require('sequelize');
const { faker } = require('@faker-js/faker');


const TOTAL_CLUBS = parseInt(process.env.POPULATE_TOTAL_CLUBS || '200000', 10);
const TOTAL_PERSONAS = parseInt(process.env.POPULATE_TOTAL_PERSONAS || '200000', 10);
const TOTAL_CATEGORIAS = parseInt(process.env.POPULATE_TOTAL_CATEGORIAS || '100', 10);
const BATCH_SIZE = parseInt(process.env.POPULATE_BATCH_SIZE || '10000', 10);

let globalClubCounter = 1;
let globalPersonaCounter = 1;
let globalPersonaEmailCounter = 1;
let globalCategoryCounter = 1;


const DB_USER = process.env.POSTGRESQL_USERNAME || process.env.DB_USER || 'postgres';
const DB_PASS = process.env.POSTGRESQL_PASSWORD || process.env.DB_PASS || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.POSTGRESQL_DATABASE || process.env.DB_NAME || 'appdb';


if (!process.env.DB_USER && process.env.POSTGRESQL_USERNAME) process.env.DB_USER = process.env.POSTGRESQL_USERNAME;
if (!process.env.DB_PASSWORD && process.env.POSTGRESQL_PASSWORD) process.env.DB_PASSWORD = process.env.POSTGRESQL_PASSWORD;
if (!process.env.DB_NAME && process.env.POSTGRESQL_DATABASE) process.env.DB_NAME = process.env.POSTGRESQL_DATABASE;
if (!process.env.DB_HOST && process.env.DB_HOST) process.env.DB_HOST = process.env.DB_HOST; // noop but explicit
if (!process.env.DB_PORT && process.env.POSTGRES_PORT) process.env.DB_PORT = process.env.POSTGRES_PORT || DB_PORT;

console.log(`DB connection: host=${DB_HOST} port=${DB_PORT} user=${DB_USER} database=${DB_NAME}`);

const sequelize = new Sequelize(
  process.env.DATABASE_URL || `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  {
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  }
);

let ClubModel = null;
let PersonaModel = null;
let CategoriaModel = null;


try {
 
  ClubModel = require('../src/models/Club');
  PersonaModel = require('../src/models/Persona');

  try {
    CategoriaModel = require('../src/models/Categoria');
  } catch (e) {

  }
  console.log('Using existing models from backend_FJV/src/models');
} catch (err) {
  console.log('Could not load project models, falling back to local example models.');


  ClubModel = sequelize.define('Club', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
  }, { tableName: 'clubs', timestamps: true });

  PersonaModel = sequelize.define('Persona', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    clubId: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'personas', timestamps: true });

  // fallback Categoria model
  CategoriaModel = sequelize.define('Categoria', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: false },
    tipo: { type: DataTypes.STRING(50), allowNull: true },
  }, { tableName: 'categorias', timestamps: true });

  ClubModel.hasMany(PersonaModel, { foreignKey: 'clubId' });
  PersonaModel.belongsTo(ClubModel, { foreignKey: 'clubId' });
}


function hasAttr(model, attrName) {
  return model && model.rawAttributes && Object.prototype.hasOwnProperty.call(model.rawAttributes, attrName);
}


function getAttrMaxLength(model, attrName, fallback = 255) {
  try {
    if (!model || !model.rawAttributes || !model.rawAttributes[attrName]) return fallback;
    const type = model.rawAttributes[attrName].type;
    
    if (type && typeof type._length === 'number') return type._length;
    if (type && type.options && typeof type.options.length === 'number') return type.options.length;
    
    const s = String(type);
    const m = s.match(/\((\d+)\)/);
    if (m) return parseInt(m[1], 10);
  } catch (e) {
  
  }
  return fallback;
}


function safeTruncate(val, max) {
  if (val == null) return val;
  const s = String(val);
  if (max && s.length > max) return s.slice(0, max);
  return s;
}

async function bulkInsertInBatches(Model, generatorFn, total, batchSize, modelName, options = { returnIds: true }) {
  const batches = Math.ceil(total / batchSize);
  const createdPKs = [];

  const pkAttr = Model.primaryKeyAttributes && Model.primaryKeyAttributes[0] ? Model.primaryKeyAttributes[0] : 'id';

  for (let b = 0; b < batches; b++) {
    const currentBatchSize = Math.min(batchSize, total - b * batchSize);
    const items = new Array(currentBatchSize).fill(null).map(() => generatorFn());

    
    const bulkOpts = options.returnIds ? { returning: true } : { returning: false, validate: false, individualHooks: false };
    const created = await Model.bulkCreate(items, bulkOpts);

    if (options.returnIds) {
     
      for (const inst of created) {
        const pk = inst.get ? inst.get(pkAttr) : inst[pkAttr];
        createdPKs.push(pk);
      }
    }

    console.log(`${modelName}: Lote ${b + 1}/${batches} insertado (${Array.isArray(created) ? created.length : currentBatchSize} items)`);
  }

  return createdPKs;
}

async function popularDatos() {
  try {
    
    const usedSequelize = (ClubModel && ClubModel.sequelize) ? ClubModel.sequelize : sequelize;

   
    const forceFlag = process.env.POPULATE_FORCE === 'true' || process.argv.includes('--force') || process.argv.includes('--yes');
    if (forceFlag) {
      console.log('Sincronizando modelos (force: true) — Esto BORRARÁ tablas y datos en la DB');
      await usedSequelize.sync({ force: true });
    } else {
      console.log('Sincronizando modelos (alter: true) — No se borrarán tablas, solo se intentará actualizar el esquema si es necesario');
      await usedSequelize.sync({ alter: true });
    }


    const clubUsesSpanish = hasAttr(ClubModel, 'nombre') || hasAttr(ClubModel, 'idClub');
    const personaUsesSpanish = hasAttr(PersonaModel, 'nombreApellido') || hasAttr(PersonaModel, 'idPersona');

 
    const clubPk = ClubModel.primaryKeyAttributes && ClubModel.primaryKeyAttributes[0] ? ClubModel.primaryKeyAttributes[0] : (clubUsesSpanish ? 'idClub' : 'id');

 
    const maxLenNombre = getAttrMaxLength(ClubModel, 'nombre', 255);
    const maxLenDireccion = getAttrMaxLength(ClubModel, 'direccion', 255);
    const maxLenTelefono = getAttrMaxLength(ClubModel, 'telefono', 20);
    const maxLenEmail = getAttrMaxLength(ClubModel, 'email', 255);
    const maxLenCuit = getAttrMaxLength(ClubModel, 'cuit', 15);
    const maxLenLogo = getAttrMaxLength(ClubModel, 'logo', 1000);

    const clubGenerator = () => {
      if (clubUsesSpanish) {
  
    const uniqueSuffix = globalClubCounter++;
   
    const emailRaw = `club${uniqueSuffix}@example.com`;
    const cuitRaw = String(10000000000 + uniqueSuffix); 

          return {
            nombre: safeTruncate(faker.company.name(), maxLenNombre),
            direccion: safeTruncate(faker.location.streetAddress(), maxLenDireccion),
            telefono: safeTruncate(faker.phone.number(), maxLenTelefono),
            email: safeTruncate(emailRaw, maxLenEmail),
            cuit: safeTruncate(cuitRaw, maxLenCuit),
            fechaAfiliacion: faker.date.past({ years: 20 }),
            estadoAfiliacion: faker.helpers.arrayElement(['ACTIVO', 'INACTIVO']),
            logo: safeTruncate(faker.image.url(), maxLenLogo),
          };
        }
      return {
        name: safeTruncate(faker.company.name(), 255),
        address: safeTruncate(faker.location.streetAddress(), 255),
        email: safeTruncate(faker.internet.email(), 255),
      };
    };

  
    try {
      const categoriaUsesSpanish = CategoriaModel && (hasAttr(CategoriaModel, 'nombre') || hasAttr(CategoriaModel, 'idCategoria'));
      const maxLenCategoriaNombre = getAttrMaxLength(CategoriaModel, 'nombre', 100);

      const categoriaGenerator = () => {
        const idx = globalCategoryCounter++;
        const nombreRaw = `Categoria ${idx} ${faker.lorem.word()}`;
        return {
          nombre: safeTruncate(nombreRaw, maxLenCategoriaNombre),
          tipo: faker.helpers.arrayElement(['categoria1', 'categoria2', 'categoria3']),
        };
      };

      if (TOTAL_CATEGORIAS > 0) {
        console.log(`Creando ${TOTAL_CATEGORIAS} categorias en lotes de ${BATCH_SIZE}...`);
        await bulkInsertInBatches(CategoriaModel, categoriaGenerator, TOTAL_CATEGORIAS, BATCH_SIZE, 'Categorias', { returnIds: false });
      }
    } catch (e) {
      console.warn('No se pudo crear categorias (modelo no disponible o error):', e && e.message ? e.message : e);
    }

   
    try {
      
      if (ClubModel && hasAttr(ClubModel, 'email')) {
        const rows = await ClubModel.findAll({ attributes: ['email'], where: { email: { [Sequelize.Op.iLike]: 'club%@example.com' } }, raw: true });
        let max = 0;
        for (const r of rows) {
          const m = String(r.email).match(/^club(\d+)@example\.com$/i);
          if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        if (max >= globalClubCounter) globalClubCounter = max + 1;
      }

      
      if (PersonaModel) {
        if (hasAttr(PersonaModel, 'email')) {
          const rowsP = await PersonaModel.findAll({ attributes: ['email'], where: { email: { [Sequelize.Op.iLike]: 'persona%@example.com' } }, raw: true });
          let maxP = 0;
          for (const r of rowsP) {
            const m = String(r.email).match(/^persona(\d+)@example\.com$/i);
            if (m) maxP = Math.max(maxP, parseInt(m[1], 10));
          }
          if (maxP >= globalPersonaEmailCounter) globalPersonaEmailCounter = maxP + 1;
        }


        if (hasAttr(PersonaModel, 'dni')) {
          const rowsD = await PersonaModel.findAll({ attributes: ['dni'], raw: true });
          let maxD = 0;
          for (const r of rowsD) {
            const m = String(r.dni).match(/^(?:0*)(\d{1,})$/);
            if (m) maxD = Math.max(maxD, parseInt(m[1], 10));
          }
          if (maxD >= globalPersonaCounter) globalPersonaCounter = maxD + 1;
        }
      }
    } catch (e) {
      console.warn('No se pudo ajustar contadores desde la DB (continuando con contadores por defecto):', e && e.message ? e.message : e);
    }

  console.log(`Creando ${TOTAL_CLUBS} clubes en lotes de ${BATCH_SIZE}...`);
  
  await bulkInsertInBatches(ClubModel, clubGenerator, TOTAL_CLUBS, BATCH_SIZE, 'Clubes', { returnIds: false });


  const clubPkAttr = ClubModel.primaryKeyAttributes && ClubModel.primaryKeyAttributes[0] ? ClubModel.primaryKeyAttributes[0] : (clubUsesSpanish ? 'idClub' : 'id');
  const clubRows = await ClubModel.findAll({ attributes: [clubPkAttr], raw: true });
  const clubIds = clubRows.map(r => r[clubPkAttr]);


  const maxLenNombreApellido = getAttrMaxLength(PersonaModel, 'nombreApellido', 255);
  const maxLenClubActual = getAttrMaxLength(PersonaModel, 'clubActual', 255);
  const maxLenLicencia = getAttrMaxLength(PersonaModel, 'licencia', 50);
  const maxLenFoto = getAttrMaxLength(PersonaModel, 'foto', 1000);
  const maxLenEmailPersona = getAttrMaxLength(PersonaModel, 'email', 255);

   
    const personaGenerator = () => {
      // Protegemos contra clubIds vacío: si no hay IDs disponibles, usar null
      const randomClubPk = (Array.isArray(clubIds) && clubIds.length > 0)
        ? faker.helpers.arrayElement(clubIds)
        : null;

      if (personaUsesSpanish) {
        
        const dniRaw = String(10000000 + (globalPersonaCounter++));
       
        const emailRaw = `persona${globalPersonaEmailCounter++}@example.com`;
        const persona = {
          nombreApellido: safeTruncate(`${faker.person.firstName()} ${faker.person.lastName()}`, maxLenNombreApellido),
          dni: safeTruncate(dniRaw, 20),
          fechaNacimiento: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
          clubActual: safeTruncate(faker.company.name(), maxLenClubActual),
          licencia: safeTruncate(faker.helpers.arrayElement(['A', 'B', 'C']), maxLenLicencia),
          fechaLicencia: faker.date.past({ years: 5 }),
          estadoLicencia: faker.helpers.arrayElement(['ACTIVO', 'INACTIVO']),
          tipo: [faker.helpers.arrayElement(['Jugador', 'Entrenador', 'Arbitro'])],
          paseClub: safeTruncate(faker.lorem.word(), 255),
          categoria: faker.helpers.arrayElement(['Senior', 'Junior', 'Infantil']),
          categoriaNivel: faker.helpers.arrayElement(['1', '2', '3']),
          numeroAfiliacion: faker.number.int({ min: 1000, max: 999999 }),
          otorgado: faker.datatype.boolean(),
          idClub: randomClubPk,
          foto: safeTruncate(faker.image.url(), maxLenFoto),
        };
        if (hasAttr(PersonaModel, 'email')) {
          persona.email = safeTruncate(emailRaw, maxLenEmailPersona);
        }
        return persona;
      }

      const emailRaw = `persona${globalPersonaEmailCounter++}@example.com`;
      return {
        firstName: safeTruncate(faker.person.firstName(), 100),
        lastName: safeTruncate(faker.person.lastName(), 100),
        email: safeTruncate(emailRaw, maxLenEmailPersona),
        clubId: randomClubPk,
      };
    };

  console.log(`Creando ${TOTAL_PERSONAS} personas en lotes de ${BATCH_SIZE}...`);
  
  await bulkInsertInBatches(PersonaModel, personaGenerator, TOTAL_PERSONAS, BATCH_SIZE, 'Personas', { returnIds: false });

    console.log('Población completada con éxito.');
  } catch (err) {
    console.error('Error durante la población:', err);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (e) {
      
      if (ClubModel && ClubModel.sequelize && ClubModel.sequelize.close) {
        try { await ClubModel.sequelize.close(); } catch (e) { }
      }
    }
  }
}

(async () => {
  console.log('Iniciando proceso de población de datos...');
  await popularDatos();
  console.log('Proceso finalizado.');
})();

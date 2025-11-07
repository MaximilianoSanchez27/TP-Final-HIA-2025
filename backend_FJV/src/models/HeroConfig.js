const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeroConfig = sequelize.define('HeroConfig', {
  // Definición de los campos
  idConfig: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_config'
  },
  eslogan: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Pasión por el Voleibol'
  },
  subTexto: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'Promoviendo el voleibol en la provincia de Jujuy desde sus bases',
    field: 'sub_texto'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  },
  fechaActualizacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_actualizacion'
  }
}, {
  tableName: 'hero_config',
  timestamps: false
});

// Validación de los campos
module.exports = HeroConfig; 
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkAreasConfig = sequelize.define('WorkAreasConfig', {
  idConfig: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  tituloSeccion: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Áreas de trabajo'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fechaActualizacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'work_areas_config',
  timestamps: false
});

module.exports = WorkAreasConfig; 
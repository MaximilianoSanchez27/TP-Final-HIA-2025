const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkArea = sequelize.define('WorkArea', {
  idArea: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  idConfig: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'work_areas_config',
      key: 'idConfig'
    }
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  icono: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'fas fa-question'
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
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
  tableName: 'work_areas',
  timestamps: false
});

module.exports = WorkArea; 
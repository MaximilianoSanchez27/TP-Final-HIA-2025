const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MomentosDestacadosConfig = sequelize.define('MomentosDestacadosConfig', {
  idConfig: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_config'
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Momentos Destacados',
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  subTitulo: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: 'Los mejores momentos del voleibol jujeño',
    field: 'sub_titulo',
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
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
  tableName: 'momentos_destacados_config',
  timestamps: true,
  createdAt: 'fechaCreacion',
  updatedAt: 'fechaActualizacion',
  hooks: {
    beforeUpdate: (config) => {
      config.fechaActualizacion = new Date();
    }
  }
});

module.exports = MomentosDestacadosConfig; 
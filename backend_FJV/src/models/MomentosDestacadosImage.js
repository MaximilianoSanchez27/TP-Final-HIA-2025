const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MomentosDestacadosImage = sequelize.define('MomentosDestacadosImage', {
  idImagen: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_imagen'
  },
  idConfig: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_config',
    references: {
      model: 'momentos_destacados_config',
      key: 'id_config'
    }
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  alt: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 150]
    }
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 6
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
  }
}, {
  tableName: 'momentos_destacados_images',
  timestamps: true,
  createdAt: 'fechaCreacion',
  updatedAt: false,
  indexes: [
    {
      fields: ['id_config', 'orden']
    },
    {
      fields: ['activo']
    }
  ]
});

module.exports = MomentosDestacadosImage; 
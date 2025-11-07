const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeroImage = sequelize.define('HeroImage', {
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
      model: 'hero_config',
      key: 'id_config'
    }
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  alt: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Imagen del hero'
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
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'hero_images',
  timestamps: false
});

module.exports = HeroImage; 
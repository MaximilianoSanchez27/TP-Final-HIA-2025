const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contacto = sequelize.define('Contacto', {
  idContacto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  horarios: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mapaEmbed: {
    type: DataTypes.TEXT, // Guarda el iframe de Google Maps o solo la URL
    allowNull: true
  },
  facebook: {
    type: DataTypes.STRING,
    allowNull: true
  },
  instagram: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'contactos',
  timestamps: true
});

module.exports = Contacto;

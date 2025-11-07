const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); 

const Club = sequelize.define('Club', {
    idClub: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    cuit: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true
    },
    fechaAfiliacion: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    estadoAfiliacion: {
        type: DataTypes.STRING(50), 
        allowNull: false
    },
    logo: {
        type: DataTypes.STRING(1000), // URLs pueden ser largas
        allowNull: true,
        comment: 'URL del logo del club almacenado en ImgBB'
    }
}, {
    tableName: 'clubs', 
    timestamps: true 
});

module.exports = Club;
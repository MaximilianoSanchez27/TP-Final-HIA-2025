const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); 

const Equipo = sequelize.define('Equipo', {
    idEquipo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nombre: { 
        type: DataTypes.STRING(255),
        allowNull: false
    },
    
    idClub: { 
        type: DataTypes.INTEGER, 
        allowNull: true,         
       
    },
    idCategoria: { 
        type: DataTypes.INTEGER, 
        allowNull: true,         
       
    },
    
    nombreDelegado: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    telefonoDelegado: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'equipos', 
    timestamps: true
});




module.exports = Equipo;
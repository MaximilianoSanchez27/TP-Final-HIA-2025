const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); 

const Persona = sequelize.define('Persona', {
    idPersona: { 
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nombreApellido: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    dni: { 
        type: DataTypes.STRING(20), 
        allowNull: false, 
        unique: true 
    },
    fechaNacimiento: { 
        type: DataTypes.DATEONLY, 
        allowNull: false 
    },
    clubActual: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
    },
    licencia: { 
        type: DataTypes.STRING(50), 
        allowNull: true 
    },
    fechaLicencia: { 
        type: DataTypes.DATEONLY, 
        allowNull: true 
    },
    fechaLicenciaBaja: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    estadoLicencia: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'INACTIVO'
    },
    tipo: { 
        type: DataTypes.ARRAY(DataTypes.STRING), 
        allowNull: true,
        defaultValue: [],
        comment: 'Roles del afiliado: Jugador, Entrenador, etc.' 
    },
    
    paseClub: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
    },
    categoria: { 
        type: DataTypes.STRING(100), 
        allowNull: true 
    },
    categoriaNivel: { 
        type: DataTypes.STRING(100), 
        allowNull: true 
    },
    numeroAfiliacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Número de afiliación opcional'
    },
    otorgado: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    idClub: { 
        type: DataTypes.INTEGER,
        allowNull: true, 
        references: {
            model: 'clubs', 
            key: 'idClub'   
        }
    },
    foto: {
        type: DataTypes.STRING(1000), // URLs pueden ser largas
        allowNull: true,
        comment: 'URL de la imagen de perfil almacenada en ImgBB'
    }
}, {
    tableName: 'personas', 
    timestamps: true 
});

module.exports = Persona;

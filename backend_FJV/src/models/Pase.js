const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pase = sequelize.define('Pase', {
    idPase: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    idPersona: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'personas',
            key: 'idPersona'
        }
    },
    clubProveniente: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nombre del club de origen (puede ser null si es el primer club)'
    },
    idClubProveniente: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'clubs',
            key: 'idClub'
        },
        comment: 'ID del club de origen (puede ser null si es el primer club)'
    },
    clubDestino: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del club de destino'
    },
    idClubDestino: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'clubs',
            key: 'idClub'
        },
        comment: 'ID del club de destino'
    },
    fechaPase: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha en que se realizó el pase'
    },
    habilitacion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PENDIENTE',
        validate: {
            isIn: [['HABILITADO', 'PENDIENTE', 'RECHAZADO']]
        },
        comment: 'Estado de habilitación del pase'
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Motivo del pase (opcional)'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Observaciones adicionales sobre el pase'
    },
    // Datos del afiliado al momento del pase (para historial)
    datosAfiliado: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Datos del afiliado al momento del pase (categoria, tipo, etc.)'
    }
}, {
    tableName: 'pases',
    timestamps: true,
    indexes: [
        {
            fields: ['idPersona']
        },
        {
            fields: ['idClubProveniente']
        },
        {
            fields: ['idClubDestino']
        },
        {
            fields: ['fechaPase']
        }
    ]
});

module.exports = Pase; 
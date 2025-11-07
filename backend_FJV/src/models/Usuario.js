const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Rol = require('./Rol');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    apellido: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            args: true,
            msg: 'El email ya está registrado en el sistema'
        },
        validate: {
            isEmail: {
                msg: 'El formato del email no es válido'
            },
            notNull: {
                msg: 'El email es obligatorio'
            },
            notEmpty: {
                msg: 'El email no puede estar vacío'
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Campos para OAuth - usando field para mapear correctamente a las columnas de la DB
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        field: 'google_id' // Mapeo a la columna google_id
    },
    linkedinId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        field: 'linkedin_id' // Mapeo a la columna linkedin_id
    },
    providerType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'provider_type'
    },
    fotoPerfil: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'foto_perfil' 
        
    },
    emailVerificado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'email_verificado' 
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'telefono'
    },
    address: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'direccion',
        comment: 'Almacena la dirección como un objeto JSON: { street, city, state, zipCode, country }'
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    underscored: true, 
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.password) {
                const salt = await bcrypt.genSalt(10);
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ]
});

// Método para comparar contraseñas
Usuario.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Usuario;

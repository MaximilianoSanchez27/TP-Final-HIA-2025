const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Credencial = sequelize.define('Credencial', {
    idCredencial: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    identificador: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Código único de identificación para la credencial',
        validate: {
            notEmpty: {
                msg: "El identificador no puede estar vacío"
            }
        }
    },
    fechaAlta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha de emisión de la credencial (referencia a fechaLicencia de Persona)',
        validate: {
            isDate: {
                msg: "La fecha de alta debe ser una fecha válida"
            },
            notEmpty: {
                msg: "La fecha de alta no puede estar vacía"
            }
        }
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha en la que vence la credencial (referencia a fechaLicenciaBaja de Persona)',
        validate: {
            isDate: {
                msg: "La fecha de vencimiento debe ser una fecha válida"
            },
            isAfterFechaAlta(value) {
                if (new Date(value) <= new Date(this.fechaAlta)) {
                    throw new Error('La fecha de vencimiento debe ser posterior a la fecha de alta');
                }
            }
        }
    },
    estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'ACTIVO',
        comment: 'Estado de la credencial: ACTIVO, INACTIVO, SUSPENDIDO, VENCIDO',
        validate: {
            isIn: {
                args: [['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'VENCIDO']],
                msg: "Estado solo puede ser ACTIVO, INACTIVO, SUSPENDIDO o VENCIDO"
            }
        }
    },
    motivoSuspension: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Motivo de suspensión si el estado es SUSPENDIDO'
    },
    idPersona: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'personas',
            key: 'idPersona'
        },
        comment: 'ID de la persona a la que pertenece esta credencial',
        validate: {
            notNull: {
                msg: "El ID de persona es obligatorio"
            }
        }
    }
}, {
    tableName: 'credenciales',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['identificador'],
            name: 'credenciales_identificador_unique'
        }
    ],
    hooks: {
        beforeValidate: (credencial) => {
            // Asegurar que fechaVencimiento sea 1 año después de fechaAlta
            if (credencial.fechaAlta && (!credencial.fechaVencimiento || credencial.isNewRecord)) {
                const fechaVencimiento = new Date(credencial.fechaAlta);
                fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
                credencial.fechaVencimiento = fechaVencimiento.toISOString().split('T')[0];
            }
            
            // Actualizar estado según fechas, pero no sobrescribir SUSPENDIDO
            if (credencial.fechaVencimiento && credencial.estado !== 'SUSPENDIDO') {
                const ahora = new Date();
                const vencimiento = new Date(credencial.fechaVencimiento);
                
                // Si la fecha de vencimiento ya pasó, marcar como VENCIDO
                if (vencimiento < ahora) {
                    credencial.estado = 'VENCIDO';
                } else {
                    // Si no está suspendido y no venció, está activo
                    credencial.estado = 'ACTIVO';
                }
            }
        }
    }
});

module.exports = Credencial;

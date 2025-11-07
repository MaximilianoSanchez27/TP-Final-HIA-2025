const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pago = sequelize.define('Pago', {
    idPago: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    idCobro: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cobros',
            key: 'idCobro'
        },
        comment: 'ID del cobro asociado a este pago'
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Monto del pago'
    },
    estado: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Pendiente',
        comment: 'Estado del pago: Pendiente, Pagado, Rechazado, Anulado, etc.'
    },
    paymentId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID del pago en el sistema externo (MercadoPago, etc.)'
    },
    preferenceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID de la preferencia de pago en MercadoPago'
    },
    metodoPago: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'MercadoPago',
        comment: 'Método de pago utilizado'
    },
    datosExtra: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos adicionales del pago en formato JSON'
    },
    fechaPago: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se registró el pago exitoso'
    }
}, {
    tableName: 'pagos',
    timestamps: true,
    hooks: {
        beforeCreate: (pago) => {
            if (pago.estado === 'Pagado' && !pago.fechaPago) {
                pago.fechaPago = new Date();
            }
        },
        beforeUpdate: (pago) => {
            if (pago.changed('estado') && pago.estado === 'Pagado' && !pago.fechaPago) {
                pago.fechaPago = new Date();
            }
        }
    }
});

module.exports = Pago;

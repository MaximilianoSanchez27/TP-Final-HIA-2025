const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cobro = sequelize.define('Cobro', {
    idCobro: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    concepto: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: true,
            min: 0
        }
    },
    fechaCobro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    estado: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Pendiente',
        validate: {
            isIn: [['Pendiente', 'Pagado', 'Vencido', 'Anulado']]
        }
    },
    comprobantePago: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Número/código de comprobante de pago'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    preferenciaMP: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID de preferencia de MercadoPago para pagos online'
    },
    fechaPago: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se registró el pago'
    },
    // Referencias
    idClub: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'clubs',
            key: 'idClub'
        }
    },
    idEquipo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'equipos',
            key: 'idEquipo'
        }
    }
}, {
    tableName: 'cobros',
    timestamps: true,
    hooks: {
        beforeUpdate: (cobro) => {
            if (cobro.changed('estado') && cobro.estado === 'Pagado' && !cobro.fechaPago) {
                cobro.fechaPago = new Date();
            }
        }
    }
});

module.exports = Cobro;

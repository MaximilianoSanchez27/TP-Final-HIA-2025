const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PublicPaymentLink = sequelize.define("PublicPaymentLink", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  cobroId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'cobros',
      key: 'idCobro'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'URL amigable basada en el concepto del cobro'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Indica si el enlace está activo y puede ser usado'
  },
  expirationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de expiración del enlace (opcional)'
  },
  accessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Contador de accesos al enlace'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: "public_payment_links",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['cobroId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    }
  ],
  comment: 'Enlaces públicos para pagos sin autenticación'
});

module.exports = PublicPaymentLink; 
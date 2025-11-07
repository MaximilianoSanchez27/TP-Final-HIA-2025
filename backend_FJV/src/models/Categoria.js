const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Importa la instancia así

const Categoria = sequelize.define('Categoria', {
    idCategoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    tipo: {
        type: DataTypes.ENUM('categoria1', 'categoria2', 'categoria3'),
        allowNull: false
    }
}, {
    tableName: 'categorias',
    timestamps: true
});

module.exports = Categoria;
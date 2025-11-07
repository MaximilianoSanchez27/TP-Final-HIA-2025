const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NoticiaVistas = sequelize.define('NoticiaVistas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    noticiaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'noticias',
            key: 'idNoticia'
        },
        onDelete: 'CASCADE'
    },
    ip: {
        type: DataTypes.STRING(45), 
        allowNull: false
    }
}, {
    tableName: 'noticia_vistas',
    timestamps: true
});

module.exports = NoticiaVistas;

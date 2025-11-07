const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Noticia = sequelize.define('Noticia', {
    idNoticia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING(300),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El título no puede estar vacío'
            },
            len: {
                args: [3, 300],
                msg: 'El título debe tener entre 3 y 300 caracteres'
            }
        }
    },
    resumen: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'El resumen no puede exceder los 500 caracteres'
            }
        }
    },
    // Sistema de bloques para contenido mixto
    bloques: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array de bloques de contenido: texto, imagen, galería, etc.',
        validate: {
            isValidBloques(value) {
                if (!Array.isArray(value)) {
                    throw new Error('Los bloques deben ser un array');
                }
                
                // Validar que al menos haya un bloque
                if (value.length === 0) {
                    throw new Error('Debe haber al menos un bloque de contenido');
                }
                
                // Validar estructura de cada bloque
                for (let i = 0; i < value.length; i++) {
                    const bloque = value[i];
                    
                    if (!bloque.tipo || !bloque.orden) {
                        throw new Error(`Bloque ${i + 1}: tipo y orden son obligatorios`);
                    }
                    
                    // Validar según tipo de bloque
                    switch (bloque.tipo) {
                        case 'texto':
                            if (!bloque.contenido || bloque.contenido.trim() === '') {
                                throw new Error(`Bloque ${i + 1}: el contenido de texto no puede estar vacío`);
                            }
                            break;
                        case 'imagen':
                            if (!bloque.url) {
                                throw new Error(`Bloque ${i + 1}: la URL de la imagen es obligatoria`);
                            }
                            // Validar URL básica
                            try {
                                new URL(bloque.url);
                            } catch {
                                throw new Error(`Bloque ${i + 1}: URL de imagen inválida`);
                            }
                            break;
                        case 'galeria':
                            if (!Array.isArray(bloque.imagenes) || bloque.imagenes.length === 0) {
                                throw new Error(`Bloque ${i + 1}: la galería debe tener al menos una imagen`);
                            }
                            break;
                        default:
                            throw new Error(`Bloque ${i + 1}: tipo de bloque no válido`);
                    }
                }
            }
        }
    },
    // Campos opcionales para compatibilidad y SEO
    imagenPrincipal: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: 'URL de imagen principal para vista previa y redes sociales'
    },
    imagenPrincipalAlt: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Texto alternativo para la imagen principal'
    },
    estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'BORRADOR',
        comment: 'Estado de la noticia: ACTIVO (publicada), INACTIVO (despublicada), BORRADOR',
        validate: {
            isIn: {
                args: [['ACTIVO', 'INACTIVO', 'BORRADOR']],
                msg: "El estado debe ser: ACTIVO, INACTIVO o BORRADOR"
            }
        }
    },
    fechaPublicacion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se publicó la noticia (null si es borrador)'
    },
    fechaProgramada: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha programada para publicación automática'
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isIn: {
                args: [['GENERAL', 'DEPORTES', 'EVENTOS', 'TORNEOS', 'INSTITUCIONAL', 'RESULTADOS']],
                msg: "La categoría debe ser: GENERAL, DEPORTES, EVENTOS, TORNEOS, INSTITUCIONAL o RESULTADOS"
            }
        },
        defaultValue: 'GENERAL'
    },
    etiquetas: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Etiquetas separadas por comas para SEO y búsqueda'
    },
    destacado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si la noticia aparece destacada en la página principal'
    },
    vistas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de vistas de la noticia'
    },
    autorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        comment: 'ID del usuario que creó la noticia'
    },
    editorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        comment: 'ID del último usuario que editó la noticia'
    },
    contenido: {
        type: DataTypes.TEXT,
      },
    // Añadir campo slug para URLs amigables
    slug: {
        type: DataTypes.STRING(350),
        allowNull: true,
        comment: 'Slug generado a partir del título para URLs amigables'
    }
}, {
    tableName: 'noticias',
    timestamps: true,
    hooks: {
        beforeValidate: (noticia) => {
            // Generar slug automáticamente del título si no se proporciona
            if (noticia.titulo && (!noticia.slug || noticia.isNewRecord || noticia.changed('titulo'))) {
                noticia.slug = noticia.titulo
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
            }
        },
        beforeCreate: (noticia) => {
            // Si se publica directamente, establecer fecha de publicación
            if (noticia.estado === 'ACTIVO' && !noticia.fechaPublicacion) {
                noticia.fechaPublicacion = new Date();
            }
            
            // Extraer imagen principal del primer bloque de imagen si no se especifica
            if (!noticia.imagenPrincipal && noticia.bloques && noticia.bloques.length > 0) {
                const primerBloqueImagen = noticia.bloques.find(bloque => bloque.tipo === 'imagen');
                if (primerBloqueImagen) {
                    noticia.imagenPrincipal = primerBloqueImagen.url;
                    noticia.imagenPrincipalAlt = primerBloqueImagen.alt || '';
                }
            }
        },
        beforeUpdate: (noticia) => {
            // Si cambia de borrador/inactivo a activo, establecer fecha de publicación
            if (noticia.estado === 'ACTIVO' && !noticia.fechaPublicacion) {
                noticia.fechaPublicacion = new Date();
            }
        }
    }
});

module.exports = Noticia;

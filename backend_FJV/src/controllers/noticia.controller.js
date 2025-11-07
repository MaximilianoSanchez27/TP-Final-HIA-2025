const Noticia = require('../models/Noticia');
const Usuario = require('../models/Usuario');
const NoticiaVistas = require('../models/NoticiaVistas');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const imgbbService = require('../services/imgbb.service');

const noticiaCtrl = {};

/**
 * Obtener todas las noticias (público)
 * Solo devuelve noticias activas para usuarios no admin
 */
noticiaCtrl.getNoticias = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Obtener todas las noticias'
    #swagger.description = 'Retorna noticias. Para usuarios públicos solo las activas, para admin todas según parámetros.'
    */
    try {
        const { estado, categoria, destacado, limit = 10, page = 1, buscar } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Construir filtros
        let where = {};
        
        // Si es admin, puede ver todas las noticias según filtros
        if (req.user && req.user.rol && req.user.rol.nombre === 'admin') {
            if (estado) where.estado = estado;
        } else {
            // Para usuarios públicos, solo noticias activas
            where.estado = 'ACTIVO';
        }
        
        if (categoria) where.categoria = categoria;
        if (destacado !== undefined) where.destacado = destacado === 'true';
        
        // Búsqueda por texto
        if (buscar) {
            where[Op.or] = [
                { titulo: { [Op.iLike]: `%${buscar}%` } },
                { resumen: { [Op.iLike]: `%${buscar}%` } },
                { contenido: { [Op.iLike]: `%${buscar}%` } },
                { etiquetas: { [Op.iLike]: `%${buscar}%` } }
            ];
        }
        
        const noticias = await Noticia.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'autor',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                },
                {
                    model: Usuario,
                    as: 'editor',
                    attributes: ['id', 'nombre', 'apellido'],
                    required: false
                }
            ],
            order: [
                ['destacado', 'DESC'],
                ['fechaPublicacion', 'DESC'],
                ['createdAt', 'DESC']
            ],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });
        
        res.status(200).json({
            status: "1",
            noticias: noticias.rows,
            pagination: {
                totalItems: noticias.count,
                totalPages: Math.ceil(noticias.count / parseInt(limit)),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error("Error en getNoticias:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al obtener noticias",
            error: error.message
        });
    }
};

/**
 * Obtener noticia por ID e incrementar vistas
 */
noticiaCtrl.getNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Obtener noticia por ID'
    #swagger.description = 'Obtiene una noticia específica e incrementa el contador de vistas si la IP no ha sido registrada previamente.'
    */
    try {
        const { id } = req.params;
        const ip = req.ip; 

        // Validar que el ID sea un número
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return res.status(400).json({
                status: "0",
                msg: "El ID de la noticia debe ser un número"
            });
        }

        const noticia = await Noticia.findByPk(idNum, {
            include: [
                {
                    model: Usuario,
                    as: 'autor',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                },
                {
                    model: Usuario,
                    as: 'editor',
                    attributes: ['id', 'nombre', 'apellido'],
                    required: false
                }
            ]
        });

        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }

        // Verificar permisos: solo admin puede ver noticias no activas
        if (noticia.estado !== 'ACTIVO' && 
            (!req.user || !req.user.rol || req.user.rol.nombre !== 'admin')) {
            return res.status(403).json({
                status: "0",
                msg: "No tienes permisos para ver esta noticia"
            });
        }

        // Incrementar contador de vistas si la IP no está registrada
        const vistaExistente = await NoticiaVistas.findOne({
            where: { noticiaId: idNum, ip }
        });

        if (!vistaExistente) {
            await NoticiaVistas.create({ noticiaId: idNum, ip });
            await noticia.increment('vistas');
        }

        res.status(200).json({
            status: "1",
            noticia
        });
    } catch (error) {
        console.error("Error en getNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al obtener la noticia",
            error: error.message
        });
    }
};

/**
 * Crear nueva noticia (Solo Admin)
 */
noticiaCtrl.crearNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Crear nueva noticia'
    #swagger.description = 'Crea una nueva noticia (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const {
            titulo,
            resumen,
            bloques, // Nuevo campo principal
            imagenPrincipal, // Opcional para SEO
            imagenPrincipalAlt,
            estado = 'BORRADOR',
            fechaProgramada,
            categoria = 'GENERAL',
            etiquetas,
            destacado = false
        } = req.body;
        
        // Validaciones básicas
        if (!titulo || titulo.trim() === '') {
            return res.status(400).json({
                status: "0",
                msg: "El título es obligatorio"
            });
        }
        
        if (!bloques || !Array.isArray(bloques) || bloques.length === 0) {
            return res.status(400).json({
                status: "0",
                msg: "Debe proporcionar al menos un bloque de contenido"
            });
        }
        
        // Validar y procesar bloques
        const bloquesValidados = await validarYProcesarBloques(bloques);
        if (bloquesValidados.error) {
            return res.status(400).json({
                status: "0",
                msg: bloquesValidados.error
            });
        }
        
        // Validar imagen principal si se proporciona
        if (imagenPrincipal && !isValidUrl(imagenPrincipal)) {
            return res.status(400).json({
                status: "0",
                msg: "La URL de la imagen principal no es válida"
            });
        }
        
        const noticia = await Noticia.create({
            titulo: titulo.trim(),
            resumen: resumen ? resumen.trim() : null,
            bloques: bloquesValidados.bloques,
            imagenPrincipal,
            imagenPrincipalAlt,
            estado,
            fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
            categoria,
            etiquetas,
            destacado: Boolean(destacado),
            autorId: req.user.id
        });
        
        // Recargar con las relaciones
        const noticiaCompleta = await Noticia.findByPk(noticia.idNoticia, {
            include: [
                {
                    model: Usuario,
                    as: 'autor',
                    attributes: ['id', 'nombre', 'apellido']
                }
            ]
        });
        
        res.status(201).json({
            status: "1",
            msg: "Noticia creada exitosamente",
            noticia: noticiaCompleta
        });
    } catch (error) {
        console.error("Error en crearNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al crear la noticia",
            error: error.message
        });
    }
};

/**
 * Actualizar noticia (Solo Admin)
 */
noticiaCtrl.actualizarNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Actualizar noticia'
    #swagger.description = 'Actualiza una noticia existente (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const { id } = req.params;
        const {
            titulo,
            resumen,
            bloques,
            imagenPrincipal,
            imagenPrincipalAlt,
            estado,
            fechaProgramada,
            categoria,
            etiquetas,
            destacado
        } = req.body;
        
        const noticia = await Noticia.findByPk(id);
        
        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }
        
        // Preparar datos de actualización
        const datosActualizacion = {
            editorId: req.user.id
        };
        
        if (titulo !== undefined) datosActualizacion.titulo = titulo.trim();
        if (resumen !== undefined) datosActualizacion.resumen = resumen ? resumen.trim() : null;
        
        // Validar y procesar bloques si se proporcionan
        if (bloques !== undefined) {
            if (!Array.isArray(bloques) || bloques.length === 0) {
                return res.status(400).json({
                    status: "0",
                    msg: "Debe proporcionar al menos un bloque de contenido"
                });
            }
            
            const bloquesValidados = await validarYProcesarBloques(bloques);
            if (bloquesValidados.error) {
                return res.status(400).json({
                    status: "0",
                    msg: bloquesValidados.error
                });
            }
            
            datosActualizacion.bloques = bloquesValidados.bloques;
        }
        
        if (imagenPrincipal !== undefined) {
            if (imagenPrincipal && !isValidUrl(imagenPrincipal)) {
                return res.status(400).json({
                    status: "0",
                    msg: "La URL de la imagen principal no es válida"
                });
            }
            datosActualizacion.imagenPrincipal = imagenPrincipal;
        }
        
        if (imagenPrincipalAlt !== undefined) datosActualizacion.imagenPrincipalAlt = imagenPrincipalAlt;
        if (estado !== undefined) datosActualizacion.estado = estado;
        if (fechaProgramada !== undefined) datosActualizacion.fechaProgramada = fechaProgramada ? new Date(fechaProgramada) : null;
        if (categoria !== undefined) datosActualizacion.categoria = categoria;
        if (etiquetas !== undefined) datosActualizacion.etiquetas = etiquetas;
        if (destacado !== undefined) datosActualizacion.destacado = Boolean(destacado);
        
        await noticia.update(datosActualizacion);
        
        // Recargar con relaciones
        const noticiaActualizada = await Noticia.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: 'autor',
                    attributes: ['id', 'nombre', 'apellido']
                },
                {
                    model: Usuario,
                    as: 'editor',
                    attributes: ['id', 'nombre', 'apellido'],
                    required: false
                }
            ]
        });
        
        res.status(200).json({
            status: "1",
            msg: "Noticia actualizada exitosamente",
            noticia: noticiaActualizada
        });
    } catch (error) {
        console.error("Error en actualizarNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al actualizar la noticia",
            error: error.message
        });
    }
};

/**
 * Eliminar noticia (Solo Admin)
 */
noticiaCtrl.eliminarNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Eliminar noticia'
    #swagger.description = 'Elimina permanentemente una noticia (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const { id } = req.params;
        
        const noticia = await Noticia.findByPk(id);
        
        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }
        
        await noticia.destroy();
        
        res.status(200).json({
            status: "1",
            msg: "Noticia eliminada exitosamente"
        });
    } catch (error) {
        console.error("Error en eliminarNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al eliminar la noticia",
            error: error.message
        });
    }
};

/**
 * Cambiar estado de noticia (Solo Admin)
 */
noticiaCtrl.cambiarEstado = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Cambiar estado de noticia'
    #swagger.description = 'Cambia el estado de una noticia (ACTIVO/INACTIVO/BORRADOR)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!['ACTIVO', 'INACTIVO', 'BORRADOR'].includes(estado)) {
            return res.status(400).json({
                status: "0",
                msg: "Estado inválido. Debe ser ACTIVO, INACTIVO o BORRADOR"
            });
        }
        
        const noticia = await Noticia.findByPk(id);
        
        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }
        
        await noticia.update({ 
            estado,
            editorId: req.user.id 
        });
        
        res.status(200).json({
            status: "1",
            msg: `Noticia ${estado.toLowerCase()} exitosamente`,
            noticia
        });
    } catch (error) {
        console.error("Error en cambiarEstado:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al cambiar el estado de la noticia",
            error: error.message
        });
    }
};

/**
 * Obtener categorías disponibles
 */
noticiaCtrl.getCategorias = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Obtener categorías'
    #swagger.description = 'Retorna las categorías disponibles para noticias'
    */
    try {
        const categorias = ['GENERAL', 'DEPORTES', 'EVENTOS', 'TORNEOS', 'INSTITUCIONAL', 'RESULTADOS'];
        
        res.status(200).json({
            status: "1",
            categorias: categorias.map(cat => ({
                valor: cat,
                etiqueta: cat.charAt(0) + cat.slice(1).toLowerCase()
            }))
        });
    } catch (error) {
        console.error("Error en getCategorias:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al obtener categorías",
            error: error.message
        });
    }
};

/**
 * Obtener estadísticas de noticias (Solo Admin)
 */
noticiaCtrl.getEstadisticas = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Obtener estadísticas'
    #swagger.description = 'Obtiene estadísticas de noticias (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        console.log('Procesando solicitud de estadísticas...');
        
        // Estadísticas generales
        const estadisticasGenerales = await sequelize.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN estado = 'ACTIVO' THEN 1 END) as activas,
                COUNT(CASE WHEN estado = 'INACTIVO' THEN 1 END) as inactivas,
                COUNT(CASE WHEN estado = 'BORRADOR' THEN 1 END) as borradores,
                COUNT(CASE WHEN destacado = true THEN 1 END) as destacadas,
                COALESCE(SUM(vistas), 0) as total_vistas,
                COALESCE(AVG(vistas), 0) as promedio_vistas
            FROM noticias
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Estadísticas por categoría con más detalle
        const estadisticasPorCategoria = await sequelize.query(`
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                COALESCE(SUM(vistas), 0) as vistas
            FROM noticias 
            WHERE estado = 'ACTIVO'
            GROUP BY categoria
            ORDER BY COUNT(*) DESC
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Estadísticas mensuales de los últimos 6 meses
        const estadisticasMensuales = await sequelize.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as mes,
                COUNT(*) as cantidad,
                COALESCE(SUM(vistas), 0) as vistas
            FROM noticias
            WHERE "createdAt" >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon'), DATE_TRUNC('month', "createdAt")
            ORDER BY DATE_TRUNC('month', "createdAt") ASC
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Calcular vistas del último mes
        const unMesAtras = new Date();
        unMesAtras.setMonth(unMesAtras.getMonth() - 1);
        
        const vistasMesActual = await sequelize.query(`
            SELECT COALESCE(SUM(vistas), 0) as vistas_este_mes
            FROM noticias
            WHERE "createdAt" >= :primerDiaMes
        `, { 
            replacements: { primerDiaMes: unMesAtras.toISOString() },
            type: sequelize.QueryTypes.SELECT 
        });
        
        // Adaptamos el formato de las estadísticas para coincidir con lo que espera el frontend
        const estadisticas = {
            totalNoticias: parseInt(estadisticasGenerales[0].total) || 0,
            activas: parseInt(estadisticasGenerales[0].activas) || 0,
            inactivas: parseInt(estadisticasGenerales[0].inactivas) || 0,
            borradores: parseInt(estadisticasGenerales[0].borradores) || 0,
            destacadas: parseInt(estadisticasGenerales[0].destacadas) || 0,
            vistasTotal: parseInt(estadisticasGenerales[0].total_vistas) || 0,
            ultimoMes: parseInt(vistasMesActual[0].vistas_este_mes) || 0,
            
            // Datos para el gráfico de categorías
            porCategoria: estadisticasPorCategoria.map(cat => ({
                categoria: cat.categoria,
                cantidad: parseInt(cat.cantidad),
                vistas: parseInt(cat.vistas) || 0
            })),
            
            // Datos para el gráfico mensual
            porMes: estadisticasMensuales.map(mes => ({
                mes: mes.mes,
                cantidad: parseInt(mes.cantidad),
                vistas: parseInt(mes.vistas) || 0
            }))
        };
        
        // Información adicional para los gráficos avanzados (opcional)
        const estadisticasAvanzadas = {
            // Las noticias más vistas (tendencia general)
            topNoticias: await sequelize.query(`
                SELECT 
                    "idNoticia",
                    titulo,
                    categoria,
                    vistas
                FROM noticias
                WHERE estado = 'ACTIVO'
                ORDER BY vistas DESC
                LIMIT 10
            `, { type: sequelize.QueryTypes.SELECT }),
            
            // Distribución de vistas por día de la semana
            vistasPorDiaSemana: await sequelize.query(`
                SELECT 
                    EXTRACT(DOW FROM "fechaPublicacion") as dia,
                    TO_CHAR("fechaPublicacion", 'Day') as nombre_dia,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(vistas), 0) as vistas
                FROM noticias
                WHERE estado = 'ACTIVO' AND "fechaPublicacion" IS NOT NULL
                GROUP BY EXTRACT(DOW FROM "fechaPublicacion"), TO_CHAR("fechaPublicacion", 'Day')
                ORDER BY EXTRACT(DOW FROM "fechaPublicacion")
            `, { type: sequelize.QueryTypes.SELECT })
        };

        console.log('Estadísticas generadas correctamente');
        
        // Devolvemos el formato que espera el frontend
        res.status(200).json({ 
            status: "success", 
            msg: "Estadísticas obtenidas correctamente", 
            estadisticas,
            estadisticasAvanzadas
        });
    } catch (error) {
        console.error("Error en getEstadisticas:", error);
        res.status(500).json({
            status: "error",
            msg: "Error al obtener estadísticas",
            error: error.message
        });
    }
};

/**
 * Buscar noticia por URL amigable (slug)
 * Permite encontrar una noticia usando la categoría y un slug generado del título
 */
noticiaCtrl.buscarPorUrl = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Buscar noticia por URL amigable'
    #swagger.description = 'Busca una noticia específica usando categoría y slug generado del título'
    #swagger.parameters['categoria'] = {
        in: 'query',
        description: 'Categoría de la noticia',
        required: true,
        type: 'string'
    }
    #swagger.parameters['slug'] = {
        in: 'query',
        description: 'Slug generado del título',
        required: true,
        type: 'string'
    }
    */
    try {
        const { categoria, slug } = req.query;
        
        if (!categoria || !slug) {
            return res.status(400).json({
                status: "0",
                msg: "La categoría y el slug son obligatorios"
            });
        }
        
        // Buscar por coincidencia aproximada en título usando el slug
        // y filtrando por categoría
        const noticias = await Noticia.findAll({
            where: {
                categoria,
                // El título debe tener todas las palabras del slug
                titulo: {
                    [Op.iLike]: `%${slug.split('-').join('%')}%`
                },
                // Para usuarios públicos, solo mostrar noticias activas
                ...((!req.user || req.user.rol.nombre !== 'admin') ? { estado: 'ACTIVO' } : {})
            },
            include: [
                {
                    model: Usuario,
                    as: 'autor',
                    attributes: ['id', 'nombre', 'apellido', 'email']
                },
                {
                    model: Usuario,
                    as: 'editor',
                    attributes: ['id', 'nombre', 'apellido'],
                    required: false
                }
            ],
            limit: 1 
        });
        
        // Si no se encontró ninguna noticia
        if (noticias.length === 0) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }
        
        const noticia = noticias[0];
        
        // Incrementar contador de vistas solo si no es admin
        if (!req.user || req.user.rol.nombre !== 'admin') {
            await noticia.increment('vistas');
        }
        
        res.status(200).json({
            status: "1",
            noticia
        });
    } catch (error) {
        console.error("Error en buscarPorUrl:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al obtener la noticia",
            error: error.message
        });
    }
};

/**
 * Generar slug para URL amigable a partir de un título
 */
noticiaCtrl.generarSlug = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Generar slug para URL amigable'
    #swagger.description = 'Genera un slug amigable para URLs a partir del título proporcionado'
    */
    try {
        const { titulo } = req.query;
        
        if (!titulo) {
            return res.status(400).json({
                status: "0",
                msg: "El título es obligatorio"
            });
        }
        
        // Generar slug: convertir a minúsculas, reemplazar caracteres especiales y espacios
        const slug = titulo
            .toLowerCase()
            .normalize('NFD')  
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '') 
            .replace(/\s+/g, '-') 
            .replace(/-+/g, '-')  
            .trim();  
        
        res.status(200).json({
            status: "1",
            slug,
            tituloOriginal: titulo
        });
    } catch (error) {
        console.error("Error en generarSlug:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al generar slug",
            error: error.message
        });
    }
};

/**
 * Subir imagen para noticia a ImgBB (Solo Admin)
 */
noticiaCtrl.subirImagen = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Subir imagen para noticia'
    #swagger.description = 'Sube una imagen a ImgBB para usar en noticias (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['imagen'] = {
        in: 'formData',
        description: 'Archivo de imagen a subir',
        required: true,
        type: 'file'
    }
    */
    try {
        // Verificar si se procesó la imagen correctamente en el middleware
        if (!req.imgbbData) {
            return res.status(400).json({
                status: "0",
                msg: "No se recibió ninguna imagen para procesar"
            });
        }
        
        res.status(200).json({
            status: "1",
            msg: "Imagen subida exitosamente",
            imagen: req.imgbbData
        });
    } catch (error) {
        console.error("Error en subirImagen:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al subir la imagen",
            error: error.message
        });
    }
};

/**
 * Eliminar imagen de ImgBB (Solo Admin)
 */
noticiaCtrl.eliminarImagen = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Eliminar imagen'
    #swagger.description = 'Elimina una imagen de ImgBB usando su URL de eliminación (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const { deleteUrl } = req.body;
        
        if (!deleteUrl) {
            return res.status(400).json({
                status: "0",
                msg: "URL de eliminación no proporcionada"
            });
        }
        
        const resultado = await imgbbService.deleteImage(deleteUrl);
        
        if (resultado.success) {
            res.status(200).json({
                status: "1",
                msg: "Imagen eliminada exitosamente"
            });
        } else {
            res.status(400).json({
                status: "0",
                msg: "Error al eliminar la imagen",
                error: resultado.error
            });
        }
    } catch (error) {
        console.error("Error en eliminarImagen:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al eliminar la imagen",
            error: error.message
        });
    }
};

/**
 * Obtener vistas de una noticia específica (Solo Admin)
 */
noticiaCtrl.getVistasNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Obtener vistas de noticia'
    #swagger.description = 'Obtiene el historial de vistas de una noticia específica (solo administradores)'
    #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const { id } = req.params;
        
        // Validar que el ID sea un número
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return res.status(400).json({
                status: "0",
                msg: "El ID de la noticia debe ser un número"
            });
        }

        // Verificar que la noticia existe
        const noticia = await Noticia.findByPk(idNum);
        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }

        // Obtener todas las vistas de la noticia
        const vistas = await NoticiaVistas.findAll({
            where: { noticiaId: idNum },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: "1",
            noticia: {
                id: noticia.id,
                titulo: noticia.titulo,
                vistas: noticia.vistas
            },
            historialVistas: vistas,
            totalVistas: vistas.length
        });
    } catch (error) {
        console.error("Error en getVistasNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al obtener las vistas de la noticia",
            error: error.message
        });
    }
};

/**
 * Registrar una nueva vista de noticia
 */
noticiaCtrl.registrarVistaNoticia = async (req, res) => {
    /*
    #swagger.tags = ['Noticias']
    #swagger.summary = 'Registrar vista de noticia'
    #swagger.description = 'Registra una nueva vista de noticia desde una IP específica'
    */
    try {
        const { id } = req.params;
        const ip = req.ip;

        // Validar que el ID sea un número
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return res.status(400).json({
                status: "0",
                msg: "El ID de la noticia debe ser un número"
            });
        }

        // Verificar que la noticia existe y está activa
        const noticia = await Noticia.findByPk(idNum);
        if (!noticia) {
            return res.status(404).json({
                status: "0",
                msg: "Noticia no encontrada"
            });
        }

        // Solo registrar vista si la noticia está activa o si es admin
        if (noticia.estado !== 'ACTIVO' && 
            (!req.user || !req.user.rol || req.user.rol.nombre !== 'admin')) {
            return res.status(403).json({
                status: "0",
                msg: "No tienes permisos para ver esta noticia"
            });
        }

        // Verificar si ya existe una vista desde esta IP para esta noticia
        const vistaExistente = await NoticiaVistas.findOne({
            where: { noticiaId: idNum, ip }
        });

        if (!vistaExistente) {
            // Crear nueva vista
            await NoticiaVistas.create({ noticiaId: idNum, ip });
            
            // Incrementar contador de vistas en la noticia
            await noticia.increment('vistas');
            
            res.status(200).json({
                status: "1",
                msg: "Vista registrada exitosamente",
                nuevaVista: true
            });
        } else {
            res.status(200).json({
                status: "1",
                msg: "Vista ya registrada anteriormente",
                nuevaVista: false
            });
        }
    } catch (error) {
        console.error("Error en registrarVistaNoticia:", error);
        res.status(500).json({
            status: "0",
            msg: "Error al registrar la vista",
            error: error.message
        });
    }
};

/**
 * Función auxiliar para validar y procesar bloques de contenido
 */
async function validarYProcesarBloques(bloques) {
    try {
        // Ordenar bloques por orden
        const bloquesOrdenados = bloques.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        
        // Validar cada bloque
        for (let i = 0; i < bloquesOrdenados.length; i++) {
            const bloque = bloquesOrdenados[i];
            
            // Asignar orden si no existe
            if (!bloque.orden) {
                bloque.orden = i + 1;
            }
            
            // Validar según tipo
            switch (bloque.tipo) {
                case 'texto':
                    if (!bloque.contenido || bloque.contenido.trim() === '') {
                        return { error: `Bloque ${i + 1}: El contenido de texto no puede estar vacío` };
                    }
                    // Limpiar contenido
                    bloque.contenido = bloque.contenido.trim();
                    break;
                    
                case 'imagen':
                    if (!bloque.url) {
                        return { error: `Bloque ${i + 1}: La URL de la imagen es obligatoria` };
                    }
                    if (!isValidUrl(bloque.url)) {
                        return { error: `Bloque ${i + 1}: URL de imagen inválida` };
                    }
                    // Campos opcionales con valores por defecto
                    bloque.alt = bloque.alt || '';
                    bloque.caption = bloque.caption || '';
                    bloque.ancho = bloque.ancho || 'auto';
                    bloque.alineacion = bloque.alineacion || 'center';
                    break;
                    
                case 'galeria':
                    if (!Array.isArray(bloque.imagenes) || bloque.imagenes.length === 0) {
                        return { error: `Bloque ${i + 1}: La galería debe tener al menos una imagen` };
                    }
                    // Validar cada imagen de la galería
                    for (let j = 0; j < bloque.imagenes.length; j++) {
                        const imagen = bloque.imagenes[j];
                        if (!imagen.url || !isValidUrl(imagen.url)) {
                            return { error: `Bloque ${i + 1}, imagen ${j + 1}: URL inválida` };
                        }
                        imagen.alt = imagen.alt || '';
                        imagen.caption = imagen.caption || '';
                    }
                    bloque.columnas = bloque.columnas || 2; 
                    break;
                    
                default:
                    return { error: `Bloque ${i + 1}: Tipo de bloque '${bloque.tipo}' no válido` };
            }
        }
        
        return { bloques: bloquesOrdenados };
    } catch (error) {
        return { error: `Error procesando bloques: ${error.message}` };
    }
}

// Función auxiliar para validar URLs
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = noticiaCtrl;
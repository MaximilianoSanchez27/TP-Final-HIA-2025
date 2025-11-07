const Persona = require('../models/Persona');
const Club = require('../models/Club');
const Pase = require('../models/Pase');
const Pago = require('../models/Pago');
const Cobro = require('../models/Cobro');
const Credencial = require('../models/Credencial');
const { Op, fn, col, literal } = require('sequelize');
const ExcelJS = require('exceljs');

// Filtros avanzados para afiliados - Funcionalidad completa
const filtrarAfiliadosAvanzado = async (req, res) => {
    try {
        console.log('=== DEBUG: Iniciando filtrarAfiliadosAvanzado ===');
        console.log('Query params:', req.query);
        
        const { 
            // Paginación
            page = 1,
            limit = 50,
            
            // Filtros básicos de persona
            dni,
            apellidoNombre,
            estadoLicencia,
            tipo, // puede ser array
            categoria,
            categoriaNivel,
            fechaNacimientoDesde,
            fechaNacimientoHasta,
            fechaLicenciaDesde,
            fechaLicenciaHasta,
            edadDesde,
            edadHasta,
            
            // Filtros de club
            clubId,
            clubNombre,
            estadoAfiliacionClub,
            
            // Filtros de pases
            tienePases,
            fechaPaseDesde,
            fechaPaseHasta,
            clubOrigenPase,
            clubDestinoPase,
            estadoPase,
            
            // Filtros de pagos/cobros (simplificados)
            tienePagos,
            estadoPago,
            
            // Ordenamiento
            sortBy = 'nombreApellido',
            sortOrder = 'ASC'
        } = req.query;

        // Construcción de filtros WHERE para Persona
        const whereConditions = {};
        const includeConditions = [];
        let requireClub = false;
        let requirePases = false;
        let requireCobros = false;

        // === FILTROS BÁSICOS DE PERSONA ===
        if (dni) {
            whereConditions.dni = { [Op.iLike]: `%${dni}%` };
        }
        
        if (apellidoNombre) {
            whereConditions.nombreApellido = { [Op.iLike]: `%${apellidoNombre}%` };
        }
        
        if (estadoLicencia) {
            whereConditions.estadoLicencia = estadoLicencia;
        }

        // Filtro por tipo (puede ser array)
        if (tipo) {
            console.log('=== DEBUG: Procesando tipo ===', { tipo, typeOfTipo: typeof tipo, isArray: Array.isArray(tipo) });
            
            let tipos;
            if (Array.isArray(tipo)) {
                tipos = tipo.filter(t => t && t.trim() !== ''); // Filtrar valores vacíos
            } else if (typeof tipo === 'string') {
                // Dividir por comas si es un string con múltiples valores y limpiar espacios
                tipos = tipo.split(',')
                    .map(t => t.trim())
                    .filter(t => t !== '');
            } else {
                // Convertir a string y procesar
                tipos = [String(tipo)].filter(t => t && t.trim() !== '');
            }
            
            console.log('=== DEBUG: tipos procesados ===', tipos);
            
            if (tipos.length > 0) {
                if (tipos.length === 1) {
                    // Si es un solo valor, usar igualdad directa para evitar problemas con Sequelize
                    whereConditions.tipo = tipos[0];
                } else {
                    // Si son múltiples valores, usar Op.in con array validado
                    whereConditions.tipo = { [Op.in]: tipos };
                }
                console.log('=== DEBUG: whereConditions.tipo final ===', whereConditions.tipo);
            }
        }

        if (categoria) {
            whereConditions.categoria = categoria;
        }

        if (categoriaNivel) {
            whereConditions.categoriaNivel = categoriaNivel;
        }

        // Filtros de fecha de nacimiento
        if (fechaNacimientoDesde || fechaNacimientoHasta) {
            whereConditions.fechaNacimiento = {};
            if (fechaNacimientoDesde) {
                whereConditions.fechaNacimiento[Op.gte] = fechaNacimientoDesde;
            }
            if (fechaNacimientoHasta) {
                whereConditions.fechaNacimiento[Op.lte] = fechaNacimientoHasta;
            }
        }

        // Filtros de fecha de licencia
        if (fechaLicenciaDesde || fechaLicenciaHasta) {
            whereConditions.fechaLicencia = {};
            if (fechaLicenciaDesde) {
                whereConditions.fechaLicencia[Op.gte] = fechaLicenciaDesde;
            }
            if (fechaLicenciaHasta) {
                whereConditions.fechaLicencia[Op.lte] = fechaLicenciaHasta;
            }
        }

        // Filtros de edad (calculada desde fecha de nacimiento)
        if (edadDesde || edadHasta) {
            const currentYear = new Date().getFullYear();
            
            if (edadDesde) {
                // Para edad mínima, la fecha de nacimiento debe ser menor o igual a (año actual - edad mínima)
                const maxBirthYear = currentYear - parseInt(edadDesde);
                const maxBirthDate = `${maxBirthYear}-12-31`;
                if (!whereConditions.fechaNacimiento) whereConditions.fechaNacimiento = {};
                whereConditions.fechaNacimiento[Op.lte] = maxBirthDate;
            }
            
            if (edadHasta) {
                // Para edad máxima, la fecha de nacimiento debe ser mayor o igual a (año actual - edad máxima)
                const minBirthYear = currentYear - parseInt(edadHasta);
                const minBirthDate = `${minBirthYear}-01-01`;
                if (!whereConditions.fechaNacimiento) whereConditions.fechaNacimiento = {};
                whereConditions.fechaNacimiento[Op.gte] = minBirthDate;
            }
        }

        // === FILTROS DE CLUB ===
        let clubInclude = {
            model: Club,
            as: 'club',
            attributes: ['idClub', 'nombre'],
            required: false
        };

        if (clubId) {
            clubInclude.where = { idClub: clubId };
            clubInclude.required = true;
            requireClub = true;
        }

        if (clubNombre) {
            if (!clubInclude.where) clubInclude.where = {};
            clubInclude.where.nombre = { [Op.iLike]: `%${clubNombre}%` };
            clubInclude.required = true;
            requireClub = true;
        }

        if (estadoAfiliacionClub) {
            // Este filtro requeriría una tabla intermedia de afiliación
            // Por ahora lo implementamos como un filtro básico
            console.log('Filtro estadoAfiliacionClub no implementado completamente');
        }

        includeConditions.push(clubInclude);

        // === FILTROS DE PASES ===
        if (tienePases === 'true' || fechaPaseDesde || fechaPaseHasta || clubOrigenPase || clubDestinoPase) {
            let pasesInclude = {
                model: Pase,
                as: 'pases',
                attributes: ['idPase', 'fechaPase', 'clubOrigen', 'clubDestino'],
                required: tienePases === 'true'
            };

            let pasesWhere = {};

            if (fechaPaseDesde || fechaPaseHasta) {
                pasesWhere.fechaPase = {};
                if (fechaPaseDesde) {
                    pasesWhere.fechaPase[Op.gte] = fechaPaseDesde;
                }
                if (fechaPaseHasta) {
                    pasesWhere.fechaPase[Op.lte] = fechaPaseHasta;
                }
            }

            if (clubOrigenPase) {
                pasesWhere.clubOrigen = { [Op.iLike]: `%${clubOrigenPase}%` };
            }

            if (clubDestinoPase) {
                pasesWhere.clubDestino = { [Op.iLike]: `%${clubDestinoPase}%` };
            }

            if (Object.keys(pasesWhere).length > 0) {
                pasesInclude.where = pasesWhere;
                pasesInclude.required = true;
            }

            includeConditions.push(pasesInclude);
            requirePases = true;
        }

        // === FILTROS DE COBROS/PAGOS ===
        if (tienePagos === 'true' || estadoPago) {
            let cobrosInclude = {
                model: Cobro,
                as: 'cobros',
                attributes: ['idCobro', 'estado', 'monto', 'fechaCobro'],
                required: tienePagos === 'true'
            };

            if (estadoPago) {
                cobrosInclude.where = { estado: estadoPago };
                cobrosInclude.required = true;
            }

            includeConditions.push(cobrosInclude);
            requireCobros = true;
        }

        console.log('=== DEBUG: whereConditions ===', whereConditions);
        console.log('=== DEBUG: includeConditions ===', includeConditions.length);

        // Configurar ordenamiento
        let orderClause = [];
        const validSortFields = ['nombreApellido', 'dni', 'fechaNacimiento', 'fechaLicencia', 'numeroAfiliacion'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'nombreApellido';
        const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        orderClause.push([sortField, sortDirection]);

        // Paginación
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Ejecutar consulta principal
        const { count, rows: afiliados } = await Persona.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit: parseInt(limit),
            offset: offset,
            order: orderClause,
            distinct: true
        });

        console.log('=== DEBUG: Consulta exitosa, count:', count, 'afiliados:', afiliados.length);

        // Calcular estadísticas
        const estadisticas = await calcularEstadisticasAfiliados(whereConditions, includeConditions);

        // Si es una solicitud de exportación, generar Excel
        if (req.query.exportToExcel === 'true') {
            return await exportarAfiliadosExcel(afiliados, res);
        }

        console.log('=== DEBUG: Enviando respuesta ===');
        res.json({
            success: true,
            data: {
                afiliados,
                totalRegistros: count,
                paginaActual: parseInt(page),
                totalPaginas: Math.ceil(count / parseInt(limit)),
                registrosPorPagina: parseInt(limit),
                estadisticas,
                filtrosAplicados: {
                    total: Object.keys(req.query).length - 3, // excepto page, limit, exportToExcel
                    activos: Object.keys(whereConditions).length + 
                             (requireClub ? 1 : 0) + 
                             (requirePases ? 1 : 0) + 
                             (requireCobros ? 1 : 0)
                }
            }
        });

    } catch (error) {
        console.error('=== ERROR en filtrarAfiliadosAvanzado ===');
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Función para calcular estadísticas
const calcularEstadisticasAfiliados = async (whereConditions, includes) => {
    try {
        console.log('=== DEBUG: calcularEstadisticasAfiliados whereConditions ===', JSON.stringify(whereConditions, null, 2));
        
        // Hacer copia profunda de whereConditions para evitar mutaciones
        const baseWhere = JSON.parse(JSON.stringify(whereConditions));
        const baseIncludes = JSON.parse(JSON.stringify(includes));
        
        const [
            totalAfiliados,
            afiliadosActivos,
            afiliadosInactivos,
            totalClubes,
            totalPases,
            totalPagos
        ] = await Promise.all([
            Persona.count({ where: baseWhere, include: baseIncludes, distinct: true }),
            Persona.count({ 
                where: { ...baseWhere, estadoLicencia: 'ACTIVO' }, 
                include: baseIncludes, 
                distinct: true 
            }),
            Persona.count({ 
                where: { ...baseWhere, estadoLicencia: 'INACTIVO' }, 
                include: baseIncludes, 
                distinct: true 
            }),
            Persona.count({
                where: baseWhere,
                include: baseIncludes,
                distinct: true,
                col: 'idClub'
            }),
            Pase.count(),
            Pago.count()
        ]);

        return {
            totalAfiliados,
            afiliadosActivos,
            afiliadosInactivos,
            totalClubes,
            totalPases,
            totalPagos,
            porcentajeActivos: totalAfiliados > 0 ? ((afiliadosActivos / totalAfiliados) * 100).toFixed(2) : 0
        };
    } catch (error) {
        console.error('Error calculando estadísticas:', error);
        return {
            totalAfiliados: 0,
            afiliadosActivos: 0,
            afiliadosInactivos: 0,
            totalClubes: 0,
            totalPases: 0,
            totalPagos: 0,
            porcentajeActivos: 0
        };
    }
};

// Función para exportar a Excel
const exportarAfiliadosExcel = async (afiliados, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Afiliados Filtrados');

        // Definir columnas
        worksheet.columns = [
            { header: 'DNI', key: 'dni', width: 15 },
            { header: 'Nombre y Apellido', key: 'nombreApellido', width: 30 },
            { header: 'Fecha Nacimiento', key: 'fechaNacimiento', width: 15 },
            { header: 'Club Actual', key: 'clubNombre', width: 25 },
            { header: 'Estado Licencia', key: 'estadoLicencia', width: 15 },
            { header: 'Fecha Licencia', key: 'fechaLicencia', width: 15 },
            { header: 'Tipo', key: 'tipo', width: 20 },
            { header: 'Categoría', key: 'categoria', width: 15 },
            { header: 'Nivel Categoría', key: 'categoriaNivel', width: 15 },
            { header: 'Número Afiliación', key: 'numeroAfiliacion', width: 15 },
            { header: 'Total Pases', key: 'totalPases', width: 12 },
            { header: 'Total Credenciales', key: 'totalCredenciales', width: 15 }
        ];

        // Agregar datos
        afiliados.forEach(afiliado => {
            worksheet.addRow({
                dni: afiliado.dni,
                nombreApellido: afiliado.nombreApellido,
                fechaNacimiento: afiliado.fechaNacimiento,
                clubNombre: afiliado.club?.nombre || 'Sin club',
                estadoLicencia: afiliado.estadoLicencia,
                fechaLicencia: afiliado.fechaLicencia,
                tipo: afiliado.tipo?.join(', ') || '',
                categoria: afiliado.categoria,
                categoriaNivel: afiliado.categoriaNivel,
                numeroAfiliacion: afiliado.numeroAfiliacion,
                totalPases: afiliado.pases?.length || 0,
                totalCredenciales: afiliado.credenciales?.length || 0
            });
        });

        // Estilo del encabezado
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Configurar respuesta
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=afiliados_filtrados_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exportando a Excel:', error);
        throw error;
    }
};

// Obtener opciones dinámicas para los filtros
const obtenerOpcionesFiltros = async (req, res) => {
    try {
        console.log('=== DEBUG: Obteniendo opciones de filtros desde BD ===');

        // Obtener datos únicos reales desde la base de datos
        const [
            clubes,
            estadosLicencia,
            tiposRaw,
            categorias,
            categoriasNivel,
            estadosPago,
            estadosAfiliacion,
            estadosPase,
            clubesConPases,
            rangoEdades
        ] = await Promise.all([
            // Clubes activos con conteo de afiliados
            Club.findAll({
                attributes: [
                    'idClub', 
                    'nombre',
                    [fn('COUNT', col('personas.idPersona')), 'cantidadAfiliados']
                ],
                include: [{
                    model: Persona,
                    as: 'personas',
                    attributes: [],
                    required: false
                }],
                group: ['Club.idClub', 'Club.nombre'],
                order: [['nombre', 'ASC']]
            }),

            // Estados únicos de licencia desde Persona
            Persona.findAll({
                attributes: [[fn('DISTINCT', col('estadoLicencia')), 'estado']],
                where: {
                    estadoLicencia: { [Op.not]: null }
                },
                raw: true
            }),

            // Tipos desde Persona - necesita manejo especial para arrays
            Persona.findAll({
                attributes: ['tipo'],
                where: {
                    tipo: { [Op.not]: null }
                },
                raw: false // No raw para poder procesar arrays
            }),

            // Categorías únicas desde Persona
            Persona.findAll({
                attributes: [[fn('DISTINCT', col('categoria')), 'categoria']],
                where: {
                    categoria: { [Op.not]: null }
                },
                raw: true
            }),

            // Niveles de categoría únicos desde Persona
            Persona.findAll({
                attributes: [[fn('DISTINCT', col('categoriaNivel')), 'nivel']],
                where: {
                    categoriaNivel: { [Op.not]: null }
                },
                raw: true
            }),

            // Estados únicos de cobros/pagos
            Cobro.findAll({
                attributes: [[fn('DISTINCT', col('estado')), 'estado']],
                where: {
                    estado: { [Op.not]: null }
                },
                raw: true
            }),

            // Estados de afiliación de clubes
            Club.findAll({
                attributes: [[fn('DISTINCT', col('estadoAfiliacion')), 'estado']],
                where: {
                    estadoAfiliacion: { [Op.not]: null }
                },
                raw: true
            }),

            // Estados de pases únicos
            Pase.findAll({
                attributes: [[fn('DISTINCT', col('habilitacion')), 'estado']],
                where: {
                    habilitacion: { [Op.not]: null }
                },
                raw: true
            }),

            // Clubes que aparecen en pases (origen y destino)
            Pase.findAll({
                attributes: [
                    [fn('DISTINCT', col('clubDestino')), 'clubNombre']
                ],
                where: {
                    clubDestino: { [Op.not]: null }
                },
                raw: true
            }),

            // Rango de edades (min/max) calculado desde fechas de nacimiento
            Persona.findAll({
                attributes: [
                    [fn('MIN', literal('EXTRACT(YEAR FROM AGE(CURRENT_DATE, "fechaNacimiento"))')), 'edadMinima'],
                    [fn('MAX', literal('EXTRACT(YEAR FROM AGE(CURRENT_DATE, "fechaNacimiento"))')), 'edadMaxima']
                ],
                where: {
                    fechaNacimiento: { [Op.not]: null }
                },
                raw: true
            })
        ]);

        // Procesar tipos desde arrays
        const tiposUnicos = new Set();
        tiposRaw.forEach(persona => {
            if (persona.tipo && Array.isArray(persona.tipo)) {
                persona.tipo.forEach(tipo => {
                    if (tipo && tipo.trim()) {
                        tiposUnicos.add(tipo.trim());
                    }
                });
            }
        });

        // Obtener clubes únicos de pases (combinando origen y destino)
        const clubesPaseSet = new Set();
        clubesConPases.forEach(item => {
            if (item.clubNombre) {
                clubesPaseSet.add(item.clubNombre);
            }
        });

        // También obtener clubes de origen de pases
        const clubesOrigenPases = await Pase.findAll({
            attributes: [[fn('DISTINCT', col('clubProveniente')), 'clubNombre']],
            where: {
                clubProveniente: { [Op.not]: null }
            },
            raw: true
        });

        clubesOrigenPases.forEach(item => {
            if (item.clubNombre) {
                clubesPaseSet.add(item.clubNombre);
            }
        });

        // Procesar los resultados
        const opciones = {
            // Clubes con información adicional
            clubes: clubes.map(club => ({
                idClub: club.idClub,
                nombre: club.nombre,
                cantidadAfiliados: parseInt(club.get('cantidadAfiliados')) || 0
            })),
            
            // Estados dinámicos
            estadosLicencia: estadosLicencia.map(e => e.estado).filter(Boolean).sort(),
            tipos: Array.from(tiposUnicos).sort(),
            categorias: categorias.map(c => c.categoria).filter(Boolean).sort(),
            categoriasNivel: categoriasNivel.map(n => n.nivel).filter(Boolean).sort(),
            estadosPago: estadosPago.map(e => e.estado).filter(Boolean).sort(),
            estadosAfiliacion: estadosAfiliacion.map(e => e.estado).filter(Boolean).sort(),
            estadosPase: estadosPase.map(e => e.estado).filter(Boolean).sort(),
            
            // Clubes que aparecen en pases
            clubesPases: Array.from(clubesPaseSet).sort(),
            
            // Rango de edades
            rangoEdades: {
                edadMinima: rangoEdades[0]?.edadMinima || 0,
                edadMaxima: rangoEdades[0]?.edadMaxima || 100
            }
        };

        console.log('=== DEBUG: Opciones obtenidas desde BD ===', {
            clubes: opciones.clubes.length,
            estadosLicencia: opciones.estadosLicencia.length,
            tipos: opciones.tipos.length,
            categorias: opciones.categorias.length,
            categoriasNivel: opciones.categoriasNivel.length,
            estadosPago: opciones.estadosPago.length,
            estadosAfiliacion: opciones.estadosAfiliacion.length,
            estadosPase: opciones.estadosPase.length,
            clubesPases: opciones.clubesPases.length,
            rangoEdades: opciones.rangoEdades
        });

        console.log('=== DEBUG: Tipos encontrados ===', opciones.tipos);
        console.log('=== DEBUG: Categorías encontradas ===', opciones.categorias);
        console.log('=== DEBUG: Niveles encontrados ===', opciones.categoriasNivel);
        console.log('=== DEBUG: Rango de edades ===', opciones.rangoEdades);

        res.json({
            success: true,
            data: opciones
        });

    } catch (error) {
        console.error('=== ERROR en obtenerOpcionesFiltros ===');
        console.error('Error completo:', error);
        
        // Enviar opciones mínimas en caso de error
        res.json({
            success: true,
            data: {
                clubes: [],
                estadosLicencia: [],
                tipos: [],
                categorias: [],
                categoriasNivel: [],
                estadosPago: [],
                estadosAfiliacion: [],
                estadosPase: [],
                clubesPases: [],
                rangoEdades: { edadMinima: 0, edadMaxima: 100 }
            }
        });
    }
};

// Guardar configuración de filtros
const guardarConfiguracionFiltro = async (req, res) => {
    try {
        console.log('=== DEBUG: guardarConfiguracionFiltro ===');
        const { nombre, descripcion, filtros, usuarioId } = req.body;

        // Por ahora, devolvemos la configuración tal como se envió
        // En el futuro se puede implementar persistencia en BD
        
        res.json({
            success: true,
            message: 'Configuración guardada exitosamente',
            data: {
                id: Date.now(), // ID temporal
                nombre,
                descripcion,
                filtros,
                usuarioId,
                fechaCreacion: new Date()
            }
        });

    } catch (error) {
        console.error('=== ERROR en guardarConfiguracionFiltro ===');
        console.error('Error completo:', error);
        res.status(500).json({
            success: false,
            message: 'Error guardando configuración',
            error: error.message
        });
    }
};

// Función para poblar datos de prueba si no existen
const poblarDatosPrueba = async (req, res) => {
    try {
        console.log('=== DEBUG: Poblando datos de prueba ===');

        // Verificar si ya hay datos
        const personasExistentes = await Persona.count();
        console.log('Personas existentes:', personasExistentes);

        if (personasExistentes === 0) {
            // Crear datos de prueba
            const datosPrueba = [
                {
                    nombreApellido: 'Juan Pérez',
                    dni: '12345678',
                    fechaNacimiento: '1990-05-15',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Jugador'],
                    categoria: 'Mayor',
                    categoriaNivel: 'A',
                    numeroAfiliacion: 1001
                },
                {
                    nombreApellido: 'María González',
                    dni: '87654321',
                    fechaNacimiento: '1995-08-22',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Entrenador', 'Jugador'],
                    categoria: 'Mayor',
                    categoriaNivel: 'B',
                    numeroAfiliacion: 1002
                },
                {
                    nombreApellido: 'Carlos López',
                    dni: '11223344',
                    fechaNacimiento: '2005-03-10',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Jugador'],
                    categoria: 'Juvenil',
                    categoriaNivel: 'A',
                    numeroAfiliacion: 1003
                },
                {
                    nombreApellido: 'Ana Martínez',
                    dni: '55667788',
                    fechaNacimiento: '1985-12-05',
                    estadoLicencia: 'INACTIVO',
                    tipo: ['Dirigente'],
                    categoria: 'Mayor',
                    categoriaNivel: 'C',
                    numeroAfiliacion: 1004
                },
                {
                    nombreApellido: 'Roberto Silva',
                    dni: '99887766',
                    fechaNacimiento: '1988-07-18',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Árbitro'],
                    categoria: 'Mayor',
                    categoriaNivel: 'A',
                    numeroAfiliacion: 1005
                },
                {
                    nombreApellido: 'Laura Fernández',
                    dni: '44556677',
                    fechaNacimiento: '2008-01-25',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Jugador'],
                    categoria: 'Cadete',
                    categoriaNivel: 'B',
                    numeroAfiliacion: 1006
                },
                {
                    nombreApellido: 'Diego Ramírez',
                    dni: '33445566',
                    fechaNacimiento: '1992-09-30',
                    estadoLicencia: 'PENDIENTE',
                    tipo: ['Técnico', 'Entrenador'],
                    categoria: 'Mayor',
                    categoriaNivel: 'A',
                    numeroAfiliacion: 1007
                },
                {
                    nombreApellido: 'Sofía Torres',
                    dni: '22334455',
                    fechaNacimiento: '2010-11-12',
                    estadoLicencia: 'ACTIVO',
                    tipo: ['Jugador'],
                    categoria: 'Infantil',
                    categoriaNivel: 'C',
                    numeroAfiliacion: 1008
                }
            ];

            // Insertar los datos
            await Persona.bulkCreate(datosPrueba);
            console.log('Datos de prueba insertados exitosamente');

            res.json({
                success: true,
                message: 'Datos de prueba insertados exitosamente',
                cantidadInsertada: datosPrueba.length
            });
        } else {
            res.json({
                success: true,
                message: 'Ya existen datos en la base de datos',
                cantidadExistente: personasExistentes
            });
        }

    } catch (error) {
        console.error('=== ERROR poblando datos de prueba ===');
        console.error('Error completo:', error);
        res.status(500).json({
            success: false,
            message: 'Error poblando datos de prueba',
            error: error.message
        });
    }
};

module.exports = {
    filtrarAfiliadosAvanzado,
    obtenerOpcionesFiltros,
    guardarConfiguracionFiltro,
    exportarAfiliadosExcel,
    calcularEstadisticasAfiliados,
    poblarDatosPrueba
}; 
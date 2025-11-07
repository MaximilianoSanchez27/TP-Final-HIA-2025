const ipGuideService = require('../services/ipGuideService');

/**
 * Controlador para las operaciones relacionadas con IP Guide
 */
class IPGuideController {
    
    /**
     * Obtiene información de una IP específica
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getIPInfo(req, res) {
        try {
            const { ip } = req.params;
            
            // Validar que se proporcione una IP
            if (!ip) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere proporcionar una dirección IP'
                });
            }

            // Validar formato de IP
            if (!ipGuideService.isValidIP(ip)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de IP inválido'
                });
            }

            const result = await ipGuideService.getIPInfo(ip);
            
            if (!result.success) {
                return res.status(result.status || 500).json({
                    success: false,
                    message: 'Error al obtener información de la IP',
                    error: result.error
                });
            }

            // Formatear respuesta
            const response = {
                success: true,
                data: {
                    ip: result.data.ip,
                    red: {
                        cidr: result.data.network?.cidr,
                        hosts: result.data.network?.hosts,
                        sistemaAutonomo: ipGuideService.formatASData(result.data.network?.autonomous_system)
                    },
                    ubicacion: ipGuideService.formatLocationData(result.data.location)
                }
            };

            res.json(response);

        } catch (error) {
            console.error('Error en getIPInfo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtiene información de una red CIDR
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getNetworkInfo(req, res) {
        try {
            const { cidr } = req.params;
            
            // Validar que se proporcione un CIDR
            if (!cidr) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere proporcionar una notación CIDR'
                });
            }

            // Validar formato de CIDR
            if (!ipGuideService.isValidCIDR(cidr)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de CIDR inválido'
                });
            }

            const result = await ipGuideService.getNetworkInfo(cidr);
            
            if (!result.success) {
                return res.status(result.status || 500).json({
                    success: false,
                    message: 'Error al obtener información de la red',
                    error: result.error
                });
            }

            // Formatear respuesta
            const response = {
                success: true,
                data: {
                    cidr: result.data.cidr,
                    hosts: result.data.hosts,
                    sistemaAutonomo: ipGuideService.formatASData(result.data.autonomous_system)
                }
            };

            res.json(response);

        } catch (error) {
            console.error('Error en getNetworkInfo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtiene información de un Sistema Autónomo (ASN)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getASNInfo(req, res) {
        try {
            const { asn } = req.params;
            
            // Validar que se proporcione un ASN
            if (!asn) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere proporcionar un número de ASN'
                });
            }

            // Validar que sea un número
            const asnNumber = parseInt(asn);
            if (isNaN(asnNumber) || asnNumber <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ASN debe ser un número válido mayor a 0'
                });
            }

            const result = await ipGuideService.getASNInfo(asnNumber);
            
            if (!result.success) {
                return res.status(result.status || 500).json({
                    success: false,
                    message: 'Error al obtener información del ASN',
                    error: result.error
                });
            }

            res.json({
                success: true,
                data: result.data
            });

        } catch (error) {
            console.error('Error en getASNInfo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Obtiene información de la IP actual del servidor
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getCurrentIPInfo(req, res) {
        try {
            const result = await ipGuideService.getCurrentIPInfo();
            
            if (!result.success) {
                return res.status(result.status || 500).json({
                    success: false,
                    message: 'Error al obtener información de la IP actual',
                    error: result.error
                });
            }

            // Formatear respuesta
            const response = {
                success: true,
                data: {
                    ip: result.data.ip,
                    red: {
                        cidr: result.data.network?.cidr,
                        hosts: result.data.network?.hosts,
                        sistemaAutonomo: ipGuideService.formatASData(result.data.network?.autonomous_system)
                    },
                    ubicacion: ipGuideService.formatLocationData(result.data.location)
                }
            };

            res.json(response);

        } catch (error) {
            console.error('Error en getCurrentIPInfo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Valida el formato de una IP
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async validateIP(req, res) {
        try {
            const { ip } = req.params;
            
            if (!ip) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere proporcionar una dirección IP'
                });
            }

            const isValid = ipGuideService.isValidIP(ip);
            
            res.json({
                success: true,
                data: {
                    ip,
                    esValida: isValid
                }
            });

        } catch (error) {
            console.error('Error en validateIP:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    /**
     * Valida el formato de una notación CIDR
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async validateCIDR(req, res) {
        try {
            const { cidr } = req.params;
            
            if (!cidr) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere proporcionar una notación CIDR'
                });
            }

            const isValid = ipGuideService.isValidCIDR(cidr);
            
            res.json({
                success: true,
                data: {
                    cidr,
                    esValida: isValid
                }
            });

        } catch (error) {
            console.error('Error en validateCIDR:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new IPGuideController(); 
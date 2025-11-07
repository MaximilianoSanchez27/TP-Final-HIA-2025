const axios = require('axios');

/**
 * Servicio para interactuar con la API de IP Guide
 * Documentación: https://ip.guide/
 */
class IPGuideService {
    constructor() {
        this.baseURL = 'https://ip.guide';
    }

    /**
     * Obtiene información detallada de una IP específica
     * @param {string} ip - Dirección IP a consultar
     * @returns {Promise<Object>} Información de la IP incluyendo red y ubicación
     */
    async getIPInfo(ip) {
        try {
            const response = await axios.get(`${this.baseURL}/${ip}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Obtiene información de una red CIDR
     * @param {string} cidr - Notación CIDR (ej: 181.177.24.0/24)
     * @returns {Promise<Object>} Información de la red
     */
    async getNetworkInfo(cidr) {
        try {
            const response = await axios.get(`${this.baseURL}/${cidr}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Obtiene información del Sistema Autónomo (ASN)
     * @param {number} asn - Número del Sistema Autónomo
     * @returns {Promise<Object>} Información del ASN
     */
    async getASNInfo(asn) {
        try {
            const response = await axios.get(`${this.baseURL}/AS${asn}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Valida si una cadena es una IP válida
     * @param {string} ip - IP a validar
     * @returns {boolean} True si es válida
     */
    isValidIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }

    /**
     * Valida si una cadena es una notación CIDR válida
     * @param {string} cidr - CIDR a validar
     * @returns {boolean} True si es válida
     */
    isValidCIDR(cidr) {
        const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
        return cidrRegex.test(cidr);
    }

    /**
     * Obtiene información de la IP actual del servidor
     * @returns {Promise<Object>} Información de la IP actual
     */
    async getCurrentIPInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Función de utilidad para formatear la respuesta de ubicación
     * @param {Object} locationData - Datos de ubicación de la API
     * @returns {Object} Datos formateados
     */
    formatLocationData(locationData) {
        if (!locationData) return null;

        return {
            ciudad: locationData.city,
            pais: locationData.country,
            zonaHoraria: locationData.timezone,
            coordenadas: {
                latitud: locationData.latitude,
                longitud: locationData.longitude
            }
        };
    }

    /**
     * Función de utilidad para formatear la respuesta del Sistema Autónomo
     * @param {Object} asData - Datos del AS de la API
     * @returns {Object} Datos formateados
     */
    formatASData(asData) {
        if (!asData) return null;

        return {
            asn: asData.asn,
            nombre: asData.name,
            organizacion: asData.organization,
            pais: asData.country,
            rir: asData.rir
        };
    }
}

module.exports = new IPGuideService(); 
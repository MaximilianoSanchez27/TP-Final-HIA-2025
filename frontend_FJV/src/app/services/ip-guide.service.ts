import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  IPGuideResponse,
  ValidationResponse,
  IPInfo,
  NetworkInfo,
  ASNInfo
} from '../models/ip-guide.model';

@Injectable({
  providedIn: 'root'
})
export class IPGuideService {
  private apiUrl = `${environment.apiUrl}/ip-guide`;
  private readonly STORAGE_KEY = 'ip_info_cache';
  private readonly IP_CACHE_DURATION = 24 * 60 * 60 * 1000; 

  constructor(private http: HttpClient) {}

  /**
   * Obtiene información de la IP actual del servidor
   */
  getCurrentIPInfo(): Observable<IPGuideResponse> {
    return this.http.get<any>(`${this.apiUrl}/current`).pipe(
      map(response => this.formatBackendResponse(response)),
      catchError(error => {
        console.error('Error obteniendo información de IP actual:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtiene información detallada de una IP específica
   * @param ip - Dirección IP a consultar
   */
  getIPInfo(ip: string): Observable<IPGuideResponse> {
    return this.http.get<any>(`${this.apiUrl}/ip/${ip}`).pipe(
      map(response => this.formatBackendResponse(response)),
      catchError(error => {
        console.error(`Error obteniendo información de IP ${ip}:`, error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtiene información de una red CIDR
   * @param cidr - Notación CIDR (ej: 181.177.24.0/24)
   */
  getNetworkInfo(cidr: string): Observable<IPGuideResponse> {
    return this.http.get<any>(`${this.apiUrl}/network/${cidr}`).pipe(
      map(response => this.formatBackendResponse(response)),
      catchError(error => {
        console.error(`Error obteniendo información de red ${cidr}:`, error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtiene información de un Sistema Autónomo (ASN)
   * @param asn - Número del Sistema Autónomo
   */
  getASNInfo(asn: number): Observable<IPGuideResponse> {
    return this.http.get<any>(`${this.apiUrl}/asn/${asn}`).pipe(
      map(response => this.formatBackendResponse(response)),
      catchError(error => {
        console.error(`Error obteniendo información de ASN ${asn}:`, error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Valida el formato de una IP
   * @param ip - IP a validar
   */
  validateIP(ip: string): Observable<ValidationResponse> {
    return this.http.get<any>(`${this.apiUrl}/validate/ip/${ip}`).pipe(
      map(response => ({
        success: response.success,
        data: {
          ip: ip,
          esValida: response.data?.esValida || false,
          mensaje: response.data?.esValida ? 'IP válida' : 'Formato de IP inválido'
        }
      })),
      catchError(error => {
        console.error(`Error validando IP ${ip}:`, error);
        return of({
          success: true,
          data: {
            ip: ip,
            esValida: this.isValidIP(ip),
            mensaje: this.isValidIP(ip) ? 'IP válida' : 'Formato de IP inválido'
          }
        });
      })
    );
  }

  /**
   * Valida el formato de una notación CIDR
   * @param cidr - CIDR a validar
   */
  validateCIDR(cidr: string): Observable<ValidationResponse> {
    return this.http.get<any>(`${this.apiUrl}/validate/cidr/${cidr}`).pipe(
      map(response => ({
        success: response.success,
        data: {
          cidr: cidr,
          esValida: response.data?.esValida || false,
          mensaje: response.data?.esValida ? 'CIDR válido' : 'Formato de CIDR inválido'
        }
      })),
      catchError(error => {
        console.error(`Error validando CIDR ${cidr}:`, error);
        return of({
          success: true,
          data: {
            cidr: cidr,
            esValida: this.isValidCIDR(cidr),
            mensaje: this.isValidCIDR(cidr) ? 'CIDR válido' : 'Formato de CIDR inválido'
          }
        });
      })
    );
  }

  /**
   * Valida si una cadena es una IP válida (validación local)
   * @param ip 
   */
  isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Valida si una cadena es una notación CIDR válida (validación local)
   * @param cidr
   */
  isValidCIDR(cidr: string): boolean {
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
  }

  /**
   * Obtiene la IP real del cliente desde el backend
   */
  getClientIP(): Observable<string> {
    // Intentar obtener IP del localStorage primero
    const cachedIP = this.getCachedIP();
    if (cachedIP) {
      return of(cachedIP);
    }

    // Obtener IP real desde el backend
    return this.getCurrentIPInfo().pipe(
      map(response => {
        if (response.success && 'ip' in response.data) {
          const ip = (response.data as IPInfo).ip;
          this.cacheIP(ip);
          return ip;
        }
        throw new Error('No se pudo obtener la IP del cliente');
      }),
      catchError(error => {
        console.warn('No se pudo obtener IP real, usando IP simulada:', error);
        // Fallback: generar IP simulada
        const simulatedIP = this.getSimulatedIP();
        this.cacheIP(simulatedIP);
        return of(simulatedIP);
      })
    );
  }

  /**
   * Formatea la información de ubicación para mostrar
   * @param locationData 
   */
  formatLocationDisplay(locationData: any): string {
    if (!locationData) return 'Ubicación desconocida';

    const parts = [];
    if (locationData.ciudad) parts.push(locationData.ciudad);
    if (locationData.pais) parts.push(locationData.pais);

    return parts.length > 0 ? parts.join(', ') : 'Ubicación desconocida';
  }

  /**
   * Formatea la información del ASN para mostrar
   * @param asnData 
   */
  formatASNDisplay(asnData: any): string {
    if (!asnData) return 'ASN desconocido';

    const parts = [];
    if (asnData.nombre) parts.push(asnData.nombre);
    if (asnData.asn) parts.push(`AS${asnData.asn}`);

    return parts.length > 0 ? parts.join(' - ') : 'ASN desconocido';
  }

  /**
   * Formatea la respuesta del backend para que coincida con el modelo del frontend
   */
  private formatBackendResponse(response: any): IPGuideResponse {
    if (!response.success) {
      throw new Error(response.message || 'Error en la respuesta del backend');
    }

    const data = response.data;

    // Si es información de IP
    if (data.ip) {
      const ipInfo: IPInfo = {
        ip: data.ip,
        ubicacion: {
          pais: data.ubicacion?.pais || 'Desconocido',
          ciudad: data.ubicacion?.ciudad || 'Desconocida',
          region: data.ubicacion?.region || 'Desconocida',
          codigoPais: data.ubicacion?.codigoPais || 'XX',
          codigoRegion: data.ubicacion?.codigoRegion || 'XX',
          codigoCiudad: data.ubicacion?.codigoCiudad || 'XX',
          latitud: data.ubicacion?.coordenadas?.latitud || 0,
          longitud: data.ubicacion?.coordenadas?.longitud || 0,
          zonaHoraria: data.ubicacion?.zonaHoraria || 'UTC'
        },
        red: {
          sistemaAutonomo: {
            asn: data.red?.sistemaAutonomo?.asn || 0,
            nombre: data.red?.sistemaAutonomo?.nombre || 'Proveedor desconocido'
          },
          proveedor: data.red?.sistemaAutonomo?.nombre || 'Proveedor desconocido',
          tipo: 'ISP'
        }
      };
      return { success: true, data: ipInfo };
    }

    // Si es información de red CIDR
    if (data.cidr) {
      const networkInfo: NetworkInfo = {
        cidr: data.cidr,
        rangoInicio: data.rangoInicio || data.cidr.split('/')[0],
        rangoFin: data.rangoFin || '255.255.255.255',
        mascara: data.mascara || '255.255.255.0',
        prefijo: data.prefijo || parseInt(data.cidr.split('/')[1]) || 24,
        totalIPs: data.totalIPs || Math.pow(2, 32 - (parseInt(data.cidr.split('/')[1]) || 24)),
        tipo: data.tipo || 'public'
      };
      return { success: true, data: networkInfo };
    }

    // Si es información de ASN
    if (data.asn) {
      const asnInfo: ASNInfo = {
        asn: data.asn,
        nombre: data.nombre || `ASN ${data.asn}`,
        descripcion: data.descripcion || `Sistema Autónomo ${data.asn}`,
        tipo: data.tipo || 'ISP',
        pais: data.pais || 'Desconocido'
      };
      return { success: true, data: asnInfo };
    }

    // Respuesta genérica
    return { success: true, data: data };
  }

  /**
   * Genera una IP simulada como fallback
   */
  private getSimulatedIP(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(Math.floor(Math.random() * 256));
    }
    return segments.join('.');
  }

  /**
   * Obtiene IP del cache
   */
  private getCachedIP(): string | null {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Cache válido por 24 horas
        if (Date.now() - data.timestamp < this.IP_CACHE_DURATION) {
          return data.ip;
        }
      }
    } catch (error) {
      console.error('Error leyendo IP del cache:', error);
    }
    return null;
  }

  /**
   * Guarda IP en cache
   */
  private cacheIP(ip: string): void {
    try {
      const data = {
        ip: ip,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando IP en cache:', error);
    }
  }

  /**
   * Maneja errores de las peticiones HTTP
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en IPGuideService:', error);
    return throwError(() => new Error(error.error?.message || 'Error en el servicio de IP Guide'));
  }
}

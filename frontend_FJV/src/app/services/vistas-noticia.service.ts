import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  VistaNoticiaResponse,
  VistasNoticiaResponse,
  NoticiaVista,
  IPInfo
} from '../models/ip-guide.model';
import { IPGuideService } from './ip-guide.service';

@Injectable({
  providedIn: 'root'
})
export class VistasNoticiaService {
  private apiUrl = `${environment.apiUrl}/noticias`;

  constructor(
    private http: HttpClient,
    private ipGuideService: IPGuideService
  ) {}

  /**
   * Registra una nueva vista de noticia con la IP del usuario
   * @param noticiaId - ID de la noticia
   * @param ip - IP del usuario (opcional, se obtiene automáticamente si no se proporciona)
   */
  registrarVista(noticiaId: number, ip?: string): Observable<VistaNoticiaResponse> {
    // Si no se proporciona IP, obtenerla automáticamente
    const ipObservable = ip ?
      new Observable<string>(observer => observer.next(ip)) :
      this.ipGuideService.getClientIP();

    return ipObservable.pipe(
      switchMap(clientIP => {
        // Registrar vista en el backend
        return this.http.post<any>(`${this.apiUrl}/${noticiaId}/vista`, {
          ip: clientIP
        }).pipe(
          map(response => ({
            success: true,
            message: 'Vista registrada exitosamente',
            vista: {
              id: Date.now(), // ID temporal
              noticiaId: noticiaId,
              ip: clientIP,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })),
          catchError(error => {
            // Si falla el backend, usar localStorage como fallback
            if (error.status === 401) {
              console.log(`[VistasNoticiaService] Backend requiere autenticación para registrar vista en noticia ${noticiaId}, usando localStorage como fallback`);
            } else {
              console.log(`[VistasNoticiaService] Error ${error.status} registrando vista en backend para noticia ${noticiaId}, usando localStorage como fallback`);
            }
            return this.registrarVistaLocal(noticiaId, clientIP);
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene todas las vistas de una noticia específica
   * @param noticiaId - ID de la noticia
   */
  getVistasNoticia(noticiaId: number): Observable<VistasNoticiaResponse> {
    return this.http.get<any>(`${this.apiUrl}/${noticiaId}/vistas`).pipe(
      map(response => ({
        success: true,
        vistas: response.vistas || [],
        total: response.total || 0
      })),
      catchError(error => {
        // Si es error 401 (Unauthorized), usar localStorage como fallback
        if (error.status === 401) {
          console.log(`[VistasNoticiaService] Backend requiere autenticación para noticia ${noticiaId}, usando localStorage como fallback`);
          return this.getVistasNoticiaLocal(noticiaId);
        }

        // Para otros errores, también usar localStorage como fallback
        console.log(`[VistasNoticiaService] Error ${error.status} obteniendo vistas del backend para noticia ${noticiaId}, usando localStorage como fallback`);
        return this.getVistasNoticiaLocal(noticiaId);
      })
    );
  }

  /**
   * Obtiene las vistas de una noticia con información enriquecida de IP
   * @param noticiaId - ID de la noticia
   */
  getVistasConInfoIP(noticiaId: number): Observable<NoticiaVista[]> {
    return this.getVistasNoticia(noticiaId).pipe(
      switchMap(response => {
        if (!response.success || !response.vistas.length) {
          return of([]);
        }

        // Para cada vista, obtener información de la IP
        const vistasConInfo = response.vistas.map(vista =>
          this.ipGuideService.getIPInfo(vista.ip).pipe(
            map(ipResponse => ({
              ...vista,
              ipInfo: ipResponse.success && 'ip' in ipResponse.data ? ipResponse.data as IPInfo : undefined
            })),
            catchError(() => of(vista))
          )
        );

        return combineLatest(vistasConInfo);
      }),
      catchError(error => {
        console.error('Error obteniendo vistas con info IP:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene estadísticas de vistas por país
   * @param noticiaId - ID de la noticia
   */
  getEstadisticasPorPais(noticiaId: number): Observable<any> {
    return this.getVistasConInfoIP(noticiaId).pipe(
      map(vistas => {
        const estadisticas: { [pais: string]: number } = {};

        vistas.forEach(vista => {
          if (vista.ipInfo?.ubicacion?.pais) {
            const pais = vista.ipInfo.ubicacion.pais;
            estadisticas[pais] = (estadisticas[pais] || 0) + 1;
          }
        });

        return Object.entries(estadisticas).map(([pais, cantidad]) => ({
          pais,
          cantidad
        })).sort((a, b) => b.cantidad - a.cantidad);
      }),
      catchError(error => {
        console.error('Error obteniendo estadísticas por país:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene estadísticas de vistas por ASN
   * @param noticiaId - ID de la noticia
   */
  getEstadisticasPorASN(noticiaId: number): Observable<any> {
    return this.getVistasConInfoIP(noticiaId).pipe(
      map(vistas => {
        const estadisticas: { [asn: string]: number } = {};

        vistas.forEach(vista => {
          if (vista.ipInfo?.red?.sistemaAutonomo?.nombre) {
            const asn = vista.ipInfo.red.sistemaAutonomo.nombre;
            estadisticas[asn] = (estadisticas[asn] || 0) + 1;
          }
        });

        return Object.entries(estadisticas).map(([asn, cantidad]) => ({
          asn,
          cantidad
        })).sort((a, b) => b.cantidad - a.cantidad);
      }),
      catchError(error => {
        console.error('Error obteniendo estadísticas por ASN:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene el total de vistas de una noticia
   * @param noticiaId - ID de la noticia
   */
  getTotalVistas(noticiaId: number): Observable<number> {
    return this.getVistasNoticia(noticiaId).pipe(
      map(response => response.success ? response.total : 0),
      catchError(error => {
        console.error('Error obteniendo total de vistas:', error);
        // Si es error 404, significa que el endpoint no existe en el backend
        if (error.status === 404) {
          console.log('Endpoint de vistas no disponible en el backend');
          // Retornar -1 para indicar que el backend no está disponible
          return of(-1);
        }
        return of(0);
      })
    );
  }

  // ===== MÉTODOS DE FALLBACK (localStorage) =====

  /**
   * Registra una vista en localStorage como fallback
   */
  private registrarVistaLocal(noticiaId: number, ip: string): Observable<VistaNoticiaResponse> {
    const STORAGE_KEY = 'noticia_vistas';

    try {
      const vistas = this.getVistasFromStorage(STORAGE_KEY);

      const nuevaVista: NoticiaVista = {
        id: Date.now(),
        noticiaId: noticiaId,
        ip: ip,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vistas.push(nuevaVista);
      this.saveVistasToStorage(STORAGE_KEY, vistas);

      return of({
        success: true,
        message: 'Vista registrada exitosamente (localStorage)',
        vista: nuevaVista
      });
    } catch (error) {
      console.error('Error registrando vista en localStorage:', error);
      return throwError(() => new Error('Error al registrar vista'));
    }
  }

  /**
   * Obtiene vistas de localStorage como fallback
   */
  private getVistasNoticiaLocal(noticiaId: number): Observable<VistasNoticiaResponse> {
    const STORAGE_KEY = 'noticia_vistas';

    try {
      const vistas = this.getVistasFromStorage(STORAGE_KEY);
      const vistasNoticia = vistas.filter(v => v.noticiaId === noticiaId);

      return of({
        success: true,
        vistas: vistasNoticia,
        total: vistasNoticia.length
      });
    } catch (error) {
      console.error('Error obteniendo vistas de localStorage:', error);
      return of({
        success: true,
        vistas: [],
        total: 0
      });
    }
  }

  /**
   * Obtiene las vistas almacenadas en localStorage
   */
  private getVistasFromStorage(key: string): NoticiaVista[] {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error leyendo vistas del localStorage:', error);
      return [];
    }
  }

  /**
   * Guarda las vistas en localStorage
   */
  private saveVistasToStorage(key: string, vistas: NoticiaVista[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(vistas));
    } catch (error) {
      console.error('Error guardando vistas en localStorage:', error);
    }
  }

  /**
   * Maneja errores de las peticiones HTTP
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en VistasNoticiaService:', error);
    return throwError(() => new Error(error.error?.message || 'Error en el servicio de vistas de noticias'));
  }
}

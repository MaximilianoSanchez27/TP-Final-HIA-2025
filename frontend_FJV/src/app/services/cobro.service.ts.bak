import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, tap } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Cobro {
  idCobro?: number;
  concepto: string;
  monto: number;
  fechaCobro?: string;
  fechaVencimiento?: string;
  estado: 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado';
  tipoComprobante?: string;
  idClub: number;
  idEquipo?: number;
  comprobantePago?: string;
  observaciones?: string;
  club?: {
    idClub: number;
    nombre: string;
  };
  equipo?: {
    idEquipo: number;
    nombre: string;
  };
}

export interface CobroResponse {
  status?: string;
  msg?: string;
  error?: string;
  cobro?: Cobro;
}

export interface CobroFilter {
  idClub?: number;
  idEquipo?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface DashboardStats {
  totalCobros: number;
  cobrosPendientes: number;
  cobrosVencidos: number;
  totalRecaudado: number;
}

export interface MetricasAvanzadas {
  resumen: {
    totalCobros: number;
    totalRecaudado: number;
    totalPendiente: number;
    totalVencido: number;
    tasaCobro: number;
  };
  porEstado: {
    Pagado: number;
    Pendiente: number;
    Vencido: number;
    Anulado: number;
  };
  porClub: Array<{
    nombre: string;
    total: number;
    recaudado: number;
    pendiente: number;
    cantidad: number;
  }>;
  mensuales: Array<{
    mes: string;
    recaudado: number;
    pendiente: number;
    total: number;
  }>;
  porConcepto: Array<{
    concepto: string;
    cantidad: number;
    total: number;
    recaudado: number;
  }>;
  fechaActualizacion: Date;
}

export interface EstadisticasRecaudacion {
  periodo: string;
  estadisticas: Array<{
    periodo: string;
    totalCobros: number;
    recaudado: number;
    pendiente: number;
    vencido: number;
    anulado: number;
  }>;
  fechaActualizacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CobroService {
  private readonly API_URL = `${environment.apiUrl}/cobros`;

  constructor(private http: HttpClient) { }

  // ==================== MÉTODOS PARA ESTADÍSTICAS ====================

  /**
   * Calcula estadísticas basándose en todos los cobros
   */
  getDashboardStats(): Observable<DashboardStats> {
    console.log('📊 Calculando estadísticas desde todos los cobros...');
    return this.getCobros().pipe(
      catchError(() => of([])),
      map((cobros: Cobro[]) => {
        const stats: DashboardStats = {
          totalCobros: cobros.length,
          cobrosPendientes: 0,
          cobrosVencidos: 0,
          totalRecaudado: 0
        };

        const hoy = new Date();

        cobros.forEach(cobro => {
          const monto = typeof cobro.monto === 'string' ? parseFloat(cobro.monto) : cobro.monto;

          switch (cobro.estado) {
            case 'Pendiente':
              stats.cobrosPendientes++;
              // Verificar si está vencido
              if (cobro.fechaVencimiento) {
                const fechaVencimiento = new Date(cobro.fechaVencimiento);
                if (fechaVencimiento < hoy) {
                  stats.cobrosVencidos++;
                  stats.cobrosPendientes--;
                }
              }
              break;
            case 'Vencido':
              stats.cobrosVencidos++;
              break;
            case 'Pagado':
              stats.totalRecaudado += monto || 0;
              break;
          }
        });

        console.log('✅ Estadísticas calculadas desde cobros:', stats);
        return stats;
      })
    );
  }

  // ==================== MÉTODOS EXISTENTES ====================

  // Obtener todos los cobros
  getCobros(): Observable<Cobro[]> {
    return this.http.get<Cobro[]>(this.API_URL).pipe(
      catchError(this.handleError<Cobro[]>('getCobros', []))
    );
  }

  // Filtrar cobros según criterios
  filterCobros(filters: CobroFilter): Observable<Cobro[]> {
    let params = new HttpParams();

    if (filters.idClub) params = params.set('idClub', filters.idClub.toString());
    if (filters.idEquipo) params = params.set('idEquipo', filters.idEquipo.toString());
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);

    return this.http.get<Cobro[]>(`${this.API_URL}/filter`, { params }).pipe(
      catchError(this.handleError<Cobro[]>('filterCobros', []))
    );
  }

  // Obtener cobros de un club específico
  getCobrosByClub(idClub: number): Observable<Cobro[]> {
    return this.http.get<Cobro[]>(`${this.API_URL}/club/${idClub}`).pipe(
      catchError(this.handleError<Cobro[]>(`getCobrosByClub id=${idClub}`, []))
    );
  }

  // Obtener cobros de un equipo específico
  getCobrosByEquipo(idEquipo: number): Observable<Cobro[]> {
    return this.http.get<Cobro[]>(`${this.API_URL}/equipo/${idEquipo}`).pipe(
      catchError(this.handleError<Cobro[]>(`getCobrosByEquipo id=${idEquipo}`, []))
    );
  }

  // Obtener un cobro por ID
  getCobro(id: number): Observable<Cobro> {
    return this.http.get<Cobro>(`${this.API_URL}/${id}`).pipe(
      catchError(this.handleError<Cobro>(`getCobro id=${id}`))
    );
  }

  // Crear un nuevo cobro
  createCobro(cobro: Cobro): Observable<CobroResponse> {
    return this.http.post<CobroResponse>(this.API_URL, cobro).pipe(
      catchError(this.handleError<CobroResponse>('createCobro'))
    );
  }

  // Actualizar un cobro existente
  updateCobro(id: number, cobro: Cobro): Observable<CobroResponse> {
    return this.http.put<CobroResponse>(`${this.API_URL}/${id}`, cobro).pipe(
      catchError(this.handleError<CobroResponse>(`updateCobro id=${id}`))
    );
  }

  // Cambiar el estado de un cobro (ej: marcar como pagado)
  cambiarEstadoCobro(id: number, estado: string, comprobantePago?: string, observaciones?: string): Observable<CobroResponse> {
    const data = {
      estado,
      comprobantePago,
      observaciones
    };

    return this.http.patch<CobroResponse>(`${this.API_URL}/${id}/estado`, data).pipe(
      catchError(this.handleError<CobroResponse>(`cambiarEstadoCobro id=${id}`))
    );
  }

  // Eliminar un cobro
  deleteCobro(id: number): Observable<CobroResponse> {
    return this.http.delete<CobroResponse>(`${this.API_URL}/${id}`).pipe(
      catchError(this.handleError<CobroResponse>(`deleteCobro id=${id}`))
    );
  }

  // Obtener métricas avanzadas para dashboard
  getMetricasAvanzadas(): Observable<MetricasAvanzadas> {
    console.log('📊 Obteniendo métricas avanzadas de cobros...');
    return this.http.get<MetricasAvanzadas>(`${this.API_URL}/metricas/avanzadas`).pipe(
      tap(metricas => console.log('✅ Métricas avanzadas obtenidas:', metricas)),
      catchError(this.handleError<MetricasAvanzadas>('getMetricasAvanzadas'))
    );
  }

  // Obtener estadísticas de recaudación por período
  getEstadisticasRecaudacion(periodo: string = 'mes', fechaInicio?: string, fechaFin?: string): Observable<EstadisticasRecaudacion> {
    console.log('📊 Obteniendo estadísticas de recaudación...');
    let params = new URLSearchParams();
    params.append('periodo', periodo);
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    return this.http.get<EstadisticasRecaudacion>(`${this.API_URL}/estadisticas/recaudacion?${params.toString()}`).pipe(
      tap(stats => console.log('✅ Estadísticas de recaudación obtenidas:', stats)),
      catchError(this.handleError<EstadisticasRecaudacion>('getEstadisticasRecaudacion'))
    );
  }

  /**
   * Maneja los errores HTTP
   * @param operationName
   * @param result
   */
  private handleError<T>(operationName = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operationName} falló:`, error);
      console.log(`${operationName} error completo:`, error);

      // Devuelve un resultado vacío para que la aplicación siga funcionando
      return of(result as T);
    };
  }
}

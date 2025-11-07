import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';
import { Afiliado } from '../interfaces/afiliado.interface';
import { Club } from '../interfaces/club.interface';
import { environment } from '../../environments/environment';

// Interfaces para métricas avanzadas de afiliados
export interface MetricasAfiliadosAvanzadas {
  resumen: {
    totalAfiliados: number;
    totalFJV: number;
    totalFEVA: number;
    activosCount: number;
    vencidosCount: number;
    inactivosCount: number;
    proxVencimientos: number;
    porcentajeActivos: number;
  };
  distribucionLicencia: {
    FJV: number;
    FEVA: number;
    SinLicencia: number;
  };
  estadosLicencia: {
    Activos: number;
    Vencidos: number;
    Inactivos: number;
  };
  distribucionPorClub: Array<{
    nombre: string;
    total: number;
    activos: number;
    vencidos: number;
    fjv: number;
    feva: number;
  }>;
  distribucionPorCategoria: Array<{
    categoria: string;
    cantidad: number;
  }>;
  registrosMensuales: Array<{
    mes: string;
    total: number;
    fjv: number;
    feva: number;
  }>;
  fechaActualizacion: Date;
}

export interface EstadisticasCrecimiento {
  periodo: string;
  estadisticas: Array<{
    periodo: string;
    totalNuevos: number;
    nuevos_FJV: number;
    nuevos_FEVA: number;
    activos: number;
  }>;
  fechaActualizacion: Date;
}

// Nuevas interfaces para filtros avanzados
export interface FiltrosAvanzados {
  // Filtros básicos de persona
  dni?: string;
  apellidoNombre?: string;
  estadoLicencia?: string;
  tipo?: string[];
  categoria?: string;
  categoriaNivel?: string;
  fechaNacimientoDesde?: string;
  fechaNacimientoHasta?: string;
  fechaLicenciaDesde?: string;
  fechaLicenciaHasta?: string;

  // Filtros de edad
  edadDesde?: number;
  edadHasta?: number;

  // Filtros de club
  clubId?: number;
  clubNombre?: string;
  estadoAfiliacionClub?: string;
  soloConClub?: boolean;  // Nuevo campo para filtrar solo los que tienen club

  // Filtros de pases
  tienePases?: boolean;
  fechaPaseDesde?: string;
  fechaPaseHasta?: string;
  estadoPase?: string;
  clubOrigenId?: number;
  clubDestinoId?: number;

  // Filtros de pagos/cobros
  tienePagos?: boolean;
  estadoPago?: string;
  montoPagoDesde?: number;
  montoPagoHasta?: number;
  fechaPagoDesde?: string;
  fechaPagoHasta?: string;

  // Filtros de credenciales
  tieneCredencial?: boolean;
  estadoCredencial?: string;

  // Opciones de paginación y ordenamiento
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OpcionesFiltros {
  clubes: any[];
  estadosLicencia: string[];
  tipos: string[];
  categorias: string[];
  categoriasNivel: string[];
  estadosPago: string[];
  estadosAfiliacionClub: string[];
  estadosPase: string[];
  clubesPases: any[];
  rangoEdades: {
    edadMinima: number;
    edadMaxima: number;
  };
}

export interface ResultadoFiltrosAvanzados {
  afiliados: Afiliado[];
  totalRegistros: number;
  paginaActual: number;
  totalPaginas: number;
  registrosPorPagina: number;
  estadisticas?: any;
}

@Injectable({ providedIn: 'root' })
export class AfiliadoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerAfiliados(): Observable<Afiliado[]> {
    return this.http
      .get<any[]>('/api/personas?includeClub=true')
      .pipe(
        map((personas) => personas.map((p) => this.mapPersonaToAfiliado(p)))
      );
  }

  agregarAfiliado(afiliado: Afiliado): Observable<Afiliado> {
    const personaBackend = this.mapAfiliadoToPersona(afiliado);
    return this.http.post<any>('/api/personas', personaBackend).pipe(
      map((response) => {
        const persona = response.persona || response.data || response;
        return this.mapPersonaToAfiliado(persona);
      }),
      catchError((error) => {
        console.error('Error en agregarAfiliado:', error);
        throw error;
      })
    );
  }

  actualizarAfiliado(
    idPersona: number,
    afiliado: Afiliado
  ): Observable<Afiliado> {
    const personaBackend = this.mapAfiliadoToPersona(afiliado);
    return this.http
      .put<any>(`/api/personas/${idPersona}`, personaBackend)
      .pipe(
        map((response) => {
          const persona = response.persona || response.data || response;
          return this.mapPersonaToAfiliado(persona);
        }),
        catchError((error) => {
          console.error('Error en actualizarAfiliado:', error);
          throw error;
        })
      );
  }

  obtenerAfiliadoPorId(idPersona: number): Observable<Afiliado> {
    return this.http
      .get<any>(`/api/personas/${idPersona}?includeClub=true`)
      .pipe(map((p) => this.mapPersonaToAfiliado(p)));
  }

  eliminarAfiliado(idPersona: number): Observable<void> {
    return this.http.delete<void>(`/api/personas/${idPersona}`);
  }

  obtenerClubes(): Observable<Club[]> {
    return this.http.get<Club[]>(`${this.apiUrl}/clubs`);
  }

  subirFotoAfiliado(idPersona: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('fotoPerfil', file);
    return this.http.put(`${this.apiUrl}/personas/${idPersona}`, formData);
  }

  crearAfiliadoConFoto(afiliado: Afiliado, file?: File): Observable<Afiliado> {
    if (file) {
      const formData = new FormData();
      const personaData = this.mapAfiliadoToPersona(afiliado);

      Object.keys(personaData).forEach((key) => {
        if (personaData[key] !== null && personaData[key] !== undefined) {
          formData.append(key, personaData[key]);
        }
      });

      formData.append('fotoPerfil', file);

      return this.http.post<any>(`${this.apiUrl}/personas`, formData).pipe(
        map((response) => {
          const persona = response.persona || response.data || response;
          return this.mapPersonaToAfiliado(persona);
        }),
        catchError((error) => {
          console.error('Error en crearAfiliadoConFoto:', error);
          throw error;
        })
      );
    } else {
      return this.agregarAfiliado(afiliado);
    }
  }

  actualizarAfiliadoConFoto(
    idPersona: number,
    afiliado: Afiliado,
    file?: File
  ): Observable<Afiliado> {
    if (file) {
      const formData = new FormData();
      const personaData = this.mapAfiliadoToPersona(afiliado);

      Object.keys(personaData).forEach((key) => {
        if (personaData[key] !== null && personaData[key] !== undefined) {
          formData.append(key, personaData[key]);
        }
      });

      formData.append('fotoPerfil', file);

      return this.http
        .put<any>(`${this.apiUrl}/personas/${idPersona}`, formData)
        .pipe(
          map((response) => {
            const persona = response.persona || response.data || response;
            return this.mapPersonaToAfiliado(persona);
          }),
          catchError((error) => {
            console.error('Error en actualizarAfiliadoConFoto:', error);
            throw error;
          })
        );
    } else {
      return this.actualizarAfiliado(idPersona, afiliado);
    }
  }

  obtenerFotoPerfil(idPersona: number): Observable<string> {
    return this.http.get<any>(`${this.apiUrl}/personas/${idPersona}/foto`).pipe(
      map((response) => {
        if (
          response.status === '1' &&
          response.foto &&
          response.foto.fotoPerfilUrl
        ) {
          return response.foto.fotoPerfilUrl;
        }
        return '';
      }),
      catchError((error) => {
        console.log('Error o no hay foto disponible:', error);
        return of('');
      })
    );
  }

  eliminarFotoPerfil(idPersona: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/personas/${idPersona}/foto`);
  }

  getResumenTotales(): Observable<any> {
    return this.http.get(`${this.apiUrl}/personas/resumen`);
  }

  getTipo(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/personas/tipo`);
  }

  getAfiliadosPorClub(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/personas/clubes`);
  }

  getAvatarUrl(afiliado: Afiliado): string {
    // Verificar si tiene foto
    if (afiliado.foto) {
      // Si ya es una URL completa (HTTP o data URL)
      if (afiliado.foto.startsWith('http') || afiliado.foto.startsWith('data:')) {
        return afiliado.foto;
      }
      // Si es una ruta relativa, construir la URL completa
      if (afiliado.foto.startsWith('/') || afiliado.foto.includes('uploads')) {
        return `${this.apiUrl}${afiliado.foto.startsWith('/') ? '' : '/'}${afiliado.foto}`;
      }
      // Si parece ser solo un nombre de archivo
      return `${this.apiUrl}/uploads/${afiliado.foto}`;
    }

    // Si no tiene foto, retornar cadena vacía para mostrar el icono por defecto
    return '';
  }

  getAvatarIcon(afiliado: Afiliado): any {
    if (afiliado && afiliado.avatar) {
      return afiliado.avatar;
    }
    return this.generateDefaultAvatar();
  }

  // Obtener métricas avanzadas para gráficos de afiliados
  getMetricasAfiliadosAvanzadas(): Observable<MetricasAfiliadosAvanzadas> {
    console.log('📊 Obteniendo métricas avanzadas de afiliados...');
    return this.http.get<MetricasAfiliadosAvanzadas>(`${this.apiUrl}/personas/metricas/avanzadas`).pipe(
      map(metricas => {
        console.log('✅ Métricas avanzadas de afiliados obtenidas:', metricas);
        return metricas;
      }),
      catchError(this.handleError<MetricasAfiliadosAvanzadas>('getMetricasAfiliadosAvanzadas'))
    );
  }

  // Obtener estadísticas de crecimiento por período
  getEstadisticasCrecimiento(periodo: string = 'mes', fechaInicio?: string, fechaFin?: string): Observable<EstadisticasCrecimiento> {
    console.log('📈 Obteniendo estadísticas de crecimiento de afiliados...');
    let params = new URLSearchParams();
    params.append('periodo', periodo);
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    return this.http.get<EstadisticasCrecimiento>(`${this.apiUrl}/personas/estadisticas/crecimiento?${params.toString()}`).pipe(
      map(stats => {
        console.log('✅ Estadísticas de crecimiento obtenidas:', stats);
        return stats;
      }),
      catchError(this.handleError<EstadisticasCrecimiento>('getEstadisticasCrecimiento'))
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

  private mapAfiliadoToPersona(afiliado: Afiliado): any {
    const persona: any = {
      nombreApellido: afiliado.apellidoNombre,
      dni: afiliado.dni,
      fechaNacimiento: afiliado.fechaNacimiento,
      tipo: afiliado.tipo,
      categoria: afiliado.categoria,
      categoriaNivel: afiliado.categoriaNivel,
      clubActual: afiliado.club || null,
      paseClub: afiliado.clubDestino,
      otorgado: afiliado.otorgado || false,
      idClub: afiliado.idClub || null,
      licencia: afiliado.licencia,
      fechaLicencia: afiliado.fechaLicencia,
      fechaLicenciaBaja: afiliado.fechaLicenciaBaja,
      estadoLicencia: afiliado.estadoLicencia || 'ACTIVO',
      numeroAfiliacion: afiliado.numeroAfiliacion,
      createdAt: afiliado.createdAt,
      updatedAt: afiliado.updatedAt,
      foto: afiliado.foto,
      avatar: afiliado.avatar ? JSON.stringify(afiliado.avatar) : null,
    };

    Object.keys(persona).forEach((key) => {
      if (persona[key] === undefined) delete persona[key];
    });

    return persona;
  }

  private mapPersonaToAfiliado(persona: any): Afiliado {
    if (!persona) {
      throw new Error(
        'Los datos del afiliado no se recibieron correctamente del servidor'
      );
    }

    let estadoLicencia = persona.estadoLicencia;
    if (!estadoLicencia && persona.fechaLicenciaBaja) {
      const hoy = new Date();
      const vencimiento = new Date(persona.fechaLicenciaBaja);
      estadoLicencia = vencimiento < hoy ? 'VENCIDO' : 'ACTIVO';
    }

    const afiliado: Afiliado = {
      idPersona: persona.idPersona,
      apellidoNombre: persona.nombreApellido || '',
      dni: persona.dni || '',
      fechaNacimiento: persona.fechaNacimiento || '',
      tipo: persona.tipo || '',
      categoria: persona.categoria || '',
      categoriaNivel: persona.categoriaNivel || '',
      numeroAfiliacion: persona.numeroAfiliacion || null,
      licencia: persona.licencia || 'FJV',
      club: persona.clubActual || (persona.Club ? persona.Club.nombre : null),
      clubDestino: persona.paseClub || null,
      clubActual: persona.clubActual || null,
      fechaLicencia: persona.fechaLicencia,
      fechaLicenciaBaja: persona.fechaLicenciaBaja,
      estadoLicencia: estadoLicencia || 'INACTIVO',
      otorgado: persona.otorgado,
      idClub: persona.idClub || null,
      paseClub: persona.paseClub,
      clubObjeto: persona.Club,
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt,
      foto: persona.fotoPerfil || persona.foto || undefined,
      avatar: persona.avatar
        ? JSON.parse(persona.avatar)
        : this.generateDefaultAvatar(),
      credenciales: persona.credenciales || []
    };

    if (afiliado.otorgado && afiliado.paseClub) {
      afiliado.pase = 'Destino';
    }

    return afiliado;
  }

  private generateDefaultAvatar() {
    return {
      icon: 'fas fa-user',
      color: '#6c757d',
      size: '2.5rem',
      type: 'fontawesome',
    };
  }

  /**
   * Obtener afiliados con filtros avanzados
   */
  obtenerAfiliadosConFiltros(filtros: FiltrosAvanzados): Observable<ResultadoFiltrosAvanzados> {
    let params = new HttpParams();

    // Agregar todos los filtros como parámetros
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        if (Array.isArray(value)) {
          // Para arrays, enviar como valores separados por comas
          if (value.length > 0) {
            // Para el campo tipo, enviarlo como una sola cadena separada por comas
            params = params.set(key, value.join(','));
          }
        } else {
          // Manejar booleanos de forma explícita
          if (typeof value === 'boolean') {
            params = params.set(key, value ? 'true' : 'false');
          } else {
            if (key === 'tieneCredencial') {
              console.log('🔍 Enviando filtro de credencial:', value);
            }
            if (key === 'estadoCredencial') {
              console.log('🔍 Enviando filtro de estado de credencial:', value);
            }
            params = params.set(key, value.toString());
          }
        }
      }
    });

    console.log('🔍 Enviando filtros al backend:', filtros);
    console.log('🔍 Parámetros HTTP finales:', params.toString());

    return this.http.get<any>(`${this.apiUrl}/personas/filtro/buscar`, { params })
      .pipe(
        map(response => {
          console.log(`✅ Respuesta del backend: ${response.length} registros`);
          return {
            afiliados: Array.isArray(response) ? response.map((p: any) => this.mapPersonaToAfiliado(p)) : [],
            totalRegistros: Array.isArray(response) ? response.length : 0,
            paginaActual: 1,
            totalPaginas: 1,
            registrosPorPagina: Array.isArray(response) ? response.length : 0,
            estadisticas: null
          };
        }),
        catchError(error => {
          console.error('Error en obtenerAfiliadosConFiltros:', error);
          return throwError(error);
        })
      );
  }

  /**
   * Obtener opciones disponibles para filtros
   */
  obtenerOpcionesFiltros(): Observable<OpcionesFiltros> {
    // También cambiamos esta URL para usar un endpoint existente
    return this.http.get<any>(`${this.apiUrl}/personas/tipo`)
      .pipe(
        map(response => {
          // Adaptamos la respuesta para que coincida con la estructura de OpcionesFiltros
          return {
            clubes: [],
            estadosLicencia: ['ACTIVO', 'INACTIVO', 'VENCIDO'],
            tipos: Array.isArray(response) ? response.map((item: any) => item.tipo) : [],
            categorias: [],
            categoriasNivel: [],
            estadosPago: [],
            estadosAfiliacionClub: [],
            estadosPase: [],
            clubesPases: [],
            rangoEdades: { edadMinima: 0, edadMaxima: 100 }
          };
        }),
        catchError(error => {
          console.error('Error en obtenerOpcionesFiltros:', error);
          return throwError(error);
        })
      );
  }

  /**
   * Exportar afiliados a Excel con filtros aplicados
   */
  exportarAfiliadosExcel(filtros: FiltrosAvanzados): Observable<Blob> {
    let params = new HttpParams();

    // Agregar todos los filtros como parámetros
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        if (Array.isArray(value)) {
          value.forEach(v => params = params.append(key, v));
        } else {
          params = params.set(key, value.toString());
        }
      }
    });

    return this.http.get(`${this.apiUrl}/afiliados/exportar-excel`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error en exportarAfiliadosExcel:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Descargar archivo Excel
   */
  descargarExcel(blob: Blob, filename: string = 'afiliados_filtrados.xlsx'): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Guardar configuración de filtros
   */
  guardarConfiguracionFiltro(configuracion: {
    nombre: string;
    descripcion: string;
    filtros: FiltrosAvanzados;
    usuarioId?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/afiliados/configuraciones-filtro`, configuracion)
      .pipe(
        catchError(error => {
          console.error('Error en guardarConfiguracionFiltro:', error);
          return throwError(error);
        })
      );
  }

  /**
   * Poblar datos de prueba para desarrollo
   */
  poblarDatosPrueba(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/afiliados/poblar-datos-prueba`, {})
      .pipe(
        catchError(error => {
          console.error('Error en poblarDatosPrueba:', error);
          return throwError(error);
        })
      );
  }
}

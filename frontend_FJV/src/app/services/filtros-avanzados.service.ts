import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Importar servicios existentes
import { ClubService } from './club.service';
import { PaseService } from './pase.service';
import { CategoriaService } from './categoria.service';
import { CobroService } from './cobro.service';
import { AfiliadoService } from './afiliado.service';
import { CredencialService } from './credencial.service'; // Agregar el servicio de credenciales

// Interfaces para las opciones de filtros
export interface OpcionesFiltrosAvanzados {
  clubes: ClubConEstadisticas[];
  estadosLicencia: string[];
  tipos: string[];
  categorias: CategoriaConInfo[];
  categoriasNivel: string[];
  estadosPago: string[];
  estadosAfiliacionClub: string[];
  estadosPase: string[];
  clubesPases: ClubPase[];
  rangoEdades: {
    edadMinima: number;
    edadMaxima: number;
  };
  // Nuevas opciones dinámicas
  conceptosCobro: string[];
  equiposActivos: any[];
  fechasVencimiento: {
    proximos30Dias: number;
    proximos60Dias: number;
    vencidos: number;
  };
  // Opciones de credenciales
  estadosCredencial: string[];
}

export interface ClubConEstadisticas {
  idClub: number;
  nombre: string;
  cantidadAfiliados: number;
  estadoAfiliacion: string;
  totalCobros?: number;
  cobrosPendientes?: number;
  ultimaActividad?: string;
}

export interface CategoriaConInfo {
  id?: number;
  nombre: string;
  descripcion?: string;
  cantidadAfiliados: number;
}

export interface ClubPase {
  idClub: number;
  nombre: string;
  pasesOrigen: number;
  pasesDestino: number;
  ultimoPase?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FiltrosAvanzadosService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(
    private http: HttpClient,
    private clubService: ClubService,
    private paseService: PaseService,
    private categoriaService: CategoriaService,
    private cobroService: CobroService,
    private afiliadoService: AfiliadoService,
    private credencialService: CredencialService // Inyectar el servicio de credenciales
  ) {}

  /**
   * Obtener todas las opciones de filtros utilizando los servicios existentes
   */
  obtenerOpcionesFiltrosCompletas(): Observable<OpcionesFiltrosAvanzados> {
    console.log('🔍 Iniciando carga de opciones de filtros usando servicios modulares...');

    return forkJoin({
      // Usar servicios existentes para obtener datos base
      clubes: this.obtenerClubesConEstadisticas(),
      categorias: this.obtenerCategoriasConInfo(),
      pases: this.obtenerEstadisticasPases(),
      cobros: this.obtenerEstadisticasCobros(),
      credenciales: this.obtenerEstadisticasCredenciales(), // Agregar estadísticas de credenciales

      // Obtener datos básicos del backend original como fallback
      opcionesBasicas: this.afiliadoService.obtenerOpcionesFiltros().pipe(
        catchError(() => of({
          clubes: [],
          estadosLicencia: ['ACTIVO', 'INACTIVO', 'VENCIDO', 'PENDIENTE'],
          tipos: [],
          categorias: [],
          categoriasNivel: [],
          estadosPago: ['Pendiente', 'Pagado', 'Vencido', 'Anulado'],
          estadosAfiliacionClub: [],
          estadosPase: ['HABILITADO', 'PENDIENTE', 'RECHAZADO'],
          clubesPases: [],
          rangoEdades: { edadMinima: 0, edadMaxima: 100 },
          estadosCredencial: ['ACTIVA', 'PENDIENTE', 'VENCIDA', 'ANULADA']
        }))
      )
    }).pipe(
      map(({ clubes, categorias, pases, cobros, credenciales, opcionesBasicas }) => {
        const opciones: OpcionesFiltrosAvanzados = {
          // Clubes enriquecidos con estadísticas
          clubes: clubes,

          // Estados desde servicios o fallback
          estadosLicencia: opcionesBasicas.estadosLicencia || ['ACTIVO', 'INACTIVO', 'VENCIDO', 'PENDIENTE'],
          tipos: opcionesBasicas.tipos || [],
          categoriasNivel: opcionesBasicas.categoriasNivel || [],
          estadosAfiliacionClub: opcionesBasicas.estadosAfiliacionClub || [],
          rangoEdades: opcionesBasicas.rangoEdades || { edadMinima: 0, edadMaxima: 100 },

          // Categorías enriquecidas
          categorias: categorias,

          // Estados de pases
          estadosPase: ['HABILITADO', 'PENDIENTE', 'RECHAZADO'],
          clubesPases: pases.clubesPases,

          // Estados de cobros/pagos
          estadosPago: ['Pendiente', 'Pagado', 'Vencido', 'Anulado'],
          conceptosCobro: cobros.conceptos,
          equiposActivos: cobros.equipos,
          fechasVencimiento: cobros.vencimientos,

          // Opciones de credenciales
          estadosCredencial: credenciales.estados
        };

        console.log('✅ Opciones de filtros cargadas con servicios modulares:', {
          clubes: opciones.clubes.length,
          categorias: opciones.categorias.length,
          clubesPases: opciones.clubesPases.length,
          conceptosCobro: opciones.conceptosCobro.length,
          estadosCredencial: opciones.estadosCredencial.length
        });

        return opciones;
      }),
      catchError(error => {
        console.error('❌ Error cargando opciones de filtros:', error);
        // Retornar opciones mínimas en caso de error
        return of(this.obtenerOpcionesPorDefecto());
      })
    );
  }

  /**
   * Obtener clubes enriquecidos con estadísticas usando ClubService y CobroService
   */
  private obtenerClubesConEstadisticas(): Observable<ClubConEstadisticas[]> {
    return combineLatest([
      this.clubService.getClubes(),
      this.afiliadoService.obtenerAfiliados(),
      this.cobroService.getCobros()
    ]).pipe(
      map(([clubes, afiliados, cobros]) => {
        return clubes.map(club => {
          // Asegurar que idClub esté definido
          const clubId = club.idClub || 0;

          // Contar afiliados por club
          const afiliadosDelClub = afiliados.filter(a => a.idClub === clubId);

          // Contar cobros por club
          const cobrosDelClub = cobros.filter(c => c.idClub === clubId);
          const cobrosPendientes = cobrosDelClub.filter(c => c.estado === 'Pendiente').length;

          return {
            idClub: clubId,
            nombre: club.nombre || '',
            cantidadAfiliados: afiliadosDelClub.length,
            estadoAfiliacion: club.estadoAfiliacion || 'ACTIVO',
            totalCobros: cobrosDelClub.length,
            cobrosPendientes: cobrosPendientes,
            ultimaActividad: this.calcularUltimaActividad(afiliadosDelClub, cobrosDelClub)
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtener categorías enriquecidas con información usando CategoriaService y AfiliadoService
   */
  private obtenerCategoriasConInfo(): Observable<CategoriaConInfo[]> {
    return combineLatest([
      this.categoriaService.getCategorias(),
      this.afiliadoService.obtenerAfiliados()
    ]).pipe(
      map(([categorias, afiliados]) => {
        // Mapear categorías desde el servicio usando las propiedades correctas
        const categoriasConInfo = categorias.map(cat => ({
          id: cat.idCategoria, // Usar idCategoria en lugar de id
          nombre: cat.nombre,
          descripcion: cat.tipo, // Usar tipo directamente sin fallback a string vacío
          cantidadAfiliados: afiliados.filter(a => a.categoria === cat.nombre).length
        }));

        // Agregar categorías que aparecen en afiliados pero no en el servicio
        const categoriasDeAfiliados = [...new Set(afiliados.map(a => a.categoria).filter(Boolean))];
        categoriasDeAfiliados.forEach(catNombre => {
          if (catNombre && !categoriasConInfo.find(c => c.nombre === catNombre)) {
            categoriasConInfo.push({
              id: 0, // ID temporal para categorías dinámicas
              nombre: catNombre,
              descripcion: 'categoria1', // Usar un valor válido del tipo union
              cantidadAfiliados: afiliados.filter(a => a.categoria === catNombre).length
            });
          }
        });

        return categoriasConInfo.sort((a, b) => b.cantidadAfiliados - a.cantidadAfiliados);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtener estadísticas de pases usando PaseService
   */
  private obtenerEstadisticasPases(): Observable<{clubesPases: ClubPase[]}> {
    return this.paseService.getPases().pipe(
      map(pases => {
        const clubesPasesMap = new Map<number, ClubPase>();

        pases.forEach(pase => {
          // Club proveniente (origen) - usar las propiedades correctas
          if (pase.clubProveniente && pase.idClubProveniente) {
            const clubOrigen = clubesPasesMap.get(pase.idClubProveniente) || {
              idClub: pase.idClubProveniente,
              nombre: pase.clubProveniente,
              pasesOrigen: 0,
              pasesDestino: 0
            };
            clubOrigen.pasesOrigen++;
            clubesPasesMap.set(pase.idClubProveniente, clubOrigen);
          }

          // Club destino - usar las propiedades correctas
          if (pase.clubDestino && pase.idClubDestino) {
            const clubDestino = clubesPasesMap.get(pase.idClubDestino) || {
              idClub: pase.idClubDestino,
              nombre: pase.clubDestino,
              pasesOrigen: 0,
              pasesDestino: 0
            };
            clubDestino.pasesDestino++;
            clubesPasesMap.set(pase.idClubDestino, clubDestino);
          }
        });

        return {
          clubesPases: Array.from(clubesPasesMap.values())
        };
      }),
      catchError(() => of({clubesPases: []}))
    );
  }

  /**
   * Obtener estadísticas de cobros usando CobroService
   */
  private obtenerEstadisticasCobros(): Observable<{
    conceptos: string[];
    equipos: any[];
    vencimientos: {
      proximos30Dias: number;
      proximos60Dias: number;
      vencidos: number;
    };
  }> {
    return this.cobroService.getCobros().pipe(
      map(cobros => {
        // Extraer conceptos únicos
        const conceptos = [...new Set(cobros.map(c => c.concepto).filter(Boolean))];

        // Extraer equipos únicos
        const equipos = [...new Set(cobros.map(c => c.equipo).filter(Boolean))];

        // Calcular vencimientos
        const hoy = new Date();
        const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
        const en60Dias = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000);

        const vencimientos = {
          proximos30Dias: 0,
          proximos60Dias: 0,
          vencidos: 0
        };

        cobros.forEach(cobro => {
          if (cobro.fechaVencimiento) {
            const fechaVenc = new Date(cobro.fechaVencimiento);
            if (fechaVenc < hoy) {
              vencimientos.vencidos++;
            } else if (fechaVenc <= en30Dias) {
              vencimientos.proximos30Dias++;
            } else if (fechaVenc <= en60Dias) {
              vencimientos.proximos60Dias++;
            }
          }
        });

        return {
          conceptos: conceptos.sort(),
          equipos,
          vencimientos
        };
      }),
      catchError(() => of({
        conceptos: [],
        equipos: [],
        vencimientos: { proximos30Dias: 0, proximos60Dias: 0, vencidos: 0 }
      }))
    );
  }

  /**
   * Obtener estadísticas de credenciales usando CredencialService
   */
  private obtenerEstadisticasCredenciales(): Observable<{estados: string[]}> {
    return this.credencialService.obtenerCredenciales().pipe(
      map(credenciales => {
        // Extraer estados únicos de las credenciales
        const estados = [...new Set(credenciales.map(c => c.estado).filter(Boolean))];

        return {
          estados: estados.length > 0 ? estados : ['ACTIVO', 'PENDIENTE', 'VENCIDA', 'ANULADA']
        };
      }),
      catchError(() => of({
        estados: ['ACTIVO', 'PENDIENTE', 'VENCIDA', 'ANULADA']
      }))
    );
  }

  /**
   * Calcular última actividad de un club
   */
  private calcularUltimaActividad(afiliados: any[], cobros: any[]): string {
    const fechas: Date[] = [];

    // Agregar fechas de afiliados
    afiliados.forEach(a => {
      if (a.fechaLicencia) fechas.push(new Date(a.fechaLicencia));
      if (a.createdAt) fechas.push(new Date(a.createdAt));
    });

    // Agregar fechas de cobros
    cobros.forEach(c => {
      if (c.fechaCobro) fechas.push(new Date(c.fechaCobro));
    });

    if (fechas.length === 0) return 'Sin actividad';

    const ultimaFecha = new Date(Math.max(...fechas.map(f => f.getTime())));
    return ultimaFecha.toISOString().split('T')[0];
  }

  /**
   * Opciones por defecto en caso de error
   */
  private obtenerOpcionesPorDefecto(): OpcionesFiltrosAvanzados {
    return {
      clubes: [],
      estadosLicencia: ['ACTIVO', 'INACTIVO', 'VENCIDO', 'PENDIENTE'],
      tipos: [],
      categorias: [],
      categoriasNivel: [],
      estadosPago: ['Pendiente', 'Pagado', 'Vencido', 'Anulado'],
      estadosAfiliacionClub: [],
      estadosPase: ['HABILITADO', 'PENDIENTE', 'RECHAZADO'],
      clubesPases: [],
      rangoEdades: { edadMinima: 0, edadMaxima: 100 },
      conceptosCobro: [],
      equiposActivos: [],
      fechasVencimiento: { proximos30Dias: 0, proximos60Dias: 0, vencidos: 0 },
      estadosCredencial: ['ACTIVA', 'PENDIENTE', 'VENCIDA', 'ANULADA']
    };
  }

  /**
   * Actualizar opciones de filtros (llamada manual para refrescar datos)
   */
  actualizarOpciones(): Observable<OpcionesFiltrosAvanzados> {
    console.log('🔄 Actualizando opciones de filtros...');
    return this.obtenerOpcionesFiltrosCompletas();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CobroService, Cobro as CobroServiceInterface } from './cobro.service';
import { ClubService } from './club.service';

// Interface específica para el servicio de factura
export interface Cobro {
  idCobro?: number;
  idClub: number;
  nombreClub?: string;
  monto: number;
  fechaCobro: string;
  concepto: string;
  estado: 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado';
  fechaVencimiento: string;
  tipoComprobante: string;
  club?: {
    nombre: string;
    cuit: string;
    direccion: string;
  };
}

export interface Factura {
  id: number;
  numeroFactura: string;
  cobro: Cobro;
  fechaEmision: string;
  total: number;
  itemsFactura: ItemFactura[];
}

export interface ItemFactura {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class FacturaService {
  private apiUrl = `${environment.apiUrl}/cobros`;

  constructor(
    private http: HttpClient,
    private cobroService: CobroService,
    private clubService: ClubService
  ) { }

  getCobros(): Observable<Cobro[]> {
    return this.cobroService.getCobros().pipe(
      switchMap(cobros => {
        if (!cobros || cobros.length === 0) {
          return of([]);
        }

        // Crear observables para enriquecer cada cobro con información del club
        const cobroObservables = cobros
          .filter(cobro => cobro !== null && cobro !== undefined)
          .map(cobro =>
            this.clubService.getClub(cobro.idClub).pipe(
              map(club => this.mapCobroToFacturaInterface(cobro, club)),
              catchError(() => of(this.mapCobroToFacturaInterface(cobro, null)))
            )
          );

        // Ejecutar todas las llamadas en paralelo
        return forkJoin(cobroObservables);
      }),
      catchError(error => {
        console.error('Error al obtener cobros:', error);
        return of([]);
      })
    );
  }

  getCobroById(id: number): Observable<Cobro | undefined> {
    return this.cobroService.getCobro(id).pipe(
      switchMap(cobro => {
        if (!cobro) {
          return of(undefined);
        }

        // Enriquecer con información del club
        return this.clubService.getClub(cobro.idClub).pipe(
          map(club => this.mapCobroToFacturaInterface(cobro, club)),
          catchError(() => of(this.mapCobroToFacturaInterface(cobro, null)))
        );
      }),
      catchError(error => {
        console.error('Error al obtener cobro:', error);
        return of(undefined);
      })
    );
  }

  private mapCobroToFacturaInterface(cobro: CobroServiceInterface, club: any): Cobro {
    return {
      idCobro: cobro.idCobro,
      idClub: cobro.idClub,
      nombreClub: club?.nombre || cobro.club?.nombre || 'Club no encontrado',
      monto: cobro.monto,
      fechaCobro: cobro.fechaCobro || new Date().toISOString().split('T')[0],
      concepto: cobro.concepto,
      estado: cobro.estado,
      fechaVencimiento: cobro.fechaVencimiento || new Date().toISOString().split('T')[0],
      tipoComprobante: cobro.tipoComprobante || 'RECIBO_DE_PAGO',
      club: club ? {
        nombre: club.nombre,
        cuit: club.cuit,
        direccion: club.direccion
      } : undefined
    };
  }

  generarFactura(cobroId: number): Observable<Factura> {
    return this.getCobroById(cobroId).pipe(
      map(cobro => {
        if (!cobro) {
          throw new Error('Cobro no encontrado');
        }

        const nuevaFactura: Factura = {
          id: Date.now(), // ID temporal
          numeroFactura: this.generarNumeroFactura(cobro.tipoComprobante),
          cobro: cobro,
          fechaEmision: new Date().toISOString().split('T')[0],
          total: cobro.monto,
          itemsFactura: [
            {
              descripcion: cobro.concepto,
              cantidad: 1,
              precioUnitario: cobro.monto,
              subtotal: cobro.monto
            }
          ]
        };

        return nuevaFactura;
      })
    );
  }

  private generarNumeroFactura(tipoComprobante: string): string {
    const año = new Date().getFullYear();
    const numero = Math.floor(Math.random() * 100000).toString().padStart(6, '0');

    let prefijo = 'FC'; // Por defecto Factura C
    if (tipoComprobante.includes('RECIBO_DE_PAGO') || tipoComprobante.includes('A')) {
      prefijo = 'FA';
    } else if (tipoComprobante.includes('RECIBO_DE_PAGO') || tipoComprobante.includes('B')) {
      prefijo = 'FB';
    } else if (tipoComprobante.includes('RECIBO_DE_PAGO')) {
      prefijo = 'RC';
    }

    return `${prefijo}-${año}-${numero}`;
  }

  getFacturas(): Observable<Factura[]> {
    // En una implementación real, esto vendría de una API específica de facturas
    return of([]);
  }

  getFacturaById(id: number): Observable<Factura | undefined> {
    // Simulación - en producción esto vendría de la API
    return of(undefined);
  }
}

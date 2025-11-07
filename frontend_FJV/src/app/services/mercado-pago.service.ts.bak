import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DatosPagador {
  nombre: string;
  apellido: string;
  email: string;
  documento?: string;
  tipoDocumento?: 'DNI' | 'CI' | 'LE';
}

export interface IniciarPagoRequest {
  datosPagador: DatosPagador;
}

export interface IniciarPagoResponse {
  status: string;
  msg: string;
  preferencia: {
    id: string;
    init_point: string;
    sandbox_init_point?: string;
  };
  pago: any;
  cobro: any;
  ambiente: string;
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private readonly API_URL = `${environment.apiUrl}/pagos`;

  constructor(private http: HttpClient) {
    console.log('✅ MercadoPagoService inicializado con URL:', this.API_URL);
  }

  /**
   * Inicia el proceso de pago para un cobro específico
   */
  iniciarPagoCobro(idCobro: number, datosPagador: DatosPagador): Observable<IniciarPagoResponse> {
    console.log('🚀 Iniciando pago para cobro:', idCobro);
    console.log('👤 Datos del pagador:', datosPagador);
    console.log('🌐 URL completa:', `${this.API_URL}/cobro/${idCobro}/iniciar`);

    const body: IniciarPagoRequest = { datosPagador };

    return this.http.post<IniciarPagoResponse>(`${this.API_URL}/cobro/${idCobro}/iniciar`, body).pipe(
      catchError(this.handleError<IniciarPagoResponse>('iniciarPagoCobro'))
    );
  }

  /**
   * Verifica el estado de un pago
   */
  verificarPago(paymentId: string): Observable<any> {
    console.log('🔍 Verificando pago:', paymentId);
    return this.http.get(`${this.API_URL}/verificar/${paymentId}`).pipe(
      catchError(this.handleError('verificarPago'))
    );
  }

  /**
   * Lista todos los pagos de un cobro específico
   */
  listarPagosCobro(idCobro: number): Observable<any> {
    console.log('📋 Listando pagos del cobro:', idCobro);
    return this.http.get(`${this.API_URL}/cobro/${idCobro}`).pipe(
      catchError(this.handleError('listarPagosCobro'))
    );
  }

  /**
   * Convierte un cobro en datos básicos para mostrar
   */
  convertCobroToPaymentInfo(cobro: any): any {
    return {
      id: cobro.idCobro,
      concepto: cobro.concepto || 'Pago de cobro',
      monto: typeof cobro.monto === 'string' ? parseFloat(cobro.monto) : cobro.monto,
      club: cobro.club?.nombre || 'Sin club',
      descripcion: `Cobro ID: ${cobro.idCobro} - Club: ${cobro.club?.nombre || 'Sin club'}`
    };
  }

  /**
   * Abre la página de pago de Mercado Pago en la misma ventana
   */
  abrirPagina(initPoint: string): void {
    console.log('🌐 Navegando a la página de pago:', initPoint);
    // Navegar en la misma ventana para que cuando termine, pueda volver al sitio
    window.location.href = initPoint;
  }

  /**
   * Maneja los errores HTTP
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`❌ ${operation} falló:`, error);
      console.error('📊 Detalles completos del error:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        message: error.message,
        error: error.error
      });

      // Sugerencias basadas en el tipo de error
      if (error.status === 404) {
        console.error('🔍 Error 404: La ruta no existe. Verifica que el backend esté corriendo y tenga la ruta configurada.');
      } else if (error.status === 500) {
        console.error('⚠️ Error 500: Error interno del servidor. Verifica los logs del backend.');
      } else if (error.status === 0) {
        console.error('🔌 Error de conexión: ¿Está corriendo el backend?');
      } else if (error.status === 400) {
        console.error('⚠️ Error 400: Datos inválidos enviados al servidor.');
        if (error.error && error.error.msg) {
          console.error('Mensaje del servidor:', error.error.msg);
        }
      }

      // Devuelve un resultado vacío para que la aplicación siga funcionando
      return of(result as T);
    };
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, filter, distinctUntilChanged, tap } from 'rxjs/operators';
import { CobroService, Cobro } from './cobro.service';
import { NotificationService } from './notification.service';

export interface PaymentStatus {
  cobroId: number;
  estado: string;
  lastChecked: Date;
  isMonitoring: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentMonitorService {
  private monitoredPayments$ = new BehaviorSubject<Map<number, PaymentStatus>>(new Map());
  private pollingSubscription?: Subscription;
  private pollingInterval = 5000; // 5 segundos
  private maxPollingDuration = 600000; // 10 minutos máximo de monitoreo

  // Subject para notificar cambios de estado específicos
  private paymentUpdates$ = new BehaviorSubject<{cobroId: number, oldState: string, newState: string} | null>(null);

  constructor(
    private cobroService: CobroService,
    private notificationService: NotificationService
  ) {
    this.startPolling();
  }

  /**
   * Agregar un cobro al monitoreo
   */
  startMonitoring(cobroId: number, currentState: string): void {
    const currentMonitored = this.monitoredPayments$.value;

    // Si ya está siendo monitoreado y está pagado, no hacer nada
    if (currentMonitored.has(cobroId) && currentState === 'Pagado') {
      return;
    }

    currentMonitored.set(cobroId, {
      cobroId,
      estado: currentState,
      lastChecked: new Date(),
      isMonitoring: true
    });

    this.monitoredPayments$.next(new Map(currentMonitored));

    console.log(`🔍 Iniciando monitoreo del cobro #${cobroId} (estado: ${currentState})`);

    // Programar detención automática del monitoreo después del tiempo máximo
    setTimeout(() => {
      this.stopMonitoring(cobroId);
    }, this.maxPollingDuration);
  }

  /**
   * Detener el monitoreo de un cobro específico
   */
  stopMonitoring(cobroId: number): void {
    const currentMonitored = this.monitoredPayments$.value;
    if (currentMonitored.has(cobroId)) {
      currentMonitored.delete(cobroId);
      this.monitoredPayments$.next(new Map(currentMonitored));
      console.log(`⏹️ Deteniendo monitoreo del cobro #${cobroId}`);
    }
  }

  /**
   * Obtener observable de actualizaciones de pago
   */
  getPaymentUpdates(): Observable<{cobroId: number, oldState: string, newState: string} | null> {
    return this.paymentUpdates$.asObservable().pipe(
      filter(update => update !== null)
    );
  }

  /**
   * Obtener estado de monitoreo de un cobro específico
   */
  getMonitoringStatus(cobroId: number): PaymentStatus | null {
    return this.monitoredPayments$.value.get(cobroId) || null;
  }

  /**
   * Verificar si un cobro está siendo monitoreado
   */
  isMonitoring(cobroId: number): boolean {
    return this.monitoredPayments$.value.has(cobroId);
  }

  /**
   * Iniciar el polling de cobros monitoreados
   */
  private startPolling(): void {
    this.pollingSubscription = interval(this.pollingInterval).pipe(
      switchMap(() => this.checkMonitoredPayments())
    ).subscribe();
  }

  /**
   * Verificar todos los cobros monitoreados
   */
  private checkMonitoredPayments(): Observable<void> {
    return new Observable(observer => {
      const monitoredMap = this.monitoredPayments$.value;

      if (monitoredMap.size === 0) {
        observer.next();
        observer.complete();
        return;
      }

      const cobroIds = Array.from(monitoredMap.keys());
      let completedChecks = 0;

      cobroIds.forEach(cobroId => {
        this.cobroService.getCobro(cobroId).subscribe({
          next: (cobro) => {
            this.processPaymentCheck(cobroId, cobro);
            completedChecks++;

            if (completedChecks === cobroIds.length) {
              observer.next();
              observer.complete();
            }
          },
          error: (error) => {
            console.error(`Error al verificar cobro #${cobroId}:`, error);
            completedChecks++;

            if (completedChecks === cobroIds.length) {
              observer.next();
              observer.complete();
            }
          }
        });
      });
    });
  }

  /**
   * Procesar el resultado de verificar un cobro
   */
  private processPaymentCheck(cobroId: number, cobro: Cobro): void {
    const currentMonitored = this.monitoredPayments$.value;
    const monitoredPayment = currentMonitored.get(cobroId);

    if (!monitoredPayment) return;

    const oldState = monitoredPayment.estado;
    const newState = cobro.estado;

    // Actualizar el estado en el monitoreo
    monitoredPayment.estado = newState;
    monitoredPayment.lastChecked = new Date();
    currentMonitored.set(cobroId, monitoredPayment);
    this.monitoredPayments$.next(new Map(currentMonitored));

    // Si cambió el estado, notificar
    if (oldState !== newState) {
      console.log(`🔄 Cambio de estado detectado en cobro #${cobroId}: ${oldState} → ${newState}`);

      // Emitir evento de cambio
      this.paymentUpdates$.next({
        cobroId,
        oldState,
        newState
      });

      // Mostrar notificación según el nuevo estado
      this.showStateChangeNotification(cobroId, oldState, newState, cobro);

      // Si se pagó o anuló, detener el monitoreo
      if (newState === 'Pagado' || newState === 'Anulado') {
        setTimeout(() => {
          this.stopMonitoring(cobroId);
        }, 2000); // Esperar 2 segundos antes de detener el monitoreo
      }
    }
  }

  /**
   * Mostrar notificación de cambio de estado
   */
  private showStateChangeNotification(cobroId: number, oldState: string, newState: string, cobro: Cobro): void {
    switch (newState) {
      case 'Pagado':
        this.notificationService.showPaymentSuccess(cobroId, cobro.monto);
        break;

      case 'Pendiente':
        if (oldState === 'Vencido') {
          this.notificationService.showInfo(
            '⏰ Estado Actualizado',
            `El cobro #${cobroId} cambió de Vencido a Pendiente`
          );
        }
        break;

      case 'Vencido':
        this.notificationService.showWarning(
          '⚠️ Cobro Vencido',
          `El cobro #${cobroId} ha vencido y requiere atención`
        );
        break;

      case 'Anulado':
        this.notificationService.showInfo(
          '❌ Cobro Anulado',
          `El cobro #${cobroId} ha sido anulado`
        );
        break;
    }
  }

  /**
   * Limpiar todos los monitoreos (útil al salir de la aplicación)
   */
  clearAllMonitoring(): void {
    this.monitoredPayments$.next(new Map());
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  /**
   * Obtener estadísticas de monitoreo
   */
  getMonitoringStats(): {total: number, byState: {[key: string]: number}} {
    const monitored = Array.from(this.monitoredPayments$.value.values());
    const stats = {
      total: monitored.length,
      byState: {} as {[key: string]: number}
    };

    monitored.forEach(payment => {
      stats.byState[payment.estado] = (stats.byState[payment.estado] || 0) + 1;
    });

    return stats;
  }
}

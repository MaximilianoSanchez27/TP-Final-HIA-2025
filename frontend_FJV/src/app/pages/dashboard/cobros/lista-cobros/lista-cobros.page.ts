import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CobroService, Cobro } from '../../../../services/cobro.service';
import { PaymentMonitorService } from '../../../../services/payment-monitor.service';
import { NotificationService } from '../../../../services/notification.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lista-cobros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lista-cobros.page.html',
  styleUrls: ['./lista-cobros.page.css'],
})
export class ListaCobrosPage implements OnInit, OnDestroy {
  cobros: Cobro[] = [];
  isLoading = true;
  errorMessage = '';
  monitoringCount = 0;
  lastUpdate = new Date();

  busquedaTexto: string = '';
  estadoSeleccionado: string = '';

  // Lista filtrada
  cobrosFiltrados: any[] = [];

  // Llamar esto en ngOnInit o cuando obtengas los cobros del servicio

  // Lógica de filtrado

  private paymentUpdatesSubscription?: Subscription;

  badgeClasses: { [key: string]: string } = {
    Pendiente: 'bg-warning text-dark',
    Pagado: 'bg-success',
    Vencido: 'bg-danger',
    Anulado: 'bg-secondary',
  };

  constructor(
    private cobroService: CobroService,
    private paymentMonitorService: PaymentMonitorService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarCobros();
    this.setupPaymentMonitoring();
    this.updateMonitoringStats();
    this.cobrosFiltrados = [...this.cobros];
  }

  ngOnDestroy(): void {
    if (this.paymentUpdatesSubscription) {
      this.paymentUpdatesSubscription.unsubscribe();
    }
  }

  filtrar(): void {
    const texto = this.busquedaTexto.toLowerCase().trim();
    const estado = this.estadoSeleccionado;

    this.cobrosFiltrados = this.cobros.filter((cobro) => {
      const coincideTexto = texto
        ? cobro.club?.nombre?.toLowerCase().includes(texto) ||
          cobro.concepto?.toLowerCase().includes(texto) ||
          cobro.idCobro?.toString().includes(texto)
        : true;

      const coincideEstado = estado ? cobro.estado === estado : true;

      return coincideTexto && coincideEstado;
    });
  }

  private setupPaymentMonitoring(): void {
    // Suscribirse a actualizaciones de pagos
    this.paymentUpdatesSubscription = this.paymentMonitorService
      .getPaymentUpdates()
      .subscribe((update) => {
        if (update) {
          console.log(`🔄 Actualización detectada en lista de cobros:`, update);

          // Actualizar el cobro específico en la lista
          this.updateCobroInList(update.cobroId, update.newState);
          this.lastUpdate = new Date();
        }
      });
  }

  private updateCobroInList(cobroId: number, newState: string): void {
    const cobroIndex = this.cobros.findIndex((c) => c.idCobro === cobroId);
    if (cobroIndex !== -1) {
      // Actualizar solo el estado para una transición suave
      this.cobros[cobroIndex].estado = newState as
        | 'Pendiente'
        | 'Pagado'
        | 'Vencido'
        | 'Anulado';

      // Opcionalmente, recargar los datos completos del cobro
      this.cobroService.getCobro(cobroId).subscribe({
        next: (cobro) => {
          this.cobros[cobroIndex] = cobro;
        },
        error: (error) => {
          console.error(`Error al actualizar cobro #${cobroId}:`, error);
        },
      });
    }
  }

  private updateMonitoringStats(): void {
    const stats = this.paymentMonitorService.getMonitoringStats();
    this.monitoringCount = stats.total;
  }

  cargarCobros(): void {
    this.isLoading = true;
    this.cobroService.getCobros().subscribe({
      next: (cobros) => {
        this.cobros = cobros;
        this.isLoading = false;
        this.lastUpdate = new Date();
        this.updateMonitoringStats();

        // Auto-iniciar monitoreo para cobros pendientes y vencidos
        this.autoStartMonitoringForPendingPayments();
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los cobros: ' + error.message;
        this.isLoading = false;
        this.notificationService.showError(
          'Error de Carga',
          'No se pudieron cargar los cobros'
        );
      },
    });
  }

  private autoStartMonitoringForPendingPayments(): void {
    // Automáticamente iniciar monitoreo para cobros pendientes o vencidos
    const cobrosPendientes = this.cobros.filter(
      (c) =>
        (c.estado === 'Pendiente' || c.estado === 'Vencido') &&
        c.idCobro &&
        !this.paymentMonitorService.isMonitoring(c.idCobro)
    );

    cobrosPendientes.forEach((cobro) => {
      if (cobro.idCobro) {
        this.paymentMonitorService.startMonitoring(cobro.idCobro, cobro.estado);
      }
    });

    if (cobrosPendientes.length > 0) {
      this.updateMonitoringStats();
      this.notificationService.showInfo(
        '🔍 Monitoreo Iniciado',
        `Se activó el monitoreo automático para ${cobrosPendientes.length} cobro(s) pendiente(s)`
      );
    }
  }

  refreshListaManually(): void {
    this.notificationService.showInfo(
      '🔄 Actualizando...',
      'Recargando la lista de cobros'
    );
    this.cargarCobros();
  }

  startMonitoringForCobro(cobro: Cobro): void {
    if (
      cobro.idCobro &&
      !this.paymentMonitorService.isMonitoring(cobro.idCobro)
    ) {
      this.paymentMonitorService.startMonitoring(cobro.idCobro, cobro.estado);
      this.updateMonitoringStats();

      this.notificationService.showInfo(
        '🔍 Monitoreo Iniciado',
        `Se activó el monitoreo para el cobro #${cobro.idCobro}`
      );
    }
  }

  stopMonitoringForCobro(cobro: Cobro): void {
    if (
      cobro.idCobro &&
      this.paymentMonitorService.isMonitoring(cobro.idCobro)
    ) {
      this.paymentMonitorService.stopMonitoring(cobro.idCobro);
      this.updateMonitoringStats();

      this.notificationService.showInfo(
        '⏹️ Monitoreo Detenido',
        `Se detuvo el monitoreo para el cobro #${cobro.idCobro}`
      );
    }
  }

  isMonitoring(cobro: Cobro): boolean {
    return cobro.idCobro
      ? this.paymentMonitorService.isMonitoring(cobro.idCobro)
      : false;
  }

  canMonitor(cobro: Cobro): boolean {
    return cobro.estado === 'Pendiente' || cobro.estado === 'Vencido';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  toggleAllMonitoring(): void {
    const pendingCobros = this.cobros.filter((c) => this.canMonitor(c));
    const allMonitored = pendingCobros.every((c) => this.isMonitoring(c));

    if (allMonitored) {
      // Detener todos
      pendingCobros.forEach((cobro) => {
        if (cobro.idCobro) {
          this.paymentMonitorService.stopMonitoring(cobro.idCobro);
        }
      });
      this.updateMonitoringStats();
      this.notificationService.showInfo(
        '⏹️ Monitoreo Detenido',
        'Se detuvo el monitoreo para todos los cobros'
      );
    } else {
      // Iniciar todos
      pendingCobros.forEach((cobro) => {
        if (cobro.idCobro && !this.isMonitoring(cobro)) {
          this.paymentMonitorService.startMonitoring(
            cobro.idCobro,
            cobro.estado
          );
        }
      });
      this.updateMonitoringStats();
      this.notificationService.showInfo(
        '🔍 Monitoreo Iniciado',
        `Se activó el monitoreo para ${pendingCobros.length} cobro(s)`
      );
    }
  }

  hasMonitorableCobros(): boolean {
    return this.cobros.some((c) => this.canMonitor(c));
  }

  getMonitorableCobros(): Cobro[] {
    return this.cobros.filter((c) => this.canMonitor(c));
  }

  areAllMonitored(): boolean {
    const monitorableCobros = this.getMonitorableCobros();
    return monitorableCobros.every((c) => this.isMonitoring(c));
  }
}

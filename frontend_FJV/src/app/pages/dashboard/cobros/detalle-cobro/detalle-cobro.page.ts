import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CobroService, Cobro } from '../../../../services/cobro.service';
import { PaymentMonitorService } from '../../../../services/payment-monitor.service';
import { NotificationService } from '../../../../services/notification.service';
import { PublicPaymentService, PublicPaymentData, PublicPaymentLink } from '../../../../services/public-payment.service';
import { PagoCobroComponent } from '../../../../components/mercado-pago/pago-cobro/pago-cobro.component';

@Component({
  selector: 'app-detalle-cobro',
  standalone: true,
  imports: [CommonModule, RouterModule, PagoCobroComponent],
  templateUrl: './detalle-cobro.page.html',
  styleUrls: ['./detalle-cobro.page.css']
})
export class DetalleCobroPage implements OnInit, OnDestroy {
  cobro: Cobro | null = null;
  isLoading = true;
  errorMessage = '';
  showPaymentModal = false;
  isMonitoring = false;

  // Enlaces públicos
  publicPaymentLinks: PublicPaymentLink[] = [];
  isGeneratingLink = false;
  showPublicLinkModal = false;
  generatedPublicUrl = '';

  private paymentUpdatesSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cobroService: CobroService,
    private paymentMonitorService: PaymentMonitorService,
    private notificationService: NotificationService,
    public publicPaymentService: PublicPaymentService
  ) {
    // Asegurar inicialización del array
    this.publicPaymentLinks = [];
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.errorMessage = 'ID de cobro inválido';
      this.isLoading = false;
      return;
    }

    this.loadCobro(id);
    this.setupPaymentMonitoring(id);
    this.loadPublicPaymentLinks(id);
  }

  ngOnDestroy(): void {
    // Limpiar suscripción al destruir el componente
    if (this.paymentUpdatesSubscription) {
      this.paymentUpdatesSubscription.unsubscribe();
    }

    // Detener monitoreo del cobro actual si existe
    if (this.cobro?.idCobro) {
      this.paymentMonitorService.stopMonitoring(this.cobro.idCobro);
    }
  }

  private loadCobro(id: number): void {
    this.isLoading = true;
    this.cobroService.getCobro(id).subscribe({
      next: (cobro) => {
        const previousState = this.cobro?.estado;
        this.cobro = cobro;
        this.isLoading = false;

        // Si el estado cambió (y no es la primera carga), mostrar notificación
        if (previousState && previousState !== cobro.estado) {
          this.notificationService.showInfo(
            '🔄 Estado Actualizado',
            `El cobro cambió de ${previousState} a ${cobro.estado}`
          );
        }

        // Actualizar estado de monitoreo
        this.updateMonitoringStatus();
      },
      error: (error) => {
        this.errorMessage = `Error al cargar el cobro: ${error.error?.error || error.message}`;
        this.isLoading = false;
        this.notificationService.showError(
          'Error de Carga',
          'No se pudo cargar la información del cobro'
        );
      }
    });
  }

  private loadPublicPaymentLinks(cobroId: number): void {
    this.publicPaymentService.getPublicPaymentLinksForCobro(cobroId).subscribe({
      next: (links) => {
        // Asegurar que siempre sea un array válido
        this.publicPaymentLinks = Array.isArray(links) ? links : [];
        console.log('Enlaces cargados:', this.publicPaymentLinks);
      },
      error: (error) => {
        console.error('Error cargando enlaces públicos:', error);
        // En caso de error, asegurar que sea un array vacío
        this.publicPaymentLinks = [];
      }
    });
  }

  private setupPaymentMonitoring(cobroId: number): void {
    // Suscribirse a actualizaciones de pagos para este cobro específico
    this.paymentUpdatesSubscription = this.paymentMonitorService.getPaymentUpdates().subscribe(
      update => {
        if (update && update.cobroId === cobroId) {
          console.log(`🔄 Actualización detectada para cobro #${cobroId}:`, update);

          // Recargar los datos del cobro sin mostrar loading
          this.refreshCobroData();
        }
      }
    );
  }

  private refreshCobroData(): void {
    if (this.cobro?.idCobro) {
      // Recargar datos sin mostrar el spinner de loading
      this.cobroService.getCobro(this.cobro.idCobro).subscribe({
        next: (cobro) => {
          this.cobro = cobro;
          this.updateMonitoringStatus();
        },
        error: (error) => {
          console.error('Error al refrescar datos del cobro:', error);
        }
      });
    }
  }

  private updateMonitoringStatus(): void {
    if (this.cobro?.idCobro) {
      this.isMonitoring = this.paymentMonitorService.isMonitoring(this.cobro.idCobro);
    }
  }

  generatePublicPaymentLink(): void {
    if (!this.cobro?.idCobro) return;

    this.isGeneratingLink = true;
    this.publicPaymentService.generatePublicPaymentLink(this.cobro.idCobro).subscribe({
      next: (data: PublicPaymentData) => {
        this.isGeneratingLink = false;
        this.generatedPublicUrl = data.publicUrl;
        this.showPublicLinkModal = true;

        // Actualizar lista de enlaces
        this.loadPublicPaymentLinks(this.cobro!.idCobro!);

        this.notificationService.showSuccess(
          '🔗 Enlace Generado',
          'Se ha creado un enlace público para este cobro'
        );
      },
      error: (error) => {
        this.isGeneratingLink = false;
        this.notificationService.showError(
          'Error',
          'No se pudo generar el enlace público'
        );
      }
    });
  }

  copyPublicLinkToClipboard(url: string): void {
    navigator.clipboard.writeText(url).then(() => {
      this.notificationService.showSuccess(
        '📋 Enlace Copiado',
        'El enlace ha sido copiado al portapapeles'
      );
    }).catch(() => {
      this.notificationService.showError(
        'Error',
        'No se pudo copiar el enlace'
      );
    });
  }

  togglePublicLink(link: PublicPaymentLink): void {
    this.publicPaymentService.togglePublicPaymentLink(link.id, !link.isActive).subscribe({
      next: () => {
        link.isActive = !link.isActive;
        this.notificationService.showSuccess(
          link.isActive ? '✅ Enlace Activado' : '⏸️ Enlace Desactivado',
          `El enlace público ha sido ${link.isActive ? 'activado' : 'desactivado'}`
        );
      },
      error: () => {
        this.notificationService.showError(
          'Error',
          'No se pudo cambiar el estado del enlace'
        );
      }
    });
  }

  deletePublicLink(link: PublicPaymentLink): void {
    if (confirm('¿Estás seguro de eliminar este enlace público?')) {
      this.publicPaymentService.deletePublicPaymentLink(link.id).subscribe({
        next: () => {
          this.publicPaymentLinks = this.publicPaymentLinks.filter(l => l.id !== link.id);
          this.notificationService.showSuccess(
            '🗑️ Enlace Eliminado',
            'El enlace público ha sido eliminado'
          );
        },
        error: () => {
          this.notificationService.showError(
            'Error',
            'No se pudo eliminar el enlace'
          );
        }
      });
    }
  }

  sharePublicLink(url: string): void {
    if (navigator.share && this.cobro) {
      navigator.share({
        title: `Pagar: ${this.cobro.concepto}`,
        text: `Paga fácilmente ${this.formatCurrency(this.cobro.monto)} por ${this.cobro.concepto}`,
        url: url
      }).catch(err => console.log('Error sharing:', err));
    } else {
      this.copyPublicLinkToClipboard(url);
    }
  }

  closePublicLinkModal(): void {
    this.showPublicLinkModal = false;
    this.generatedPublicUrl = '';
  }

  marcarComoPagado(): void {
    if (!this.cobro || this.cobro.estado === 'Pagado') return;

    if (confirm('¿Está seguro que desea marcar este cobro como pagado?')) {
      this.cobroService.cambiarEstadoCobro(this.cobro.idCobro!, 'Pagado').subscribe({
        next: (response) => {
          if (response.status === "1") {
            this.notificationService.showSuccess(
              '✅ Estado Actualizado',
              response.msg || 'Cobro marcado como pagado exitosamente'
            );

            // Recargar los datos del cobro
            this.refreshCobroData();
          } else {
            this.notificationService.showError(
              'Error',
              response.msg || 'No se pudo actualizar el cobro'
            );
          }
        },
        error: (error) => {
          this.notificationService.showError(
            'Error',
            `Error: ${error.error?.error || 'No se pudo actualizar el cobro'}`
          );
        }
      });
    }
  }

  openPaymentModal(): void {
    if (this.cobro && this.cobro.estado !== 'Pagado') {
      this.showPaymentModal = true;
    }
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  onPaymentInitiated(): void {
    if (this.cobro?.idCobro) {
      // Iniciar monitoreo del pago
      this.paymentMonitorService.startMonitoring(this.cobro.idCobro, this.cobro.estado);
      this.isMonitoring = true;

      this.notificationService.showInfo(
        '🚀 Pago Iniciado',
        'Se ha abierto la ventana de MercadoPago. El estado se actualizará automáticamente cuando se complete el pago.',
        10000
      );

      this.closePaymentModal();
    }
  }

  startManualMonitoring(): void {
    if (this.cobro?.idCobro && !this.isMonitoring) {
      this.paymentMonitorService.startMonitoring(this.cobro.idCobro, this.cobro.estado);
      this.isMonitoring = true;

      this.notificationService.showInfo(
        '🔍 Monitoreo Activado',
        'Se ha activado el monitoreo automático del estado de este cobro'
      );
    }
  }

  stopManualMonitoring(): void {
    if (this.cobro?.idCobro && this.isMonitoring) {
      this.paymentMonitorService.stopMonitoring(this.cobro.idCobro);
      this.isMonitoring = false;

      this.notificationService.showInfo(
        '⏹️ Monitoreo Detenido',
        'Se ha detenido el monitoreo automático de este cobro'
      );
    }
  }

  refreshCobroManually(): void {
    if (this.cobro?.idCobro) {
      this.notificationService.showInfo(
        '🔄 Actualizando...',
        'Verificando el estado actual del cobro'
      );
      this.refreshCobroData();
    }
  }

  canPay(): boolean {
    return this.cobro?.estado === 'Pendiente' || this.cobro?.estado === 'Vencido';
  }

  getEstadoClass(): string {
    if (!this.cobro) return '';

    switch (this.cobro.estado) {
      case 'Pagado':
        return 'estado-pagado';
      case 'Pendiente':
        return 'estado-pendiente';
      case 'Vencido':
        return 'estado-vencido';
      case 'Anulado':
        return 'estado-anulado';
      default:
        return '';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  isValidLinksArray(): boolean {
    return this.publicPaymentLinks &&
           Array.isArray(this.publicPaymentLinks) &&
           this.publicPaymentLinks.length > 0;
  }

  hasNoLinks(): boolean {
    return !this.publicPaymentLinks ||
           !Array.isArray(this.publicPaymentLinks) ||
           this.publicPaymentLinks.length === 0;
  }

  volver(): void {
    this.router.navigate(['/dashboard/cobros']);
  }
}

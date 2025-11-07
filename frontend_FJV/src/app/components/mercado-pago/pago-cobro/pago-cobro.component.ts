import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MercadoPagoService, DatosPagador } from '../../../services/mercado-pago.service';
import { QrGeneratorService } from '../../../services/qr-generator.service';
import { Cobro } from '../../../services/cobro.service';

@Component({
  selector: 'app-pago-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago-cobro.component.html',
  styleUrls: ['./pago-cobro.component.css']
})
export class PagoCobroComponent implements OnInit {
  @Input() cobro!: Cobro;
  @Input() showModal = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() paymentInitiated = new EventEmitter<void>();

  // Datos del pagador
  datosPagador: DatosPagador = {
    nombre: '',
    apellido: '',
    email: '',
    documento: '',
    tipoDocumento: 'DNI'
  };

  isProcessing = false;
  errorMessage = '';

  // Variables para QR
  showQRCode = false;
  qrCodeImage = '';
  paymentLink = '';
  isGeneratingQR = false;

  tiposDocumento = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CI', label: 'Cédula de Identidad' },
    { value: 'LE', label: 'Libreta de Enrolamiento' }
  ];

  constructor(
    private mercadoPagoService: MercadoPagoService,
    private qrGeneratorService: QrGeneratorService
  ) {}

  ngOnInit(): void {
    // Limpiar formulario cuando se abra el modal
    if (this.showModal) {
      this.resetForm();
    }
  }

  formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(num);
  }

  onClose(): void {
    this.closeModal.emit();
    this.resetForm();
  }

  /**
   * Genera un código QR para el pago
   */
  async onGenerateQRCode(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isGeneratingQR = true;
    this.errorMessage = '';

    try {
      console.log('🔄 Generando código QR para pago...');

      // Iniciar proceso de pago con la nueva API
      const response = await this.mercadoPagoService.iniciarPagoCobro(this.cobro.idCobro!, this.datosPagador).toPromise();

      if (response && response.status === '1' && response.preferencia?.init_point) {
        this.paymentLink = response.preferencia.init_point;
        console.log('🌐 Link de pago obtenido:', this.paymentLink);

        // Generar QR usando la API online (más confiable)
        this.qrCodeImage = this.qrGeneratorService.generateQRFromAPI(this.paymentLink, 250);

        // Alternativamente, generar con Canvas (comentado para usar la API)
        // this.qrCodeImage = await this.qrGeneratorService.generateQR(this.paymentLink, 250);

        this.showQRCode = true;
        console.log('✅ Código QR generado exitosamente');

        // Emitir evento de pago iniciado
        this.paymentInitiated.emit();
      } else {
        this.errorMessage = response?.msg || 'No se pudo generar el enlace de pago para el QR.';
        console.error('❌ Respuesta inválida:', response);
      }
    } catch (error: any) {
      console.error('❌ Error al generar QR:', error);

      if (error?.error?.msg) {
        this.errorMessage = error.error.msg;
      } else if (error?.message) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Error al generar el código QR. Intente nuevamente.';
      }
    } finally {
      this.isGeneratingQR = false;
    }
  }

  /**
   * Abre el link de pago en la misma ventana
   */
  onPayWithLink(): void {
    if (this.paymentLink) {
      console.log('🌐 Navegando al link de pago:', this.paymentLink);
      this.mercadoPagoService.abrirPagina(this.paymentLink);
      this.onClose();
    }
  }

  /**
   * Pago tradicional - redirige directamente
   */
  onPayWithMercadoPago(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    // Log para debugging
    console.log('🚀 Iniciando pago directo para cobro:', this.cobro.idCobro);
    console.log('👤 Datos del pagador:', this.datosPagador);

    // Iniciar proceso de pago con la nueva API
    this.mercadoPagoService.iniciarPagoCobro(this.cobro.idCobro!, this.datosPagador).subscribe({
      next: (response) => {
        this.isProcessing = false;
        console.log('✅ Respuesta del backend:', response);

        if (response && response.status === '1' && response.preferencia?.init_point) {
          console.log('🌐 Redirigiendo a:', response.preferencia.init_point);

          // Abrir página de pago en la misma ventana
          this.mercadoPagoService.abrirPagina(response.preferencia.init_point);

          // Emitir evento de pago iniciado
          this.paymentInitiated.emit();

          // Cerrar modal
          this.onClose();
        } else {
          this.errorMessage = response?.msg || 'No se pudo generar el enlace de pago. Intente nuevamente.';
          console.error('❌ Respuesta inválida:', response);
        }
      },
      error: (error) => {
        this.isProcessing = false;
        console.error('❌ Error completo:', error);

        // Manejo mejorado de errores
        if (error?.error?.msg) {
          this.errorMessage = error.error.msg;
        } else if (error?.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Error al procesar el pago. Verifique su conexión e intente nuevamente.';
        }
      }
    });
  }

  /**
   * Volver al formulario desde la vista del QR
   */
  onBackToForm(): void {
    this.showQRCode = false;
    this.qrCodeImage = '';
    this.paymentLink = '';
  }

  private validateForm(): boolean {
    // Validar nombre
    if (!this.datosPagador.nombre.trim()) {
      this.errorMessage = 'El nombre es requerido';
      return false;
    }

    // Validar apellido
    if (!this.datosPagador.apellido.trim()) {
      this.errorMessage = 'El apellido es requerido';
      return false;
    }

    // Validar email
    if (!this.datosPagador.email.trim()) {
      this.errorMessage = 'El email es requerido';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.datosPagador.email)) {
      this.errorMessage = 'Ingrese un email válido';
      return false;
    }

    // Validar documento (opcional, pero si se proporciona debe ser válido)
    if (this.datosPagador.documento && this.datosPagador.documento.trim()) {
      const docRegex = /^\d{7,8}$/; 
      if (!docRegex.test(this.datosPagador.documento.trim())) {
        this.errorMessage = 'El documento debe tener entre 7 y 8 dígitos';
        return false;
      }
    }

    // Validar datos del cobro
    if (!this.cobro || !this.cobro.idCobro) {
      this.errorMessage = 'Datos del cobro inválidos';
      console.error('❌ Cobro inválido:', this.cobro);
      return false;
    }

    // Validar monto
    const monto = typeof this.cobro.monto === 'string' ? parseFloat(this.cobro.monto) : this.cobro.monto;
    if (isNaN(monto) || monto <= 0) {
      this.errorMessage = 'El monto del cobro debe ser mayor a 0';
      console.error('❌ Monto inválido:', this.cobro.monto, 'Convertido:', monto);
      return false;
    }

    return true;
  }

  private resetForm(): void {
    this.datosPagador = {
      nombre: '',
      apellido: '',
      email: '',
      documento: '',
      tipoDocumento: 'DNI'
    };
    this.errorMessage = '';
    this.isProcessing = false;
    this.showQRCode = false;
    this.qrCodeImage = '';
    this.paymentLink = '';
    this.isGeneratingQR = false;
  }
}

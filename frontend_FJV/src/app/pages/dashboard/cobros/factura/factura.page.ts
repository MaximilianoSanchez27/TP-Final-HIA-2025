import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FacturaService, Factura } from '../../../../services/factura.service';
import { PdfGeneratorService, ComprobanteData } from '../../../../services/pdf-generator.service';
import { QrCodeComponent } from './qr-code/qr-code.component';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-factura-page',
  standalone: true,
  imports: [CommonModule, RouterModule, QrCodeComponent],
  templateUrl: './factura.page.html',
  styleUrls: ['./factura.page.css']
})
export class FacturaPage implements OnInit {
  factura: Factura | null = null;
  isLoading = true;
  errorMessage = '';
  isGeneratingPdf = false;
  fechaActual = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private facturaService: FacturaService,
    private pdfGeneratorService: PdfGeneratorService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const cobroId = Number(params.get('id'));
        if (isNaN(cobroId)) {
          return of(undefined);
        }
        return this.facturaService.generarFactura(cobroId);
      })
    ).subscribe({
      next: (factura) => {
        this.isLoading = false;
        if (!factura) {
          this.errorMessage = 'No se encontró el cobro solicitado o no se pudo generar la factura';
          return;
        }
        this.factura = factura;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar la factura: ' + error.message;
      }
    });
  }

  async imprimirFactura(): Promise<void> {
    if (!this.factura) return;

    try {
      const comprobanteData = this.prepararDatosComprobante();
      await this.pdfGeneratorService.imprimirComprobante(comprobanteData);
    } catch (error) {
      console.error('Error al imprimir:', error);
      alert('Error al imprimir el comprobante');
    }
  }

  async descargarFactura(): Promise<void> {
    if (!this.factura) return;

    this.isGeneratingPdf = true;
    try {
      const comprobanteData = this.prepararDatosComprobante();
      await this.pdfGeneratorService.generarComprobantePDF(comprobanteData);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  private prepararDatosComprobante(): ComprobanteData {
    if (!this.factura) {
      throw new Error('No hay factura para procesar');
    }

    // Asegurar que los items tengan valores numéricos válidos
    const itemsNormalizados = this.factura.itemsFactura.map(item => ({
      descripcion: item.descripcion || '',
      cantidad: Number(item.cantidad) || 1,
      precioUnitario: Number(item.precioUnitario) || 0,
      subtotal: Number(item.subtotal) || 0
    }));

    return {
      numeroComprobante: this.factura.numeroFactura,
      fechaEmision: this.factura.fechaEmision,
      fechaVencimiento: this.factura.cobro.fechaVencimiento,
      tipoComprobante: this.factura.cobro.tipoComprobante,
      estado: this.factura.cobro.estado,
      idCobro: this.factura.cobro.idCobro || 0,
      club: {
        nombre: this.factura.cobro.nombreClub || this.factura.cobro.club?.nombre || 'Club no especificado',
        cuit: this.factura.cobro.club?.cuit || '30-12345678-9',
        direccion: this.factura.cobro.club?.direccion || 'Dirección no especificada'
      },
      federacion: {
        nombre: 'Federación Jujeña de Voleibol',
        cuit: '30-71234567-8',
        direccion: 'Av. Deportiva 123, San Salvador de Jujuy',
        logoUrl: 'assets/images/LogoFJVletraazul.png'
      },
      items: itemsNormalizados,
      total: Number(this.factura.total) || 0,
      concepto: this.factura.cobro.concepto,
      condicionIva: 'Responsable Inscripto',
      condicionVenta: 'Contado'
    };
  }

  get facturaUrl(): string {
    if (!this.factura?.cobro.idCobro) return '';
    return `${window.location.origin}/dashboard/cobros/factura/${this.factura.cobro.idCobro}`;
  }

  volver(): void {
    this.router.navigate(['/dashboard/cobros/detalle', this.factura?.cobro.idCobro || '']);
  }
}

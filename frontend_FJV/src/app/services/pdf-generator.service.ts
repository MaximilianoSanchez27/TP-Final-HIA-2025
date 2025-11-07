import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as QRCode from 'qrcode';

export interface ComprobanteData {
  numeroComprobante: string;
  fechaEmision: string;
  fechaVencimiento: string;
  tipoComprobante: string;
  estado: 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado';
  idCobro: number; 
  club: {
    nombre: string;
    cuit: string;
    direccion: string;
  };
  federacion: {
    nombre: string;
    cuit: string;
    direccion: string;
    logoUrl?: string;
  };
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  total: number;
  concepto: string;
  condicionIva: string;
  condicionVenta: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  constructor() { }

  async generarComprobantePDF(data: ComprobanteData): Promise<void> {
    try {
      // Validar y normalizar los datos antes de generar el PDF
      const datosNormalizados = this.normalizarDatos(data);

      // Generar código QR
      const qrCodeDataURL = await this.generarCodigoQR(datosNormalizados);

      // Crear elemento HTML temporal para el comprobante
      const elemento = await this.crearElementoHTML(datosNormalizados, qrCodeDataURL);
      document.body.appendChild(elemento);

      // Configurar html2canvas
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: 1120
      });

      // Remover elemento temporal
      document.body.removeChild(elemento);

      // Crear PDF con jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Descargar el PDF
      const nombreArchivo = `${data.tipoComprobante.replace(/\s/g, '_')}_${data.numeroComprobante}.pdf`;
      pdf.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('No se pudo generar el PDF');
    }
  }

  private normalizarDatos(data: ComprobanteData): ComprobanteData {
    return {
      ...data,
      total: Number(data.total) || 0,
      items: data.items.map(item => ({
        descripcion: String(item.descripcion || ''),
        cantidad: Number(item.cantidad) || 0,
        precioUnitario: Number(item.precioUnitario) || 0,
        subtotal: Number(item.subtotal) || 0
      }))
    };
  }

  private async generarCodigoQR(data: ComprobanteData): Promise<string> {
    try {
      // Crear URL directa a la factura
      const baseUrl = window.location.origin;
      const facturaUrl = `${baseUrl}/dashboard/cobros/factura/${data.idCobro}`;

      console.log('Generando QR para URL:', facturaUrl);

      // Generar QR code con la URL directa
      const qrCodeDataURL = await QRCode.toDataURL(facturaUrl, {
        width: 120,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error al generar código QR:', error);
      // Retornar un QR simple con información básica en caso de error
      const fallbackUrl = `${window.location.origin}/dashboard/cobros/factura/${data.idCobro}`;
      return await QRCode.toDataURL(fallbackUrl, { width: 120 });
    }
  }

  private getEstadoBadgeClass(estado: string): string {
    const classes = {
      'Pendiente': 'background-color: #ffc107; color: #000;',
      'Pagado': 'background-color: #28a745; color: #fff;',
      'Vencido': 'background-color: #dc3545; color: #fff;',
      'Anulado': 'background-color: #6c757d; color: #fff;'
    };
    return classes[estado as keyof typeof classes] || classes['Pendiente'];
  }

  private async crearElementoHTML(data: ComprobanteData, qrCodeDataURL: string): Promise<HTMLElement> {
    const elemento = document.createElement('div');
    elemento.style.cssText = `
      width: 800px;
      padding: 40px;
      background-color: white;
      font-family: Arial, sans-serif;
      position: absolute;
      top: -10000px;
      left: -10000px;
    `;

    // Formatear los items de manera segura
    const itemsHTML = data.items.map(item => {
      const cantidad = Number(item.cantidad) || 0;
      const precioUnitario = Number(item.precioUnitario) || 0;
      const subtotal = Number(item.subtotal) || 0;

      return `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 12px;">${item.descripcion}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${cantidad}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">$${precioUnitario.toFixed(2)}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const totalFormateado = Number(data.total) || 0;
    const estadoBadgeStyle = this.getEstadoBadgeClass(data.estado);
    const facturaUrl = `${window.location.origin}/dashboard/cobros/factura/${data.idCobro}`;

    elemento.innerHTML = `
      <div style="border: 2px solid #333; padding: 20px;">
        <!-- Encabezado -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <div style="display: flex; align-items: center;">
            ${data.federacion.logoUrl ?
              `<img src="${data.federacion.logoUrl}" alt="Logo" style="width: 80px; height: 80px; margin-right: 20px; object-fit: contain;" onerror="this.style.display='none';">` :
              '<div style="width: 80px; height: 80px; background-color: #f0f0f0; margin-right: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><span style="font-size: 24px; color: #666;">FJV</span></div>'
            }
            <div>
              <h2 style="margin: 0; color: #2c5282;">${data.federacion.nombre}</h2>
              <p style="margin: 5px 0; font-size: 14px;">CUIT: ${data.federacion.cuit}</p>
              <p style="margin: 5px 0; font-size: 14px;">${data.federacion.direccion}</p>
            </div>
          </div>
          <div style="text-align: right; border: 2px solid #2c5282; padding: 15px; background-color: #f7fafc;">
            <h3 style="margin: 0; color: #2c5282; font-size: 20px;">${data.tipoComprobante}</h3>
            <h4 style="margin: 10px 0; font-size: 16px;">Nº ${data.numeroComprobante}</h4>
            <p style="margin: 5px 0; font-size: 14px;">Fecha: ${data.fechaEmision}</p>
            <p style="margin: 5px 0; font-size: 14px;">Vence: ${data.fechaVencimiento}</p>
            <div style="margin-top: 10px;">
              <span style="padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; ${estadoBadgeStyle}">
                ${data.estado.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">

        <!-- Datos del cliente -->
        <div style="margin-bottom: 30px;">
          <h4 style="color: #4a5568; margin-bottom: 15px;">Datos del Cliente</h4>
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p style="margin: 5px 0;"><strong>Cliente:</strong> ${data.club.nombre}</p>
              <p style="margin: 5px 0;"><strong>CUIT:</strong> ${data.club.cuit}</p>
              <p style="margin: 5px 0;"><strong>Dirección:</strong> ${data.club.direccion}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Condición IVA:</strong> ${data.condicionIva}</p>
              <p style="margin: 5px 0;"><strong>Condición Venta:</strong> ${data.condicionVenta}</p>
              <p style="margin: 5px 0;"><strong>Estado del Cobro:</strong>
                <span style="padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; ${estadoBadgeStyle}">
                  ${data.estado}
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Detalle -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f7fafc;">
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Descripción</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">Cantidad</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">Precio Unit.</th>
              <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr style="background-color: #f7fafc; font-weight: bold;">
              <td colspan="3" style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">TOTAL:</td>
              <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 18px;">$${totalFormateado.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Observaciones -->
        <div style="margin-bottom: 30px;">
          <h4 style="color: #4a5568; margin-bottom: 10px;">Observaciones:</h4>
          <p style="margin: 0; background-color: #f7fafc; padding: 15px; border-left: 4px solid #2c5282;">${data.concepto}</p>
        </div>

        <!-- Notas legales -->
        <div style="margin-bottom: 30px; padding: 15px; background-color: #f7fafc; border-radius: 5px;">
          <p style="margin: 5px 0; font-size: 12px; color: #4a5568;">• Este documento es válido como comprobante ante organismos públicos y privados.</p>
          <p style="margin: 5px 0; font-size: 12px; color: #4a5568;">• Pasados 30 días de la fecha de emisión, se aplicarán intereses por mora.</p>
          <p style="margin: 5px 0; font-size: 12px; color: #4a5568;">• Para consultas, comuníquese al teléfono de contacto.</p>
          <p style="margin: 5px 0; font-size: 12px; color: #4a5568;">• Estado actual del cobro: <strong>${data.estado}</strong></p>
        </div>

        <!-- QR Code y pie de página -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <h4 style="color: #2c5282; margin-bottom: 10px;">¡Gracias por confiar en nosotros!</h4>
            <p style="margin: 0; font-size: 12px; color: #4a5568;">www.fjv.org.ar | info@fjv.org.ar | Tel: (388) 123-4567</p>
            <p style="margin: 5px 0; font-size: 11px; color: #6a737d;">Comprobante generado digitalmente el ${new Date().toLocaleString('es-AR')}</p>
          </div>
          <div style="text-align: center;">
            <img src="${qrCodeDataURL}" alt="Código QR" style="width: 120px; height: 120px; border: 2px solid #e2e8f0;">
            <p style="margin: 5px 0; font-size: 10px; color: #4a5568; text-align: center;">
              Código QR - Acceso Directo<br>
              <strong>Estado: ${data.estado}</strong><br>
              Nº ${data.numeroComprobante}
            </p>
            <p style="margin: 0; font-size: 8px; color: #6a737d; text-align: center; word-break: break-all;">
              ${facturaUrl}
            </p>
          </div>
        </div>
      </div>
    `;

    return elemento;
  }

  async imprimirComprobante(data: ComprobanteData): Promise<void> {
    try {
      const datosNormalizados = this.normalizarDatos(data);
      const qrCodeDataURL = await this.generarCodigoQR(datosNormalizados);
      const elemento = await this.crearElementoHTML(datosNormalizados, qrCodeDataURL);

      elemento.style.cssText = `
        width: 800px;
        padding: 40px;
        background-color: white;
        font-family: Arial, sans-serif;
      `;

      const ventanaImpresion = window.open('', '_blank');
      if (ventanaImpresion) {
        ventanaImpresion.document.write(`
          <html>
            <head>
              <title>Imprimir ${data.tipoComprobante}</title>
              <style>
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${elemento.innerHTML}
            </body>
          </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.print();
      }
    } catch (error) {
      console.error('Error al imprimir:', error);
      throw new Error('No se pudo imprimir el comprobante');
    }
  }
}

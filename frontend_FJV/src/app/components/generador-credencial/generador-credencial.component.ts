import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Afiliado } from '../../interfaces/afiliado.interface';
import { Credencial } from '../../interfaces/credencial.interface';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-generador-credencial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generador-credencial.component.html',
  styleUrls: ['./generador-credencial.component.css'],
})
export class GeneradorCredencialComponent implements OnInit {
  @Input() afiliado!: Afiliado;
  @Input() credencial!: Credencial;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrCanvas', { static: true })
  qrCanvas!: ElementRef<HTMLCanvasElement>;

  private logoImg: HTMLImageElement = new Image();
  qrCodeDataUrl: string = '';
  ngOnInit(): void {
    this.cargarLogo();
    this.generarQR();
  }

  private async cargarLogo(): Promise<void> {
    return new Promise((resolve) => {
      this.logoImg.onload = () => resolve();
      this.logoImg.onerror = () => {
        console.log('No se pudo cargar el logo, usando placeholder');
        resolve();
      };
      // Intentar cargar logo desde assets, si no existe usar placeholder
      this.logoImg.src = '/assets/images/LogoFJVletraazul.png';
    });
  }

  private async generarQR(): Promise<void> {
    try {
      const url = this.getQRUrl();

      // Generar QR code como data URL usando la librería correcta
      this.qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Dibujar en canvas separado para el QR
      const qrCtx = this.qrCanvas.nativeElement.getContext('2d');
      if (qrCtx) {
        const qrImg = new Image();
        qrImg.onload = () => {
          qrCtx.clearRect(0, 0, 150, 150);
          qrCtx.drawImage(qrImg, 0, 0, 150, 150);
        };
        qrImg.src = this.qrCodeDataUrl;
      }
    } catch (error) {
      console.error('Error generando QR code:', error);
    }
  }

  async generarCredencial(): Promise<void> {
    await this.cargarLogo();
    await this.generarQR();

    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Configurar tamaño de credencial (tamaño estándar ID card)
    canvas.width = 1014;
    canvas.height = 638;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde
    ctx.strokeStyle = '#0056b3';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Header con fondo azul
    ctx.fillStyle = '#0056b3';
    ctx.fillRect(20, 20, canvas.width - 40, 120);

    // Logo con fondo circular blanco
    const logoSize = 80;
    const logoX = 50;
    const logoY = 40;
    const logoRadius = logoSize / 2 + 10;

    // Dibujar círculo blanco para el logo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(
      logoX + logoSize / 2,
      logoY + logoSize / 2,
      logoRadius,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Borde del círculo (opcional, para mejor definición)
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dibujar logo dentro del círculo
    if (this.logoImg.complete && this.logoImg.naturalHeight !== 0) {
      ctx.drawImage(this.logoImg, logoX, logoY, logoSize, logoSize);
    } else {
      // Dibujar placeholder para logo dentro del círculo
      ctx.fillStyle = '#0056b3';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FJV', logoX + logoSize / 2, logoY + logoSize / 2 + 7);
    }

    // Título - Ajustar posición para evitar solapamiento con logo
    const titleStartX = logoX + logoSize + logoRadius + 20;
    const titleCenterX = titleStartX + (canvas.width - titleStartX - 40) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FEDERACIÓN JUJEÑA DE VOLEIBOL', titleCenterX, 75);

    ctx.font = 'bold 28px Arial';
    ctx.fillText('CREDENCIAL DE AFILIADO', titleCenterX, 110);

    // Foto del afiliado
    const fotoX = 40;
    const fotoY = 180;
    const fotoWidth = 200;
    const fotoHeight = 250;

    if (this.afiliado.foto) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Fondo blanco para la foto
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(fotoX, fotoY, fotoWidth, fotoHeight);

            // Dibujar foto con aspect ratio mantenido
            const aspectRatio = img.width / img.height;
            let drawWidth = fotoWidth;
            let drawHeight = fotoHeight;
            let drawX = fotoX;
            let drawY = fotoY;

            if (aspectRatio > fotoWidth / fotoHeight) {
              drawHeight = fotoWidth / aspectRatio;
              drawY = fotoY + (fotoHeight - drawHeight) / 2;
            } else {
              drawWidth = fotoHeight * aspectRatio;
              drawX = fotoX + (fotoWidth - drawWidth) / 2;
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            // Borde para la foto
            ctx.strokeStyle = '#0056b3';
            ctx.lineWidth = 3;
            ctx.strokeRect(fotoX, fotoY, fotoWidth, fotoHeight);

            resolve();
          };
          img.onerror = () => resolve();
          img.src = this.afiliado.foto!;
        });
      } catch (error) {
        console.error('Error cargando foto:', error);
        // Dibujar placeholder si falla la foto
        this.dibujarPlaceholderFoto(ctx, fotoX, fotoY, fotoWidth, fotoHeight);
      }
    } else {
      this.dibujarPlaceholderFoto(ctx, fotoX, fotoY, fotoWidth, fotoHeight);
    }

    // Información del afiliado - Ajustar espaciado
    const infoX = 280;
    const infoY = 180;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';

    // Nombre
    ctx.font = 'bold 32px Arial';
    ctx.fillText(this.afiliado.apellidoNombre.toUpperCase(), infoX, infoY + 35);

    // DNI
    ctx.font = '26px Arial';
    ctx.fillText(`DNI: ${this.afiliado.dni}`, infoX, infoY + 75);

    // Número de afiliación
    ctx.fillText(
      `N° Afiliación: ${this.afiliado.numeroAfiliacion}`,
      infoX,
      infoY + 110
    );

    // Tipo
    ctx.fillText(`Tipo: ${this.afiliado.tipo}`, infoX, infoY + 145);

    // Categoría
    ctx.fillText(`Categoría: ${this.afiliado.categoria}`, infoX, infoY + 180);

    // Club
    ctx.fillText(`Club: ${this.afiliado.club}`, infoX, infoY + 215);

    // Información de la credencial
    const credY = 460;
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#0056b3';
    ctx.fillText(
      `Credencial N°: ${this.credencial.identificador}`,
      infoX,
      credY
    );

    ctx.font = '18px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(
      `Emisión: ${this.formatearFecha(this.credencial.fechaAlta)}`,
      infoX,
      credY + 30
    );
    ctx.fillText(
      `Vencimiento: ${this.formatearFecha(this.credencial.fechaVencimiento)}`,
      infoX,
      credY + 55
    );

    // Estado con colores apropiados
    ctx.font = 'bold 20px Arial';
    switch (this.credencial.estado) {
      case 'ACTIVO':
        ctx.fillStyle = '#28a745';
        break;
      case 'SUSPENDIDO':
        ctx.fillStyle = '#ffc107';
        break;
      case 'VENCIDO':
        ctx.fillStyle = '#dc3545';
        break;
      default:
        ctx.fillStyle = '#6c757d';
    }
    ctx.fillText(`Estado: ${this.credencial.estado}`, infoX, credY + 85);

    // Mostrar motivo de suspensión si existe
    if (
      this.credencial.estado === 'SUSPENDIDO' &&
      this.credencial.motivoSuspension
    ) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(
        `Motivo: ${this.credencial.motivoSuspension}`,
        infoX,
        credY + 110
      );
    }

    // QR Code - Asegurar que se dibuje antes de finalizar
    if (this.qrCodeDataUrl) {
      await new Promise<void>((resolve) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = 130;
          const qrX = canvas.width - qrSize - 40;
          const qrY = canvas.height - qrSize - 40;

          // Fondo blanco para QR
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

          // Dibujar QR
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Texto explicativo del QR
          ctx.font = '14px Arial';
          ctx.fillStyle = '#666666';
          ctx.textAlign = 'center';
          ctx.fillText('Escanea para ver', qrX + qrSize / 2, qrY - 20);
          ctx.fillText('perfil completo', qrX + qrSize / 2, qrY - 5);

          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = this.qrCodeDataUrl;
      });
    }
  }

  private dibujarPlaceholderFoto(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Fondo gris claro
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(x, y, width, height);

    // Icono de usuario
    ctx.fillStyle = '#6c757d';
    ctx.font = '80px FontAwesome';
    ctx.textAlign = 'center';
    ctx.fillText('👤', x + width / 2, y + height / 2 + 20);

    // Borde
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.textAlign = 'left'; // Resetear
  }

  getQRUrl(): string {
    return `${window.location.origin}/afiliados/detalle/${this.afiliado.idPersona}`;
  }

  // Hacer público el método formatearFecha
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return 'N/A';
    }
  }

  async descargarCredencial(): Promise<void> {
    // Asegurar que la credencial esté completamente generada antes de descargar
    await this.generarCredencial();

    // Esperar un poco más para asegurar que todos los elementos estén dibujados
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = this.canvas.nativeElement;
    const link = document.createElement('a');
    link.download = `credencial_${this.afiliado.dni}_${this.credencial.identificador}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }

  async imprimirCredencial(): Promise<void> {
    // Asegurar que la credencial esté completamente generada antes de imprimir
    await this.generarCredencial();

    // Esperar un poco más para asegurar que todos los elementos estén dibujados
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = this.canvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/png', 1.0);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Credencial - ${this.afiliado.apellidoNombre}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; }
                img { width: 8.5in; height: auto; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
    }
  }
}

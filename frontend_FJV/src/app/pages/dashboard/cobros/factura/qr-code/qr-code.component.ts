import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-container text-center">
      <canvas #qrCanvas></canvas>
      <p class="mt-2 mb-0 small">{{description}}</p>
      @if (showUrl) {
        <p class="mb-0 small text-muted" style="word-break: break-all; font-size: 10px;">{{url}}</p>
      }
    </div>
  `,
  styles: [`
    .qr-container canvas {
      max-width: 100%;
      height: auto;
    }
  `]
})
export class QrCodeComponent implements OnInit {
  @Input() url: string = '';
  @Input() description: string = 'Código QR';
  @Input() showUrl: boolean = false;
  @Input() size: number = 120;

  @ViewChild('qrCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    if (this.url) {
      this.generateQR();
    }
  }

  private async generateQR() {
    try {
      await QRCode.toCanvas(this.canvas.nativeElement, this.url, {
        width: this.size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }
}

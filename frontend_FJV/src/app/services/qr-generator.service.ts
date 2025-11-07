import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QrGeneratorService {

  constructor() { }

  /**
   * Genera un código QR usando Canvas HTML5
   * @param text - Texto a codificar en el QR
   * @param size - Tamaño del QR (por defecto 200px)
   * @returns Promise<string> - Data URL del QR generado
   */
  async generateQR(text: string, size: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Crear un canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Configurar el tamaño del canvas
        canvas.width = size;
        canvas.height = size;

        // Generar una matriz QR simple (esto es una implementación básica)
        const qrMatrix = this.generateQRMatrix(text);
        const cellSize = size / qrMatrix.length;

        // Limpiar el canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Dibujar el QR
        ctx.fillStyle = '#000000';
        for (let row = 0; row < qrMatrix.length; row++) {
          for (let col = 0; col < qrMatrix[row].length; col++) {
            if (qrMatrix[row][col]) {
              ctx.fillRect(
                col * cellSize,
                row * cellSize,
                cellSize,
                cellSize
              );
            }
          }
        }

        // Convertir a data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Genera una matriz QR simple (implementación básica para demostración)
   * En producción, se recomienda usar una librería especializada
   */
  private generateQRMatrix(text: string): boolean[][] {
    // Esta es una implementación muy básica para demostración
    // En un caso real, usarías una librería como qrcode.js

    const size = 25; 
    const matrix: boolean[][] = [];

    // Inicializar matriz con false
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(false);
    }

    // Patrones de posicionamiento (esquinas)
    this.addFinderPattern(matrix, 0, 0);
    this.addFinderPattern(matrix, size - 7, 0);
    this.addFinderPattern(matrix, 0, size - 7);

    // Generar un patrón simple basado en el hash del texto
    let hash = this.simpleHash(text);

    for (let row = 9; row < size - 9; row++) {
      for (let col = 9; col < size - 9; col++) {
        matrix[row][col] = (hash % 2) === 1;
        hash = Math.floor(hash / 2);
        if (hash === 0) hash = this.simpleHash(text + row + col);
      }
    }

    return matrix;
  }

  /**
   * Añade un patrón de posicionamiento al QR
   */
  private addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1]
    ];

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        if (startRow + row < matrix.length && startCol + col < matrix[0].length) {
          matrix[startRow + row][startCol + col] = pattern[row][col] === 1;
        }
      }
    }
  }

  /**
   * Genera un hash simple del texto
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }
    return Math.abs(hash);
  }

  /**
   * Genera un QR usando la API de QR Server (alternativa online)
   */
  generateQRFromAPI(text: string, size: number = 200): string {
    const encodedText = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
  }
}

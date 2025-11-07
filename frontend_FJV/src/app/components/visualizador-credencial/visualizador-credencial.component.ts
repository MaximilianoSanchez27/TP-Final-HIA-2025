import { Component, HostListener, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Afiliado } from '../../interfaces/afiliado.interface';
import { Credencial } from '../../interfaces/credencial.interface';
import { GeneradorCredencialComponent } from '../generador-credencial/generador-credencial.component';

@Component({
  selector: 'app-visualizador-credencial',
  standalone: true,
  imports: [CommonModule, GeneradorCredencialComponent],
  templateUrl: './visualizador-credencial.component.html',
  styleUrls: ['./visualizador-credencial.component.css']
})
export class VisualizadorCredencialComponent implements OnInit {
  @Input() afiliado!: Afiliado;
  @Input() credenciales: Credencial[] = [];

  credencialSeleccionada: Credencial | null = null;
  mostrarGenerador = false;

  ngOnInit(): void {
    // Seleccionar automáticamente la credencial activa
    this.credencialSeleccionada = this.credenciales.find(c =>
      c.estado === 'ACTIVO'
    ) || this.credenciales[0] || null;
  }

  //Escuchar el evento 'keydown.escape' en el documento
  @HostListener('document:keydown.escape', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.mostrarGenerador) { // Solo cierra si el modal está visible
      this.cerrarGenerador();
    }
  }

  seleccionarCredencial(credencial: Credencial): void {
    this.credencialSeleccionada = credencial;
  }

  abrirGenerador(): void {
    if (this.credencialSeleccionada) {
      this.mostrarGenerador = true;
    }
  }

  cerrarGenerador(): void {
    this.mostrarGenerador = false;
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'bg-success';
      case 'INACTIVO':
        return 'bg-secondary';
      case 'SUSPENDIDO':
        return 'bg-warning text-dark';
      case 'VENCIDO':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'No disponible';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  }

  esCredencialVigente(credencial: Credencial): boolean {
    if (!credencial.fechaVencimiento || credencial.estado !== 'ACTIVO') return false;
    const hoy = new Date();
    const vencimiento = new Date(credencial.fechaVencimiento);
    return vencimiento >= hoy;
  }

  obtenerTiempoRestante(credencial: Credencial): string {
    if (!credencial.fechaVencimiento) return 'Sin fecha';

    // Si está suspendido, mostrar estado
    if (credencial.estado === 'SUSPENDIDO') {
      return `Suspendido${credencial.motivoSuspension ? ': ' + credencial.motivoSuspension : ''}`;
    }

    // Si está vencido
    if (credencial.estado === 'VENCIDO') {
      return 'Vencida';
    }

    const hoy = new Date();
    const vencimiento = new Date(credencial.fechaVencimiento);
    const diferencia = vencimiento.getTime() - hoy.getTime();

    if (diferencia <= 0) return 'Vencida';

    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (dias === 1) return '1 día';
    if (dias < 30) return `${dias} días`;
    if (dias < 365) {
      const meses = Math.floor(dias / 30);
      return meses === 1 ? '1 mes' : `${meses} meses`;
    }

    const años = Math.floor(dias / 365);
    return años === 1 ? '1 año' : `${años} años`;
  }
}

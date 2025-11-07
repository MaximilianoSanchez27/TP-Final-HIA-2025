import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Afiliado } from '../../../../interfaces/afiliado.interface';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AfiliadoService } from '../../../../services/afiliado.service';

@Component({
  selector: 'app-listado-afiliados',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './listado-afiliados.component.html',
  styleUrls: ['./listado-afiliados.component.css']
})
export class ListadoAfiliadosComponent implements OnInit, OnChanges {
  @Input() afiliados: Afiliado[] = [];
  @Input() categoria1: string[] = [];
  @Input() categoria2: string[] = [];
  @Input() categoria3: string[] = [];
  @Input() clubes: string[] = [];

  @Output() eliminar = new EventEmitter<number>();
  @Output() editar = new EventEmitter<Afiliado>();
  @Output() editarCategorias = new EventEmitter<'categoria1' | 'categoria2' | 'categoria3'>();
  @Output() editarClubes = new EventEmitter<void>();
  @Output() verDetalle = new EventEmitter<Afiliado>();

  afiliadoAEliminar: Afiliado | null = null;

  tiposAfiliacion = ['FJV', 'FEVA'];
  pases = ['Proveniente', 'Destino', 'Habilitación'];

  constructor(private afiliadoService: AfiliadoService) {}

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // La lógica de edición se ha movido a la página de formulario.
  }

  onEditar(afiliado: Afiliado) {
    this.editar.emit(afiliado);
  }

  // Prepara el modal de confirmación de eliminación
  onEliminar(afiliado: Afiliado) {
    this.afiliadoAEliminar = afiliado;
  }

  // Confirma la eliminación y emite el ID al componente padre
  confirmarEliminacion() {
    if (this.afiliadoAEliminar && this.afiliadoAEliminar.idPersona !== undefined) {
      this.eliminar.emit(this.afiliadoAEliminar.idPersona);
      this.afiliadoAEliminar = null;
    }
  }

  // Cancela la eliminación
  cancelarEliminacion() {
    this.afiliadoAEliminar = null;
  }

  onEditarCategorias(tipo: 'categoria1' | 'categoria2' | 'categoria3'): void {
    this.editarCategorias.emit(tipo);
  }

  onEditarClubes(): void {
    this.editarClubes.emit();
  }

  onVerDetalle(afiliado: Afiliado) {
    console.log('Evento ver detalle para afiliado:', afiliado);
    this.verDetalle.emit(afiliado);
  }

  getAvatarUrl(afiliado: Afiliado): string {
    const url = this.afiliadoService.getAvatarUrl(afiliado);
    console.log(`Avatar URL para ${afiliado.apellidoNombre}:`, url);
    console.log('Datos de foto:', afiliado.foto);
    return url;
  }

  getAvatarIcon(afiliado: Afiliado): any {
    return this.afiliadoService.getAvatarIcon(afiliado);
  }

  // Nuevo método para obtener la clase CSS del badge de estado de licencia
  getEstadoLicenciaBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary';

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

  // Método para formatear fechas
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'Sin fecha';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // Método para calcular días restantes hasta el vencimiento
  calcularDiasRestantes(fechaVencimiento: string | undefined): string {
    if (!fechaVencimiento) return '';

    try {
      const hoy = new Date();
      const vencimiento = new Date(fechaVencimiento);
      const diferencia = vencimiento.getTime() - hoy.getTime();
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

      if (dias < 0) {
        return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
      } else if (dias === 0) {
        return 'Vence hoy';
      } else if (dias === 1) {
        return 'Vence mañana';
      } else if (dias <= 30) {
        return `${dias} días restantes`;
      } else if (dias <= 365) {
        const meses = Math.floor(dias / 30);
        return `${meses} mes${meses !== 1 ? 'es' : ''} restante${meses !== 1 ? 's' : ''}`;
      } else {
        const años = Math.floor(dias / 365);
        return `${años} año${años !== 1 ? 's' : ''} restante${años !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      return '';
    }
  }

  // Método para verificar si la licencia está próxima a vencer (30 días)
  esLicenciaProximaVencer(afiliado: Afiliado): boolean {
    if (!afiliado.fechaLicenciaBaja || afiliado.estadoLicencia !== 'ACTIVO') {
      return false;
    }

    try {
      const hoy = new Date();
      const vencimiento = new Date(afiliado.fechaLicenciaBaja);
      const diferencia = vencimiento.getTime() - hoy.getTime();
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

      // Mostrar advertencia si faltan 30 días o menos
      return dias > 0 && dias <= 30;
    } catch (error) {
      return false;
    }
  }
}

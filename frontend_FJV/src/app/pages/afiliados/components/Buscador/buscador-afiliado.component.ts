import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscador-afiliados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './buscador-afiliado.component.html',
  styleUrls: ['./buscador-afiliado.component.css'],
})
export class BuscadorAfiliadosComponent {
  dni: string = '';
  nombreApellido: string = '';

  @Output() buscarAfiliado = new EventEmitter<{ dni?: string; nombreApellido?: string }>();
  @Output() limpiarFiltro = new EventEmitter<void>();

  onBuscar() {
    const dniFilter = this.dni.trim() !== '' ? this.dni.trim() : undefined;

    this.buscarAfiliado.emit({
      dni: dniFilter,
    });
  }

  onLimpiar() {
    this.dni = '';
    this.limpiarFiltro.emit();
    this.buscarAfiliado.emit({});
  }
}

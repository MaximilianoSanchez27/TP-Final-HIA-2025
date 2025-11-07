import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaymentFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  clubId?: number;
  metodoPago?: string;
  montoMinimo?: number;
  montoMaximo?: number;
}

@Component({
  selector: 'app-payment-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-filters.component.html',
  styleUrls: ['./payment-filters.component.css']
})
export class PaymentFiltersComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<PaymentFilters>();
  @Output() exportRequested = new EventEmitter<'pdf' | 'excel'>();

  // Filtros
  filtros: PaymentFilters = {};

  // Opciones estáticas para filtros
  opcionesEstado = [
    { valor: '', label: 'Todos los Estados' },
    { valor: 'Pagado', label: 'Pagados' },
    { valor: 'Pendiente', label: 'Pendientes' },
    { valor: 'Vencido', label: 'Vencidos' },
    { valor: 'Anulado', label: 'Anulados' }
  ];

  opcionesMetodoPago = [
    { valor: '', label: 'Todos los Métodos' },
    { valor: 'MercadoPago', label: 'MercadoPago' },
    { valor: 'Transferencia', label: 'Transferencia Bancaria' },
    { valor: 'Efectivo', label: 'Efectivo' },
    { valor: 'Cheque', label: 'Cheque' },
    { valor: 'Tarjeta', label: 'Tarjeta de Crédito/Débito' }
  ];

  // Rangos de montos predefinidos
  rangosMonto = [
    { label: 'Todos los montos', min: undefined, max: undefined },
    { label: 'Hasta $10,000', min: undefined, max: 10000 },
    { label: '$10,001 - $50,000', min: 10001, max: 50000 },
    { label: '$50,001 - $100,000', min: 50001, max: 100000 },
    { label: 'Más de $100,000', min: 100001, max: undefined }
  ];

  // Estado del componente
  filtrosActivos = false;
  exportando = false;
  rangoMontoSeleccionado = '';

  constructor() {}

  ngOnInit(): void {
    this.inicializarFechas();
  }

  private inicializarFechas(): void {
    const hoy = new Date();
    const hace12Meses = new Date();
    hace12Meses.setFullYear(hoy.getFullYear() - 1);

    this.filtros.fechaHasta = hoy.toISOString().split('T')[0];
    this.filtros.fechaDesde = hace12Meses.toISOString().split('T')[0];
  }

  aplicarFiltros(): void {
    this.filtrosActivos = this.tienesFiltrosAplicados();
    this.filtersChanged.emit({ ...this.filtros });
  }

  limpiarFiltros(): void {
    this.filtros = {};
    this.rangoMontoSeleccionado = '';
    this.inicializarFechas();
    this.filtrosActivos = false;
    this.filtersChanged.emit({ ...this.filtros });
  }

  onRangoMontoChange(evento: any): void {
    const valor = evento.target.value;
    if (valor === '') {
      this.filtros.montoMinimo = undefined;
      this.filtros.montoMaximo = undefined;
      return;
    }

    const rango = this.rangosMonto.find(r => r.label === valor);
    if (rango) {
      this.filtros.montoMinimo = rango.min;
      this.filtros.montoMaximo = rango.max;
    }
  }

  private tienesFiltrosAplicados(): boolean {
    return !!(
      this.filtros.estado ||
      this.filtros.metodoPago ||
      this.filtros.clubId ||
      this.filtros.montoMinimo ||
      this.filtros.montoMaximo ||
      (this.filtros.fechaDesde && this.filtros.fechaHasta)
    );
  }

  exportarPDF(): void {
    this.exportRequested.emit('pdf');
  }

  exportarExcel(): void {
    this.exportRequested.emit('excel');
  }

  // Getter para mostrar resumen de filtros activos
  get resumenFiltros(): string {
    const filtrosAplicados = [];

    if (this.filtros.estado) {
      const estado = this.opcionesEstado.find(e => e.valor === this.filtros.estado);
      filtrosAplicados.push(`Estado: ${estado?.label}`);
    }

    if (this.filtros.metodoPago) {
      const metodo = this.opcionesMetodoPago.find(m => m.valor === this.filtros.metodoPago);
      filtrosAplicados.push(`Método: ${metodo?.label}`);
    }

    if (this.filtros.montoMinimo || this.filtros.montoMaximo) {
      let rangoTexto = 'Monto: ';
      if (this.filtros.montoMinimo && this.filtros.montoMaximo) {
        rangoTexto += `$${this.filtros.montoMinimo.toLocaleString()} - $${this.filtros.montoMaximo.toLocaleString()}`;
      } else if (this.filtros.montoMinimo) {
        rangoTexto += `Desde $${this.filtros.montoMinimo.toLocaleString()}`;
      } else if (this.filtros.montoMaximo) {
        rangoTexto += `Hasta $${this.filtros.montoMaximo.toLocaleString()}`;
      }
      filtrosAplicados.push(rangoTexto);
    }

    if (this.filtros.fechaDesde && this.filtros.fechaHasta) {
      filtrosAplicados.push(`Período: ${this.filtros.fechaDesde} - ${this.filtros.fechaHasta}`);
    }

    return filtrosAplicados.length > 0
      ? filtrosAplicados.join(' | ')
      : 'Sin filtros aplicados';
  }

  // Formatear moneda para mostrar en la UI
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

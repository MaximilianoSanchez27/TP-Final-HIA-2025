import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AnalyticsFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoLicencia?: string;
  estadoLicencia?: string;
  clubId?: number;
  categoria?: string;
  exportarDatos?: boolean;
}

@Component({
  selector: 'app-analytics-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-filters.component.html',
  styleUrls: ['./analytics-filters.component.css']
})
export class AnalyticsFiltersComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<AnalyticsFilters>();
  @Output() exportRequested = new EventEmitter<'pdf' | 'excel'>();

  // Filtros
  filtros: AnalyticsFilters = {};

  // Opciones estáticas para filtros
  opcionesTipoLicencia = [
    { valor: '', label: 'Todos' },
    { valor: 'FJV', label: 'FJV' },
    { valor: 'FEVA', label: 'FEVA' },
    { valor: 'Sin Licencia', label: 'Sin Licencia' }
  ];

  opcionesEstadoLicencia = [
    { valor: '', label: 'Todos' },
    { valor: 'ACTIVO', label: 'Activos' },
    { valor: 'VENCIDO', label: 'Vencidos' },
    { valor: 'INACTIVO', label: 'Inactivos' },
    { valor: 'PENDIENTE', label: 'Pendientes' }
  ];

  opcionesCategorias = [
    { valor: '', label: 'Todas' },
    { valor: 'JUVENIL', label: 'Juvenil' },
    { valor: 'CADETE', label: 'Cadete' },
    { valor: 'MENOR', label: 'Menor' },
    { valor: 'ADULTO', label: 'Adulto' },
    { valor: 'VETERANO', label: 'Veterano' }
  ];

  // Estado del componente
  filtrosActivos = false;
  exportando = false;

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
    this.inicializarFechas();
    this.filtrosActivos = false;
    this.filtersChanged.emit({ ...this.filtros });
  }

  private tienesFiltrosAplicados(): boolean {
    return !!(
      this.filtros.tipoLicencia ||
      this.filtros.estadoLicencia ||
      this.filtros.clubId ||
      this.filtros.categoria ||
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

    if (this.filtros.tipoLicencia) {
      const tipo = this.opcionesTipoLicencia.find(t => t.valor === this.filtros.tipoLicencia);
      filtrosAplicados.push(`Tipo: ${tipo?.label}`);
    }

    if (this.filtros.estadoLicencia) {
      const estado = this.opcionesEstadoLicencia.find(e => e.valor === this.filtros.estadoLicencia);
      filtrosAplicados.push(`Estado: ${estado?.label}`);
    }

    if (this.filtros.categoria) {
      const categoria = this.opcionesCategorias.find(c => c.valor === this.filtros.categoria);
      filtrosAplicados.push(`Categoría: ${categoria?.label}`);
    }

    if (this.filtros.fechaDesde && this.filtros.fechaHasta) {
      filtrosAplicados.push(`Período: ${this.filtros.fechaDesde} - ${this.filtros.fechaHasta}`);
    }

    return filtrosAplicados.length > 0
      ? filtrosAplicados.join(' | ')
      : 'Sin filtros aplicados';
  }
}

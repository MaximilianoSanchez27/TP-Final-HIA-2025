import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { AfiliadoService, MetricasAfiliadosAvanzadas, EstadisticasCrecimiento } from '../../../../services/afiliado.service';
import { ExportService } from '../../../../services/export.service';
import { AnalyticsFiltersComponent, AnalyticsFilters } from '../analytics-filters/analytics-filters.component';
import { Subject, takeUntil } from 'rxjs';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-analytics-charts',
  standalone: true,
  imports: [CommonModule, AnalyticsFiltersComponent],
  templateUrl: './analytics-charts.component.html',
  styleUrls: ['./analytics-charts.component.css']
})
export class AnalyticsChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('licenciasChart', { static: false }) licenciasChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('estadosChart', { static: false }) estadosChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('clubesChart', { static: false }) clubesChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoriasChart', { static: false }) categoriasChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mensualChart', { static: false }) mensualChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('crecimientoChart', { static: false }) crecimientoChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  metricas: MetricasAfiliadosAvanzadas | null = null;
  estadisticasCrecimiento: EstadisticasCrecimiento | null = null;
  loading = true;
  error: string | null = null;

  // Referencias a los gráficos para poder destruirlos
  private charts: Chart[] = [];

  // Estado de exportación
  exportingPDF = false;
  exportingExcel = false;

  // Filtros aplicados
  filtrosAplicados: AnalyticsFilters = {};

  constructor(
    private afiliadoService: AfiliadoService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  private destroyCharts(): void {
    this.charts.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = [];
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = null;

    // Cargar métricas avanzadas y estadísticas de crecimiento en paralelo
    const metricas$ = this.afiliadoService.getMetricasAfiliadosAvanzadas();
    const crecimiento$ = this.afiliadoService.getEstadisticasCrecimiento('mes');

    metricas$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.metricas = data;
        this.checkDataAndCreateCharts();
      },
      error: (error) => {
        console.error('Error al cargar métricas de afiliados:', error);
        this.error = 'Error al cargar las métricas de afiliados';
        this.loading = false;
      }
    });

    crecimiento$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.estadisticasCrecimiento = data;
        this.checkDataAndCreateCharts();
      },
      error: (error) => {
        console.error('Error al cargar estadísticas de crecimiento:', error);
        this.error = 'Error al cargar las estadísticas de crecimiento';
        this.loading = false;
      }
    });
  }

  private checkDataAndCreateCharts(): void {
    if (this.metricas && this.estadisticasCrecimiento) {
      this.loading = false;
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  private createCharts(): void {
    this.destroyCharts();

    if (!this.metricas || !this.estadisticasCrecimiento) return;

    try {
      this.createLicenciasChart();
      this.createEstadosChart();
      this.createClubesChart();
      this.createCategoriasChart();
      this.createMensualChart();
      this.createCrecimientoChart();
    } catch (error) {
      console.error('Error al crear gráficos:', error);
    }
  }

  private createLicenciasChart(): void {
    const ctx = this.licenciasChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    const data = this.metricas.distribucionLicencia;
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['FJV', 'FEVA', 'Sin Licencia'],
        datasets: [{
          data: [data.FJV, data.FEVA, data.SinLicencia],
          backgroundColor: ['#007bff', '#28a745', '#6c757d'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Tipo de Licencia'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createEstadosChart(): void {
    const ctx = this.estadosChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    const data = this.metricas.estadosLicencia;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Activos', 'Vencidos', 'Inactivos'],
        datasets: [{
          data: [data.Activos, data.Vencidos, data.Inactivos],
          backgroundColor: ['#28a745', '#dc3545', '#6c757d'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Estados de Licencias'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createClubesChart(): void {
    const ctx = this.clubesChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    // Tomar solo los primeros 12 clubes
    const clubes = this.metricas.distribucionPorClub.slice(0, 12);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: clubes.map(c => c.nombre.length > 15 ? c.nombre.substring(0, 15) + '...' : c.nombre),
        datasets: [
          {
            label: 'FJV',
            data: clubes.map(c => c.fjv),
            backgroundColor: '#007bff',
            borderColor: '#0056b3',
            borderWidth: 1
          },
          {
            label: 'FEVA',
            data: clubes.map(c => c.feva),
            backgroundColor: '#28a745',
            borderColor: '#1e7e34',
            borderWidth: 1
          },
          {
            label: 'Activos',
            data: clubes.map(c => c.activos),
            backgroundColor: '#17a2b8',
            borderColor: '#138496',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Afiliados por Club (Top 12)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            stacked: false
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createCategoriasChart(): void {
    const ctx = this.categoriasChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    // Tomar solo las primeras 8 categorías
    const categorias = this.metricas.distribucionPorCategoria.slice(0, 8);
    const colors = [
      '#ff6384', '#36a2eb', '#cc65fe', '#ffce56',
      '#ff9f40', '#4bc0c0', '#9966ff', '#ff6384'
    ];

    const chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: categorias.map(c => c.categoria),
        datasets: [{
          data: categorias.map(c => c.cantidad),
          backgroundColor: colors.slice(0, categorias.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Categoría'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createMensualChart(): void {
    const ctx = this.mensualChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    const data = this.metricas.registrosMensuales;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(m => m.mes),
        datasets: [
          {
            label: 'Total Registros',
            data: data.map(m => m.total),
            borderColor: '#6f42c1',
            backgroundColor: 'rgba(111, 66, 193, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'FJV',
            data: data.map(m => m.fjv),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            fill: false,
            tension: 0.4
          },
          {
            label: 'FEVA',
            data: data.map(m => m.feva),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            fill: false,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Registros Mensuales (Últimos 12 meses)'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createCrecimientoChart(): void {
    const ctx = this.crecimientoChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.estadisticasCrecimiento) return;

    const data = this.estadisticasCrecimiento.estadisticas;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(e => e.periodo),
        datasets: [
          {
            label: 'Nuevos FJV',
            data: data.map(e => e.nuevos_FJV),
            backgroundColor: '#007bff',
            stack: 'Stack 0'
          },
          {
            label: 'Nuevos FEVA',
            data: data.map(e => e.nuevos_FEVA),
            backgroundColor: '#28a745',
            stack: 'Stack 0'
          },
          {
            label: 'Activos',
            data: data.map(e => e.activos),
            backgroundColor: '#17a2b8',
            stack: 'Stack 1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Crecimiento por Período'
          }
        },
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true,
            beginAtZero: true
          }
        }
      }
    });

    this.charts.push(chart);
  }

  refresh(): void {
    this.cargarDatos();
  }

  /**
   * Exportar analíticas a PDF
   */
  async exportToPDF(): Promise<void> {
    if (!this.metricas || this.exportingPDF) return;

    this.exportingPDF = true;
    try {
      await this.exportService.exportAnalyticsToPDF(
        'analytics-content',
        this.metricas,
        'analiticas-afiliados'
      );
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      this.exportingPDF = false;
    }
  }

  /**
   * Exportar datos a Excel
   */
  async exportToExcel(): Promise<void> {
    if (!this.metricas || this.exportingExcel) return;

    this.exportingExcel = true;
    try {
      await this.exportService.exportAnalyticsToExcel(
        this.metricas,
        'analiticas-afiliados'
      );
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      this.exportingExcel = false;
    }
  }

  /**
   * Manejar cambios en los filtros
   */
  onFiltersChanged(filtros: AnalyticsFilters): void {
    this.filtrosAplicados = { ...filtros };
    console.log('Filtros aplicados:', this.filtrosAplicados);
    // Aquí podrías recargar los datos con los filtros aplicados
    // this.cargarDatosConFiltros(filtros);
  }

  /**
   * Manejar solicitudes de exportación desde el componente de filtros
   */
  onExportRequested(tipo: 'pdf' | 'excel'): void {
    if (tipo === 'pdf') {
      this.exportToPDF();
    } else {
      this.exportToExcel();
    }
  }
}

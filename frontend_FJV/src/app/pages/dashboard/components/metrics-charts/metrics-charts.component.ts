import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { CobroService, MetricasAvanzadas, EstadisticasRecaudacion } from '../../../../services/cobro.service';
import { ExportService } from '../../../../services/export.service';
import { PaymentFiltersComponent, PaymentFilters } from '../payment-filters/payment-filters.component';
import { Subject, takeUntil } from 'rxjs';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-metrics-charts',
  standalone: true,
  imports: [CommonModule, PaymentFiltersComponent],
  templateUrl: './metrics-charts.component.html',
  styleUrls: ['./metrics-charts.component.css']
})
export class MetricsChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('estadosChart', { static: false }) estadosChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('clubesChart', { static: false }) clubesChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mensualChart', { static: false }) mensualChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('conceptosChart', { static: false }) conceptosChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('recaudacionChart', { static: false }) recaudacionChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();

  metricas: MetricasAvanzadas | null = null;
  estadisticasRecaudacion: EstadisticasRecaudacion | null = null;
  loading = true;
  error: string | null = null;

  // Estados de exportación
  exportingPDF = false;
  exportingExcel = false;

  // Filtros activos
  activeFilters: PaymentFilters = {};

  // Referencias a los gráficos para poder destruirlos
  private charts: Chart[] = [];

  constructor(
    private cobroService: CobroService,
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

    console.log('Iniciando carga de datos...');
    console.log('Filtros activos:', this.activeFilters);

    // Cargar métricas avanzadas y estadísticas de recaudación en paralelo
    const metricas$ = this.cobroService.getMetricasAvanzadas();
    const estadisticas$ = this.cobroService.getEstadisticasRecaudacion('mes');

    metricas$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log('Métricas regulares cargadas:', data);
        this.metricas = data;
        this.checkDataAndCreateCharts();
      },
      error: (error) => {
        console.error('Error al cargar métricas:', error);
        this.error = 'Error al cargar las métricas';
        this.loading = false;
      }
    });

    estadisticas$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log('Estadísticas de recaudación cargadas:', data);
        this.estadisticasRecaudacion = data;
        this.checkDataAndCreateCharts();
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.error = 'Error al cargar las estadísticas';
        this.loading = false;
      }
    });
  }

  private checkDataAndCreateCharts(): void {
    if (this.metricas && this.estadisticasRecaudacion) {
      this.loading = false;
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  private createCharts(): void {
    this.destroyCharts();

    if (!this.metricas || !this.estadisticasRecaudacion) return;

    try {
      this.createEstadosChart();
      this.createClubesChart();
      this.createMensualChart();
      this.createConceptosChart();
      this.createRecaudacionChart();
    } catch (error) {
      console.error('Error al crear gráficos:', error);
    }
  }

  private createEstadosChart(): void {
    const ctx = this.estadosChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    const data = this.metricas.porEstado;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pagado', 'Pendiente', 'Vencido', 'Anulado'],
        datasets: [{
          data: [data.Pagado, data.Pendiente, data.Vencido, data.Anulado],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Estado'
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

    // Tomar solo los primeros 10 clubes
    const clubes = this.metricas.porClub.slice(0, 10);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: clubes.map(c => c.nombre),
        datasets: [
          {
            label: 'Recaudado',
            data: clubes.map(c => c.recaudado),
            backgroundColor: '#28a745',
            borderColor: '#1e7e34',
            borderWidth: 1
          },
          {
            label: 'Pendiente',
            data: clubes.map(c => c.pendiente),
            backgroundColor: '#ffc107',
            borderColor: '#e0a800',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Recaudación por Club'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createMensualChart(): void {
    const ctx = this.mensualChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    const data = this.metricas.mensuales;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(m => m.mes),
        datasets: [
          {
            label: 'Recaudado',
            data: data.map(m => m.recaudado),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Pendiente',
            data: data.map(m => m.pendiente),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Evolución Mensual'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createConceptosChart(): void {
    const ctx = this.conceptosChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.metricas) return;

    // Tomar solo los primeros 8 conceptos
    const conceptos = this.metricas.porConcepto.slice(0, 8);
    const colors = [
      '#007bff', '#28a745', '#ffc107', '#dc3545',
      '#6f42c1', '#fd7e14', '#20c997', '#6c757d'
    ];

    const chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: conceptos.map(c => c.concepto),
        datasets: [{
          data: conceptos.map(c => c.total),
          backgroundColor: colors.slice(0, conceptos.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Concepto'
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          r: {
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private createRecaudacionChart(): void {
    const ctx = this.recaudacionChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.estadisticasRecaudacion) return;

    const data = this.estadisticasRecaudacion.estadisticas;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(e => e.periodo),
        datasets: [
          {
            label: 'Recaudado',
            data: data.map(e => e.recaudado),
            backgroundColor: '#28a745',
            stack: 'Stack 0'
          },
          {
            label: 'Pendiente',
            data: data.map(e => e.pendiente),
            backgroundColor: '#ffc107',
            stack: 'Stack 0'
          },
          {
            label: 'Vencido',
            data: data.map(e => e.vencido),
            backgroundColor: '#dc3545',
            stack: 'Stack 0'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Estadísticas de Recaudación por Período'
          }
        },
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
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
   * Maneja los cambios de filtros
   */
  onFiltersChanged(filters: PaymentFilters): void {
    this.activeFilters = filters;
    this.cargarDatos(); // Recargar datos con filtros aplicados
  }

  /**
   * Maneja las solicitudes de exportación
   */
  async onExportRequested(type: 'pdf' | 'excel'): Promise<void> {
    console.log('Solicitud de exportación:', type);
    console.log('Métricas regulares disponibles:', this.metricas);

    // Usar los datos reales de cobros para la exportación
    if (!this.metricas) {
      alert('No hay datos disponibles para exportar. Por favor, espere a que los datos se carguen.');
      return;
    }

    try {
      if (type === 'pdf') {
        this.exportingPDF = true;

        // Verificar que el elemento existe
        const element = document.getElementById('payment-metrics-content');
        if (!element) {
          throw new Error('No se encontró el contenido para exportar');
        }

        console.log('Elemento encontrado para PDF:', element);

        await this.exportService.exportCobroMetricsToPDF(
          'payment-metrics-content',
          this.metricas,
          'metricas-cobros'
        );
      } else {
        this.exportingExcel = true;

        console.log('Iniciando exportación Excel...');

        await this.exportService.exportCobroMetricsToExcel(
          this.metricas,
          'metricas-cobros'
        );
      }

      console.log(`Exportación ${type.toUpperCase()} completada exitosamente`);

    } catch (error) {
      console.error(`Error detallado al exportar ${type.toUpperCase()}:`, error);

      let errorMessage = `Error al generar el archivo ${type.toUpperCase()}`;
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      this.exportingPDF = false;
      this.exportingExcel = false;
    }
  }
}

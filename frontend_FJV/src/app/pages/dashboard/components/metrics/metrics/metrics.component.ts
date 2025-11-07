import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-metrics',
  imports: [CommonModule],
  templateUrl: './metrics.component.html',
  styleUrl: './metrics.component.css',
})
export class MetricsComponent implements OnChanges {
  @Input() metricas!: {
    resumenTotales: {
      totalAfiliados: number;
      totalFJV: number;
      totalFEVA: number;
    };
    tipos: { tipo: string; cantidad: string }[];
    afiliadosPorClub: { club: string; cantidad: string }[];
  };

  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef;
  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef;

  viewReady = false;
  private chartInstances: any[] = [];

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metricas'] && this.metricas) {
      this.tryRenderCharts();
    }
  }

  private tryRenderCharts(): void {
    if (!this.viewReady || !this.metricas) return;

    this.destroyCharts();

    if (this.metricas.resumenTotales) {
      this.renderPieChart();
    }

    if (this.metricas.tipos?.length > 0) {
      this.renderDoughnutChart();
    }

    if (this.metricas.afiliadosPorClub?.length > 0) {
      this.renderBarChart();
    }
  }

  private destroyCharts(): void {
    this.chartInstances.forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });
    this.chartInstances = [];
  }

  private renderPieChart(): void {
    if (!this.pieChartCanvas?.nativeElement) {
      console.warn('Canvas para el gráfico de pie no disponible.');
      return;
    }
    const chart = new Chart(this.pieChartCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: ['FJV', 'FEVA'],
        datasets: [
          {
            data: [
              this.metricas.resumenTotales.totalFJV,
              this.metricas.resumenTotales.totalFEVA,
            ],
            backgroundColor: ['#36A2EB', '#FF6384'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
    this.chartInstances.push(chart);
  }

  private renderDoughnutChart(): void {
    if (!this.doughnutChartCanvas?.nativeElement) {
      console.warn('Canvas para el gráfico de donut no disponible.');
      return;
    }

    const labels = this.metricas.tipos.map((c) => c.tipo || 'Sin tipo');
    const data = this.metricas.tipos.map((c) => parseInt(c.cantidad));

    const chart = new Chart(this.doughnutChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
              '#C9CBCE',
            ],
            borderColor: [
              // Opcional: añade bordes para mejor distinción
              '#FFFFFF',
              '#FFFFFF',
              '#FFFFFF',
              '#FFFFFF',
              '#FFFFFF',
              '#FFFFFF',
              '#FFFFFF',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: {
          title: {
            display: true,
            text: 'Cantidad de Personas por Tipo', 
            font: {
              size: 16,
            },
          },
          legend: {
            position: 'top', 
          },
        },
      },
    });
    this.chartInstances.push(chart);
  }

  private renderBarChart(): void {
    // Es buena práctica verificar si el nativeElement está disponible antes de usarlo
    if (!this.barChartCanvas?.nativeElement) {
      console.warn('Canvas para el gráfico de barras no disponible.');
      return;
    }
    const labels = this.metricas.afiliadosPorClub.map((c) => c.club);
    const data = this.metricas.afiliadosPorClub.map((c) =>
      parseInt(c.cantidad)
    );
    const chart = new Chart(this.barChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Afiliados por Club',
            data,
            backgroundColor: '#36A2EB',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Afiliados por Club',
            font: {
              size: 16,
            },
          },
          legend: {
            display: false, 
          },
        },
      },
    });
    this.chartInstances.push(chart);
  }

  isTotalesAvailable(): boolean {
    return (
      this.metricas.resumenTotales.totalFEVA > 0 ||
      this.metricas.resumenTotales.totalFJV > 0
    );
  }

  isTiposAvailable(): boolean {
    return !!this.metricas?.tipos?.length;
  }

  isAfiliadosPorClubAvailable(): boolean {
    return !!this.metricas?.afiliadosPorClub?.length;
  }
}

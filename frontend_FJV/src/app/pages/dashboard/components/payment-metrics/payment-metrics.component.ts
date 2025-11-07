import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import Chart from 'chart.js/auto';

export interface PaymentMetrics {
  // Métricas por estado
  porEstado: {
    pendientes: number;
    pagados: number;
    vencidos: number;
    anulados: number;
  };

  // Métricas por montos
  montos: {
    totalRecaudado: number;
    promedioMonto: number;
    montoMayor: number;
    montoMenor: number;
  };

  // Métricas por club
  porClub: {
    club: string;
    totalCobros: number;
    totalRecaudado: number;
    pendientes: number;
    vencidos: number;
  }[];

  // Métricas por período
  porMes: {
    mes: string;
    totalCobros: number;
    totalRecaudado: number;
    tasaPago: number; // Porcentaje de cobros pagados
  }[];

  // Métricas por método de pago
  porMetodoPago: {
    metodo: string;
    cantidad: number;
    monto: number;
  }[];
}

@Component({
  selector: 'app-payment-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-metrics.component.html',
  styleUrls: ['./payment-metrics.component.css']
})
export class PaymentMetricsComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() metrics!: PaymentMetrics;

  @ViewChild('statusPieChart') statusPieChart!: ElementRef;
  @ViewChild('clubBarChart') clubBarChart!: ElementRef;
  @ViewChild('monthlyLineChart') monthlyLineChart!: ElementRef;
  @ViewChild('paymentMethodChart') paymentMethodChart!: ElementRef;

  viewReady = false;
  private chartInstances: Chart[] = [];

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metrics'] && this.metrics) {
      this.tryRenderCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private tryRenderCharts(): void {
    if (!this.viewReady || !this.metrics) return;

    this.destroyCharts();

    // Renderizar todos los gráficos
    setTimeout(() => {
      this.renderStatusPieChart();
      this.renderClubBarChart();
      this.renderMonthlyLineChart();
      this.renderPaymentMethodChart();
    }, 100);
  }

  private destroyCharts(): void {
    this.chartInstances.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.chartInstances = [];
  }

  /**
   * Gráfico de torta - Estados de cobros
   */
  private renderStatusPieChart(): void {
    if (!this.statusPieChart?.nativeElement || !this.metrics.porEstado) return;

    const chart = new Chart(this.statusPieChart.nativeElement, {
      type: 'pie',
      data: {
        labels: ['Pagados', 'Pendientes', 'Vencidos', 'Anulados'],
        datasets: [{
          data: [
            this.metrics.porEstado.pagados,
            this.metrics.porEstado.pendientes,
            this.metrics.porEstado.vencidos,
            this.metrics.porEstado.anulados
          ],
          backgroundColor: [
            '#28a745', // Verde para pagados
            '#ffc107', // Amarillo para pendientes
            '#dc3545', // Rojo para vencidos
            '#6c757d'  // Gris para anulados
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Estados de Cobros',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    this.chartInstances.push(chart);
  }

  /**
   * Gráfico de barras - Cobros por club
   */
  private renderClubBarChart(): void {
    if (!this.clubBarChart?.nativeElement || !this.metrics.porClub?.length) return;

    const labels = this.metrics.porClub.map(item => item.club);
    const recaudado = this.metrics.porClub.map(item => item.totalRecaudado);
    const totalCobros = this.metrics.porClub.map(item => item.totalCobros);

    const chart = new Chart(this.clubBarChart.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Recaudado ($)',
            data: recaudado,
            backgroundColor: '#36A2EB',
            borderColor: '#1E88E5',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Cantidad de Cobros',
            data: totalCobros,
            backgroundColor: '#FF6384',
            borderColor: '#E91E63',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Métricas por Club',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Monto Recaudado ($)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Cantidad de Cobros'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });

    this.chartInstances.push(chart);
  }

  /**
   * Gráfico de líneas - Evolución mensual
   */
  private renderMonthlyLineChart(): void {
    if (!this.monthlyLineChart?.nativeElement || !this.metrics.porMes?.length) return;

    const labels = this.metrics.porMes.map(item => item.mes);
    const recaudado = this.metrics.porMes.map(item => item.totalRecaudado);
    const tasaPago = this.metrics.porMes.map(item => item.tasaPago);

    const chart = new Chart(this.monthlyLineChart.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Recaudado ($)',
            data: recaudado,
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Tasa de Pago (%)',
            data: tasaPago,
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Evolución Mensual de Cobros',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Monto Recaudado ($)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Tasa de Pago (%)'
            },
            min: 0,
            max: 100,
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });

    this.chartInstances.push(chart);
  }

  /**
   * Gráfico de dona - Métodos de pago
   */
  private renderPaymentMethodChart(): void {
    if (!this.paymentMethodChart?.nativeElement || !this.metrics.porMetodoPago?.length) return;

    const labels = this.metrics.porMetodoPago.map(item => item.metodo);
    const data = this.metrics.porMetodoPago.map(item => item.cantidad);

    const chart = new Chart(this.paymentMethodChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#4BC0C0', // MercadoPago
            '#FFCE56', // Transferencia
            '#FF9F40', // Efectivo
            '#9966FF', // Otros
            '#36A2EB'  // Adicionales
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Métodos de Pago Utilizados',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    this.chartInstances.push(chart);
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(amount: number): string {
    if (!amount || isNaN(amount)) return '$ 0';

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calcula el porcentaje de un valor sobre el total
   */
  calculatePercentage(value: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Obtiene el color según el estado
   */
  getStatusColor(status: string): string {
    const colors = {
      'Pagado': 'text-success',
      'Pendiente': 'text-warning',
      'Vencido': 'text-danger',
      'Anulado': 'text-muted'
    };
    return colors[status as keyof typeof colors] || 'text-secondary';
  }
}

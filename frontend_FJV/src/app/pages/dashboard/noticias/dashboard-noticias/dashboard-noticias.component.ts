import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NoticiaService } from '../../../../services/noticia.service';
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-noticias.component.html',
  styleUrls: ['./dashboard-noticias.component.css']
})
export class DashboardNoticiasComponent implements OnInit {
  estadisticas: any = {
    totalNoticias: 0,
    activas: 0,
    inactivas: 0,
    borradores: 0,
    destacadas: 0,
    vistasTotal: 0,
    ultimoMes: 0,
    porCategoria: [],
    porMes: []
  };

  isLoading = true;
  error: string | null = null;

  // Referencias a los gráficos
  estadoChart: Chart | null = null;
  categoriaChart: Chart | null = null;
  mesesChart: Chart | null = null;

  constructor(private noticiaService: NoticiaService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.isLoading = true;
    this.error = null;

    this.noticiaService.getEstadisticas().subscribe({
      next: (response) => {
        if (response && response.estadisticas) {
          this.estadisticas = response.estadisticas;
          this.isLoading = false;

          // Una vez cargados los datos, inicializar los gráficos
          setTimeout(() => {
            this.inicializarGraficos();
          }, 100);
        } else {
          this.error = 'Formato de respuesta inválido';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
        this.error = 'No se pudieron cargar las estadísticas';
        this.isLoading = false;

        // Cargar datos de muestra para demostración
        this.cargarDatosDeMuestra();
      }
    });
  }

  // Método para cargar datos de muestra cuando falla la API
  cargarDatosDeMuestra(): void {
    this.estadisticas = {
      totalNoticias: 45,
      activas: 28,
      inactivas: 10,
      borradores: 7,
      destacadas: 5,
      vistasTotal: 1250,
      ultimoMes: 420,
      porCategoria: [
        { categoria: 'DEPORTES', cantidad: 15, vistas: 650 },
        { categoria: 'EVENTOS', cantidad: 10, vistas: 320 },
        { categoria: 'TORNEOS', cantidad: 12, vistas: 180 },
        { categoria: 'INSTITUCIONAL', cantidad: 8, vistas: 100 }
      ],
      porMes: [
        { mes: 'Ene', cantidad: 4, vistas: 110 },
        { mes: 'Feb', cantidad: 2, vistas: 80 },
        { mes: 'Mar', cantidad: 5, vistas: 100 },
        { mes: 'Abr', cantidad: 3, vistas: 90 },
        { mes: 'May', cantidad: 6, vistas: 150 },
        { mes: 'Jun', cantidad: 4, vistas: 130 }
      ]
    };

    // Inicializar gráficos con datos de muestra
    setTimeout(() => {
      this.inicializarGraficos();
    }, 100);
  }

  inicializarGraficos(): void {
    this.crearGraficoEstados();
    this.crearGraficoCategorias();
    this.crearGraficoMeses();
  }

  crearGraficoEstados(): void {
    const canvas = document.getElementById('estadosChart') as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfico anterior si existe
    if (this.estadoChart) {
      this.estadoChart.destroy();
    }

    this.estadoChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Activas', 'Inactivas', 'Borradores'],
        datasets: [{
          data: [
            this.estadisticas?.activas || 0,
            this.estadisticas?.inactivas || 0,
            this.estadisticas?.borradores || 0
          ],
          backgroundColor: [
            'rgba(40, 167, 69, 0.7)',
            'rgba(220, 53, 69, 0.7)',
            'rgba(108, 117, 125, 0.7)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribución por estado'
          }
        }
      }
    });
  }

  crearGraficoCategorias(): void {
    const canvas = document.getElementById('categoriasChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.categoriaChart) {
      this.categoriaChart.destroy();
    }

    // Verificar que porCategoria existe y no está vacío
    if (!this.estadisticas?.porCategoria || !Array.isArray(this.estadisticas.porCategoria) || this.estadisticas.porCategoria.length === 0) {
      console.warn('No hay datos de categorías para mostrar en el gráfico');
      return;
    }

    // Extraer datos para el gráfico de barras
    const categorias = this.estadisticas.porCategoria.map((item: any) => item.categoria);
    const cantidades = this.estadisticas.porCategoria.map((item: any) => item.cantidad);
    const vistas = this.estadisticas.porCategoria.map((item: any) => item.vistas);

    this.categoriaChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: categorias,
        datasets: [
          {
            label: 'Cantidad',
            data: cantidades,
            backgroundColor: 'rgba(13, 110, 253, 0.7)',
            borderColor: 'rgba(13, 110, 253, 1)',
            borderWidth: 1
          },
          {
            label: 'Vistas',
            data: vistas,
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Noticias por categoría'
          }
        }
      }
    });
  }

  crearGraficoMeses(): void {
    const canvas = document.getElementById('mesesChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.mesesChart) {
      this.mesesChart.destroy();
    }

    // Verificar que porMes existe y no está vacío
    if (!this.estadisticas?.porMes || !Array.isArray(this.estadisticas.porMes) || this.estadisticas.porMes.length === 0) {
      console.warn('No hay datos mensuales para mostrar en el gráfico');
      return;
    }

    // Extraer datos para el gráfico de línea
    const meses = this.estadisticas.porMes.map((item: any) => item.mes);
    const cantidades = this.estadisticas.porMes.map((item: any) => item.cantidad);
    const vistas = this.estadisticas.porMes.map((item: any) => item.vistas);

    this.mesesChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: meses,
        datasets: [
          {
            label: 'Noticias Publicadas',
            data: cantidades,
            borderColor: 'rgba(13, 110, 253, 1)',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Vistas',
            data: vistas,
            borderColor: 'rgba(40, 167, 69, 1)',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Noticias'
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Vistas'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Noticias por mes'
          }
        }
      }
    });
  }

  // Formatear números grandes
  formatNumero(numero: number | undefined | null): string {
    if (numero === undefined || numero === null) {
      return '0'; // Devolver '0' como valor predeterminado para números undefined o null
    }

    if (numero >= 1000000) {
      return (numero / 1000000).toFixed(1) + 'M';
    } else if (numero >= 1000) {
      return (numero / 1000).toFixed(1) + 'K';
    }
    return numero.toString();
  }
}

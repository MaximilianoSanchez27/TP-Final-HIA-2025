import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NoticiaService } from '../../../../services/noticia.service';
import { Chart, registerables } from 'chart.js';
import { Subject, takeUntil, timer, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

interface EstadisticasNoticias {
  totalNoticias: number;
  activas: number;
  inactivas: number;
  borradores: number;
  destacadas: number;
  vistasTotal: number;
  ultimoMes: number;
  porCategoria: Array<{ categoria: string; cantidad: number; vistas: number }>;
  porMes: Array<{ mes: string; cantidad: number; vistas: number }>;
}

@Component({
  selector: 'app-dashboard-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-noticias.component.html',
  styleUrls: ['./dashboard-noticias.component.css']
})
export class DashboardNoticiasComponent implements OnInit, OnDestroy {
  estadisticas: EstadisticasNoticias = {
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
  usandoDatosDeMuestra = false;

  // Referencias a los gráficos
  estadoChart: Chart | null = null;
  categoriaChart: Chart | null = null;
  mesesChart: Chart | null = null;

  // Para gestionar las suscripciones
  private unsubscribe$ = new Subject<void>();

  constructor(private noticiaService: NoticiaService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();

    // Destruir gráficos para evitar memory leaks
    if (this.estadoChart) this.estadoChart.destroy();
    if (this.categoriaChart) this.categoriaChart.destroy();
    if (this.mesesChart) this.mesesChart.destroy();
  }

  cargarEstadisticas(): void {
    this.isLoading = true;
    this.error = null;
    this.usandoDatosDeMuestra = false;

    // Si los gráficos existen, destruirlos antes de crear nuevos
    if (this.estadoChart) {
      this.estadoChart.destroy();
      this.estadoChart = null;
    }
    if (this.categoriaChart) {
      this.categoriaChart.destroy();
      this.categoriaChart = null;
    }
    if (this.mesesChart) {
      this.mesesChart.destroy();
      this.mesesChart = null;
    }

    console.log('Iniciando solicitud de estadísticas al servidor...');

    this.noticiaService.getEstadisticas()
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError(err => {
          console.error('Error al cargar estadísticas:', err);
          this.error = err.message || 'Error al cargar las estadísticas';
          this.usandoDatosDeMuestra = true;

          console.log('Cargando datos de muestra para las estadísticas debido al error:', err.message);
          this.cargarDatosDeMuestra();

          // Retornar observable vacío para continuar
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          console.log('Finalizada solicitud de estadísticas');
        })
      )
      .subscribe(response => {
        if (!response || this.usandoDatosDeMuestra) {
          return; // Ya se manejó en el catchError
        }

        console.log('Respuesta de estadísticas recibida:', response);

        if (response.estadisticas) {
          this.estadisticas = response.estadisticas;
          console.log('Datos de estadísticas procesados correctamente');
        } else if (response.data) {
          // Adaptarse a otro formato posible
          this.adaptarRespuesta(response.data);
        } else {
          // Intentar con el objeto completo
          this.adaptarRespuesta(response);
        }

        // Una vez cargados los datos, inicializar los gráficos
        setTimeout(() => {
          this.inicializarGraficos();
        }, 100);
      });
  }

  // Adapta diferentes formatos de respuesta del backend
  private adaptarRespuesta(data: any): void {
    try {
      // Intentar adaptarse a diferentes estructuras posibles de la API
      this.estadisticas = {
        totalNoticias: data.totalNoticias || data.total || 0,
        activas: data.activas || data.estadoActivo || 0,
        inactivas: data.inactivas || data.estadoInactivo || 0,
        borradores: data.borradores || data.estadoBorrador || 0,
        destacadas: data.destacadas || data.noticiasDestacadas || 0,
        vistasTotal: data.vistasTotal || data.totalVistas || 0,
        ultimoMes: data.ultimoMes || data.vistasUltimoMes || 0,
        porCategoria: data.porCategoria || data.categorias || [],
        porMes: data.porMes || data.meses || []
      };

      console.log('Datos adaptados:', this.estadisticas);
    } catch (error) {
      console.error('Error al adaptar datos:', error);
      this.cargarDatosDeMuestra();
    }
  }

  // Método para cargar datos de muestra cuando falla la API
  cargarDatosDeMuestra(): void {
    // Generar datos realistas de muestra
    const fechaActual = new Date();
    const meses = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fechaActual.getMonth() - i);
      const nombreMes = fecha.toLocaleString('es', { month: 'short' });

      meses.push({
        mes: nombreMes,
        cantidad: Math.floor(Math.random() * 10) + 1, 
        vistas: Math.floor(Math.random() * 200) + 50  
      });
    }

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
      porMes: meses
    };

    this.usandoDatosDeMuestra = true;

    // Inicializar gráficos con datos de muestra
    setTimeout(() => {
      this.inicializarGraficos();
    }, 100);
  }

  inicializarGraficos(): void {
    try {
      this.crearGraficoEstados();
      this.crearGraficoCategorias();
      this.crearGraficoMeses();
    } catch (error) {
      console.error('Error al inicializar gráficos:', error);
    }
  }

  crearGraficoEstados(): void {
    const canvas = document.getElementById('estadosChart') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('No se encontró el elemento canvas para el gráfico de estados');
      return;
    }

    // Destruir gráfico anterior si existe
    if (this.estadoChart) {
      this.estadoChart.destroy();
    }

    try {
      this.estadoChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Activas', 'Inactivas', 'Borradores'],
          datasets: [{
            data: [
              this.estadisticas.activas || 0,
              this.estadisticas.inactivas || 0,
              this.estadisticas.borradores || 0
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
    } catch (error) {
      console.error('Error al crear gráfico de estados:', error);
    }
  }

  crearGraficoCategorias(): void {
    const canvas = document.getElementById('categoriasChart') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('No se encontró el elemento canvas para el gráfico de categorías');
      return;
    }

    if (this.categoriaChart) {
      this.categoriaChart.destroy();
    }

    // Verificar que porCategoria existe y no está vacío
    if (!this.estadisticas.porCategoria || !Array.isArray(this.estadisticas.porCategoria) || this.estadisticas.porCategoria.length === 0) {
      console.warn('No hay datos de categorías para mostrar en el gráfico');
      return;
    }

    // Extraer datos para el gráfico de barras
    const categorias = this.estadisticas.porCategoria.map(item => item.categoria);
    const cantidades = this.estadisticas.porCategoria.map(item => item.cantidad);
    const vistas = this.estadisticas.porCategoria.map(item => item.vistas);

    try {
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
    } catch (error) {
      console.error('Error al crear gráfico de categorías:', error);
    }
  }

  crearGraficoMeses(): void {
    const canvas = document.getElementById('mesesChart') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('No se encontró el elemento canvas para el gráfico de meses');
      return;
    }

    if (this.mesesChart) {
      this.mesesChart.destroy();
    }

    // Verificar que porMes existe y no está vacío
    if (!this.estadisticas.porMes || !Array.isArray(this.estadisticas.porMes) || this.estadisticas.porMes.length === 0) {
      console.warn('No hay datos mensuales para mostrar en el gráfico');
      return;
    }

    // Extraer datos para el gráfico de línea
    const meses = this.estadisticas.porMes.map(item => item.mes);
    const cantidades = this.estadisticas.porMes.map(item => item.cantidad);
    const vistas = this.estadisticas.porMes.map(item => item.vistas);

    try {
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
    } catch (error) {
      console.error('Error al crear gráfico de meses:', error);
    }
  }

  // Formatear números grandes
  formatNumero(numero: number | undefined | null): string {
    if (numero === undefined || numero === null) {
      return '0'; 
    }

    if (numero >= 1000000) {
      return (numero / 1000000).toFixed(1) + 'M';
    } else if (numero >= 1000) {
      return (numero / 1000).toFixed(1) + 'K';
    }
    return numero.toString();
  }
}

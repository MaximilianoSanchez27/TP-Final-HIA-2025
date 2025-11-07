import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import { ActionCardsComponent } from '../components/action-cards/action-cards.component';
import { RecentActivitiesComponent } from '../components/recent-activities/recent-activities.component';
import { QuickAccessComponent } from '../components/quick-access/quick-access.component';
import { AfiliadoService } from '../../../services/afiliado.service';
import { CobroService, DashboardStats } from '../../../services/cobro.service';
import { forkJoin } from 'rxjs';
import { MetricsChartsComponent } from '../components/metrics-charts/metrics-charts.component';
import { AnalyticsChartsComponent } from '../components/analytics-charts/analytics-charts.component';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StatsCardsComponent,
    ActionCardsComponent,
    MetricsChartsComponent,
    AnalyticsChartsComponent,
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css'],
})
export class DashboardHomeComponent implements OnInit {
  userName: string = 'Administrador';

  // Tarjetas principales de acciones
  dashboardCards: DashboardCard[] = [
    {
      title: 'Cobros',
      description: 'Gestión de cobros y facturación',
      icon: 'fa-dollar-sign',
      route: '/dashboard/cobros',
      color: 'primary',
    },
    {
      title: 'Clubes',
      description: 'Administrar clubes registrados',
      icon: 'fa-building',
      route: '/clubs',
      color: 'success',
    },
    {
      title: 'Afiliados',
      description: 'Gestión de afiliados',
      icon: 'fa-users',
      route: '/afiliados',
      color: 'info',
    },
    {
      title: 'Noticias',
      description: 'Administrar noticias del sitio',
      icon: 'fa-newspaper',
      route: '/admin/noticias',
      color: 'warning',
    },
    {
      title: 'Configurar Hero',
      description: 'Personalizar la sección principal del sitio',
      icon: 'fa-image',
      route: '/dashboard/configuracion/hero',
      color: 'secondary',
    },
    {
      title: 'Momentos Destacados',
      description: 'Gestionar momentos destacados del sitio web',
      icon: 'fa-star',
      route: '/dashboard/configuracion/momentos-destacados',
      color: 'warning',
    },
    {
      title: 'Áreas de Trabajo',
      description: 'Configurar las áreas de trabajo del sitio web',
      icon: 'fa-briefcase',
      route: '/dashboard/configuracion/areas-trabajo',
      color: 'info',
    },
  ];

  // Actividades recientes (datos de ejemplo para el dashboard)
  recentActivities = [
    {
      action: 'Cobro registrado',
      club: 'Club Atlético',
      amount: 15000,
      date: '2023-06-15',
    },
    {
      action: 'Comprobante emitido',
      club: 'Deportivo Jujuy',
      amount: 22000,
      date: '2023-06-14',
    },
    {
      action: 'Cobro vencido',
      club: 'Universitario',
      amount: 18000,
      date: '2023-06-10',
    },
    {
      action: 'Nuevo club registrado',
      club: 'Villa San Martín',
      amount: null,
      date: '2023-06-08',
    },
  ];

  // Estadísticas de cobros - Inicializar con valores por defecto
  statistics: DashboardStats = {
    totalCobros: 0,
    cobrosPendientes: 0,
    cobrosVencidos: 0,
    totalRecaudado: 0,
  };

  metricas: any = null;
  loading: boolean = true;
  loadingStats: boolean = true;

  constructor(
    private afiliadoService: AfiliadoService,
    private cobroService: CobroService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Carga todos los datos del dashboard
   */
  private loadData(): void {
    this.loading = true;
    this.loadingStats = true;

    this.cobroService.getDashboardStats().subscribe({
      next: (stats: DashboardStats) => {
        this.statistics = stats;
        this.loading = false;
        this.loadingStats = false;
        console.log('✅ Estadísticas de cobros cargadas:', this.statistics);
      },
      error: (err: any) => {
        console.error('❌ Error cargando estadísticas:', err);
        this.loading = false;
        this.loadingStats = false;
      },
    });
  }

  /**
   * Recargar todos los datos del dashboard
   */
  refreshCobroStats(): void {
    this.loadingStats = true;

    this.cobroService.getDashboardStats().subscribe({
      next: (stats: DashboardStats) => {
        this.statistics = stats;
        this.loadingStats = false;
        console.log('🔄 Datos del dashboard actualizados');
      },
      error: (err: any) => {
        console.error('❌ Error al actualizar datos del dashboard:', err);
        this.loadingStats = false;
      },
    });
  }

  /**
   * Filtrar estadísticas por rango de fechas
   */
  filterByDateRange(fechaDesde: string, fechaHasta: string): void {
    console.log('Filtro por rango de fechas no disponible actualmente');
    this.loadData();
  }

  /**
   * Cargar métricas de pagos
   */
  loadPaymentMetrics(): void {
    console.log(
      'Métricas de pagos ahora están disponibles en la pestaña de métricas avanzadas'
    );
  }

  /**
   * Refrescar métricas de pagos
   */
  refreshPaymentMetrics(): void {
    console.log(
      'Las métricas de pagos se actualizan automáticamente en el componente de métricas avanzadas'
    );
  }
}

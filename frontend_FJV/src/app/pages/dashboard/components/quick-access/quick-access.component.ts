import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface QuickLink {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-quick-access',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-access.component.html',
  styleUrls: ['./quick-access.component.css']
})
export class QuickAccessComponent {
  quickLinks: QuickLink[] = [
    {
      title: 'Nuevo Cobro',
      description: 'Registrar un nuevo cobro',
      icon: 'fa-plus',
      route: '/dashboard/cobros/nuevo',
      color: 'primary'
    },
    {
      title: 'Listado de Cobros',
      description: 'Ver todos los cobros',
      icon: 'fa-list',
      route: '/dashboard/cobros',
      color: 'success'
    },
    {
      title: 'Generar Reporte',
      description: 'Exportar datos de cobros',
      icon: 'fa-chart-line',
      route: '/dashboard/reportes',
      color: 'info'
    },
    {
      title: 'Configuración',
      description: 'Ajustes del sistema',
      icon: 'fa-cog',
      route: '/dashboard/configuracion',
      color: 'secondary'
    }
  ];
}

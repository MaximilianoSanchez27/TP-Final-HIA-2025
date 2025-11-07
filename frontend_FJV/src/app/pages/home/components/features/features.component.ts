import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { WorkAreasService } from '../../../../services/work-areas.service';
import { WorkAreasConfig, WorkArea } from '../../../../models/work-areas.model';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.css']
})
export class FeaturesComponent implements OnInit, OnDestroy {
  workAreasConfig: WorkAreasConfig | null = null;
  isLoading = true;
  error = false;

  private destroy$ = new Subject<void>();

  // Configuración por defecto como fallback
  private defaultConfig: WorkAreasConfig = {
    tituloSeccion: 'Áreas de trabajo',
    areas: [
      {
        titulo: 'Torneos Provinciales',
        descripcion: 'Organizamos torneos en todas las categorías, promoviendo la competencia a nivel provincial y regional.',
        icono: 'fas fa-trophy',
        orden: 1,
        activo: true
      },
      {
        titulo: 'Selecciones Provinciales',
        descripcion: 'Formamos y preparamos las selecciones de Jujuy para representar a nuestra provincia en torneos nacionales.',
        icono: 'fas fa-users',
        orden: 2,
        activo: true
      },
      {
        titulo: 'Capacitación Deportiva',
        descripcion: 'Ofrecemos cursos para jugadores, entrenadores y árbitros para mantener el alto nivel del voley jujeño.',
        icono: 'fas fa-graduation-cap',
        orden: 3,
        activo: true
      }
    ],
    activo: true
  };

  constructor(private workAreasService: WorkAreasService) {}

  ngOnInit(): void {
    this.loadWorkAreasConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la configuración de áreas de trabajo desde el backend
   */
  private loadWorkAreasConfig(): void {
    this.isLoading = true;
    this.error = false;

    this.workAreasService.getWorkAreasConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.workAreasConfig = config;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando configuración de áreas de trabajo:', error);
          this.workAreasConfig = this.defaultConfig;
          this.error = true;
          this.isLoading = false;
        }
      });
  }

  /**
   * Obtiene el título de la sección
   */
  get sectionTitle(): string {
    return this.workAreasConfig?.tituloSeccion || this.defaultConfig.tituloSeccion;
  }

  /**
   * Obtiene las áreas activas ordenadas
   */
  get activeAreas(): WorkArea[] {
    const areas = this.workAreasConfig?.areas || this.defaultConfig.areas;
    return areas
      .filter(area => area.activo)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  /**
   * Verifica si hay áreas para mostrar
   */
  get hasAreas(): boolean {
    return this.activeAreas.length > 0;
  }
}

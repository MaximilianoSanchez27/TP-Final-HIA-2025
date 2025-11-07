import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MomentosDestacadosService } from '../../services/momentos-destacados.service';
import { MomentosDestacadosConfig, MomentoDestacadoImage } from '../../models/momentos-destacados.model';

@Component({
  selector: 'app-momentos-destacados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './momentos-destacados.component.html',
  styleUrls: ['./momentos-destacados.component.css']
})
export class MomentosDestacadosComponent implements OnInit, OnDestroy {
  momentosConfig: MomentosDestacadosConfig | null = null;
  isLoading = true;
  error = false;

  private subscription = new Subscription();

  constructor(private momentosDestacadosService: MomentosDestacadosService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Carga la configuración de momentos destacados
   */
  private loadConfig(): void {
    this.isLoading = true;
    this.error = false;

    const sub = this.momentosDestacadosService.getMomentosDestacadosConfig().subscribe({
      next: (response) => {
        this.momentosConfig = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
        this.error = true;
        this.isLoading = false;
      }
    });

    this.subscription.add(sub);
  }

  /**
   * Verifica si la sección debe mostrarse
   */
  shouldShowSection(): boolean {
    return !this.isLoading &&
           !this.error &&
           !!this.momentosConfig?.activo &&
           (this.momentosConfig?.imagenes?.length || 0) > 0;
  }

  /**
   * Obtiene las imágenes activas ordenadas
   */
  getActiveImages(): MomentoDestacadoImage[] {
    if (!this.momentosConfig?.imagenes) {
      return [];
    }

    return this.momentosConfig.imagenes
      .filter(img => img.activo)
      .sort((a, b) => a.orden - b.orden)
      .slice(0, 6); // Máximo 6 imágenes
  }

  /**
   * TrackBy function para optimizar el renderizado de imágenes
   */
  trackByImageId(index: number, item: MomentoDestacadoImage): number {
    return item.idImagen;
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    console.warn('Error cargando imagen:', img.src);
  }
}

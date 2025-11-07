import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroConfigService } from '../../services/hero-config.service';
import { HeroConfig } from '../../models/hero-config.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-hero-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-banner.component.html',
  styleUrls: ['./hero-banner.component.css']
})
export class HeroBannerComponent implements OnInit, OnDestroy {
  isLoading = true;
  heroConfig: HeroConfig | null = null;
  currentSlide = 0;
  private slideInterval: any;
  private backendUrl = environment.apiUrl.replace('/api', '');

  // Configuración por defecto como fallback
  defaultConfig = {
    eslogan: 'Federación Jujeña de Voleibol',
    subTexto: 'Promoviendo el voleibol en la provincia de Jujuy desde sus bases',
    imagenes: []
  };

  constructor(private heroConfigService: HeroConfigService) {}

  ngOnInit() {
    this.loadHeroConfig();
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  loadHeroConfig() {
    this.isLoading = true;

    this.heroConfigService.getHeroConfig().subscribe({
      next: (config) => {
        if (config && config.activo) {
          this.heroConfig = config;
          // Iniciar carousel automático si hay múltiples imágenes
          if (this.activeImages.length > 1) {
            this.startAutoSlide();
          }
        } else {
          // Si no hay configuración o está inactiva, usar valores por defecto
          this.heroConfig = null;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración del Hero:', error);
        this.heroConfig = null;
        this.isLoading = false;
      }
    });
  }

  // Getters para facilitar el acceso en el template
  get currentEslogan(): string {
    return this.heroConfig?.eslogan || this.defaultConfig.eslogan;
  }

  get currentSubTexto(): string {
    return this.heroConfig?.subTexto || this.defaultConfig.subTexto;
  }

  get hasImages(): boolean {
    return !!(this.heroConfig?.imagenes && this.heroConfig.imagenes.length > 0);
  }

  get activeImages() {
    return this.heroConfig?.imagenes?.filter(img => img.activo) || [];
  }

  /**
   * Construye la URL completa de una imagen
   */
  getImageUrl(url: string): string {
    // Si la URL ya es completa (contiene http), devolverla tal como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Si la URL empieza con /uploads, construir URL completa
    if (url.startsWith('/uploads/')) {
      return `${this.backendUrl}${url}`;
    }

    // Si es una ruta de assets local, devolverla tal como está
    if (url.startsWith('assets/')) {
      return url;
    }

    // Por defecto, asumir que es una ruta del backend
    return `${this.backendUrl}${url.startsWith('/') ? url : '/' + url}`;
  }

  /**
   * Navega a una slide específica
   */
  goToSlide(index: number) {
    if (index >= 0 && index < this.activeImages.length) {
      this.currentSlide = index;
      // Reiniciar el carousel automático
      this.restartAutoSlide();
    }
  }

  /**
   * Inicia el carousel automático
   */
  private startAutoSlide() {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Cambiar cada 5 segundos
  }

  /**
   * Para y reinicia el carousel automático
   */
  private restartAutoSlide() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.activeImages.length > 1) {
      this.startAutoSlide();
    }
  }

  /**
   * Navega a la siguiente slide
   */
  private nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.activeImages.length;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HostListener } from '@angular/core';
import { NoticiaService } from '../../services/noticia.service';
import { Noticia } from '../../models/noticia.model';

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  imageUrl: string;
  date: string;
  category: string;
}

@Component({
  selector: 'app-news-carousel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './news-carousel.component.html',
  styleUrls: ['./news-carousel.component.css']
})
export class NewsCarouselComponent implements OnInit {
  newsItems: NewsItem[] = [];
  activeSlideIndex = 0;
  animationClass = 'animate__fadeIn';
  itemsPerView = 4;
  Math = Math;
  isLoading = true;
  error = '';

  @HostListener('window:resize')
  onResize(): void {
    this.updateItemsPerView();
  }

  constructor(private noticiaService: NoticiaService) {}

  ngOnInit(): void {
    this.loadNewsData();
    this.updateItemsPerView();
  }

  private updateItemsPerView(): void {
    const width = window.innerWidth;
    this.itemsPerView = width < 576 ? 1 : width < 992 ? 2 : 4;
  }

  private loadNewsData(): void {
    this.isLoading = true;
    this.error = '';

    // Usar NoticiaService para obtener noticias reales
    this.noticiaService.getNoticias({
      estado: 'ACTIVO',
      limit: 10, // Obtener suficientes noticias para el carrusel
      page: 1
    }).subscribe({
      next: (response) => {
        // Convertir las noticias al formato NewsItem
        this.newsItems = response.noticias.map(noticia => ({
          id: noticia.idNoticia || 0,
          title: noticia.titulo,
          summary: noticia.resumen || '',
          imageUrl: noticia.imagenPrincipal || 'assets/images/noticia-placeholder.jpg',
          date: this.formatDate(noticia.fechaPublicacion),
          category: noticia.categoria
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar noticias para el carrusel:', err);
        this.error = 'Error al cargar las noticias';
        this.isLoading = false;
        // Si hay error, cargar datos estáticos como fallback
        this.loadStaticData();
      }
    });
  }

  // Método de respaldo con datos estáticos si la API falla
  private loadStaticData(): void {
    console.log('Cargando datos estáticos para el carrusel como respaldo');
    this.newsItems = [
      {
        id: 1,
        title: 'Brian Impellizzeri brilló en Suiza y reafirmó su liderazgo mundial',
        summary: 'El atleta paralímpico jujeño logró un impresionante primer puesto en la competencia internacional',
        imageUrl: 'assets/images/noticia.png',
        date: '10 Jun 2025',
        category: 'Atletas'
      },
      {
        id: 2,
        title: 'Murciélagos y Murciélagas: orgullo argentino en el fútbol para ciegos',
        summary: 'El equipo nacional conquistó el campeonato con una actuación destacada de los jugadores jujeños',
        imageUrl: 'assets/images/noticia2.png',
        date: '5 Jun 2025',
        category: 'Inclusión'
      },
      {
        id: 3,
        title: 'La historia de Pablo Cingolani: del abismo al podio con la fuerza de la voluntad',
        summary: 'El deportista jujeño superó todas las adversidades para lograr un lugar en el podio nacional',
        imageUrl: 'assets/images/noticia.png',
        date: '1 Jun 2025',
        category: 'Inspiración'
      },
      {
        id: 4,
        title: 'Juegos Binacionales',
        summary: 'Jujuy representará a Argentina en los próximos juegos de voleibol internacional',
        imageUrl: 'assets/images/noticia2.png',
        date: '29 May 2025',
        category: 'Internacional'
      },
      {
        id: 5,
        title: 'Ampliación de Liga Provincial',
        summary: 'La liga provincial sumará dos nuevas categorías para la temporada 2026',
        imageUrl: 'assets/images/noticia.png',
        date: '25 May 2025',
        category: 'Liga'
      },
      {
        id: 6,
        title: 'Beach Volley en Jujuy',
        summary: 'Se inaugura circuito provincial de vóley playa con 6 fechas en diferentes localidades',
        imageUrl: 'assets/images/noticia2.png',
        date: '20 May 2025',
        category: 'Beach Volley'
      }
    ];
  }

  // Formatear fecha para mostrar
  private formatDate(fecha: string | undefined): string {
    if (!fecha) return '---';

    try {
      const date = new Date(fecha);
      // Configuración para formato de fecha en español
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };

      return new Intl.DateTimeFormat('es-ES', options).format(date);
    } catch (e) {
      return '---';
    }
  }

  // Obtener URL amigable para una noticia
  getNoticiaUrl(newsItem: NewsItem): string {
    return `/noticias/${newsItem.category.toLowerCase()}/${this.generateSlug(newsItem.title)}`;
  }

  // Generar slug simple (simplificado del servicio)
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  }

  nextSlide(): void {
    if (this.showNextButton) {
      this.animationClass = 'animate__fadeInRight';
      this.activeSlideIndex++;
    }
  }

  prevSlide(): void {
    if (this.showPrevButton) {
      this.animationClass = 'animate__fadeInLeft';
      this.activeSlideIndex--;
    }
  }

  goToPage(pageIndex: number): void {
    this.activeSlideIndex = pageIndex * this.itemsPerView;
    this.animationClass = pageIndex > this.currentPage ? 'animate__fadeInRight' :
                          pageIndex < this.currentPage ? 'animate__fadeInLeft' :
                          'animate__fadeIn';
  }

  get currentPage(): number {
    return Math.floor(this.activeSlideIndex / this.itemsPerView);
  }

  get visibleNews(): NewsItem[] {
    return this.newsItems.slice(this.activeSlideIndex, this.activeSlideIndex + this.itemsPerView);
  }

  get showNextButton(): boolean {
    return this.activeSlideIndex < this.newsItems.length - this.itemsPerView;
  }

  get showPrevButton(): boolean {
    return this.activeSlideIndex > 0;
  }

  getPageIndicators(): number[] {
    const pageCount = Math.ceil((this.newsItems.length - this.itemsPerView + 1) / this.itemsPerView);
    return Array.from({ length: pageCount }, (_, i) => i);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MomentosDestacadosService } from '../../services/momentos-destacados.service';

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'vertical' | 'horizontal';
  category: string;
  position: number;
}

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-gallery.component.html',
  styleUrls: ['./photo-gallery.component.css']
})
export class PhotoGalleryComponent implements OnInit {
  selectedImage: GalleryItem | null = null;
  galleryItems: GalleryItem[] = [];
  isLoading = true;
  error = false;

  constructor(private momentosService: MomentosDestacadosService) {}

  ngOnInit(): void {
    this.loadMomentosDestacados();
  }

  private loadMomentosDestacados(): void {
    console.log('🔍 PhotoGallery: Iniciando carga de momentos destacados...');
    this.momentosService.getMomentosDestacadosConfig().subscribe({
      next: (response) => {
        console.log('✅ PhotoGallery: Respuesta recibida:', response);
        if (response.status === '1' && response.data?.imagenes && response.data.imagenes.length > 0) {
          console.log('📊 PhotoGallery: Imágenes encontradas:', response.data.imagenes.length);
          this.convertToGalleryItems(response.data.imagenes);
        } else {
          console.log('⚠️ PhotoGallery: No hay imágenes dinámicas, usando por defecto');
          // Si no hay imágenes dinámicas, mantener las por defecto
          this.loadDefaultItems();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ PhotoGallery: Error cargando momentos destacados:', error);
        this.loadDefaultItems(); // Cargar imágenes por defecto en caso de error
        this.isLoading = false;
        this.error = true;
      }
    });
  }

  private convertToGalleryItems(imagenes: any[]): void {
    const sizes: ('large' | 'vertical' | 'horizontal' | 'small' | 'medium')[] =
      ['large', 'vertical', 'small', 'horizontal', 'medium', 'small'];

    this.galleryItems = imagenes.map((imagen, index) => ({
      id: imagen.idImagen || index + 1,
      image: imagen.url,
      title: imagen.titulo || `Momento ${index + 1}`,
      size: sizes[index % sizes.length],
      category: imagen.descripcion || 'Momento Destacado',
      position: imagen.orden || index + 1
    }));
  }

  private loadDefaultItems(): void {
    this.galleryItems = [
      {
        id: 1,
        image: 'assets/images/noticia.png',
        title: 'Torneo Provincial 2024',
        size: 'large',
        category: 'Torneos',
        position: 1
      },
      {
        id: 2,
        image: 'assets/images/noticia.png',
        title: 'Club Universitario vs. Palermo',
        size: 'vertical',
        category: 'Partidos',
        position: 3
      },
      {
        id: 3,
        image: 'assets/images/noticia.png',
        title: 'Selección Juvenil',
        size: 'horizontal',
        category: 'Equipos',
        position: 4
      },
      {
        id: 4,
        image: 'assets/images/noticia.png',
        title: 'Entrenamiento Sub-16',
        size: 'small',
        category: 'Entrenamientos',
        position: 2
      },
      {
        id: 5,
        image: 'assets/images/noticia.png',
        title: 'Copa Jujuy 2025',
        size: 'medium',
        category: 'Eventos',
        position: 5
      },
      {
        id: 6,
        image: 'assets/images/noticia.png',
        title: 'Voleibol Playa Jujuy',
        size: 'small',
        category: 'Beach Volley',
        position: 6
      }
    ];
  }

  get sortedGalleryItems(): GalleryItem[] {
    return [...this.galleryItems].sort((a, b) => a.position - b.position);
  }

  openImage(item: GalleryItem): void {
    this.selectedImage = item;
  }

  closeImage(): void {
    this.selectedImage = null;
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Noticia } from '../../../models/noticia.model';
import { NoticiaService } from '../../../services/noticia.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-noticia-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './noticia-card.component.html',
  styleUrls: ['./noticia-card.component.css']
})
export class NoticiaCardComponent {
  @Input() noticia!: Noticia;
  @Input() vista: 'grid' | 'lista' | 'destacado' = 'grid';

  // Imagen por defecto en caso de error
  imagenPorDefecto = 'assets/images/noticia-placeholder.jpg';

  constructor(
    private noticiaService: NoticiaService,
    private authService: AuthService
  ) {}

  // Verificar si el usuario es administrador
  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.imagenPorDefecto;
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    return new Intl.DateTimeFormat('es', options).format(date);
  }

  // Generar la ruta amigable para la noticia de forma más robusta
  getNoticiaUrl(): string {
    if (!this.noticia || !this.noticia.idNoticia) {
      return '/noticias';
    }

    // Si la noticia tiene categoría, usar URL amigable
    if (this.noticia.categoria) {
      // Generar slug si no existe
      const slug = this.noticia.slug || this.noticiaService.generateSlug(this.noticia.titulo);

      // Limpiar la categoría para la URL
      const categoriaNormalizada = this.noticia.categoria.toLowerCase();

      return `/noticias/${categoriaNormalizada}/${slug}`;
    }

    // Si no hay datos suficientes, usar ID
    return `/noticias/ver/${this.noticia.idNoticia}`;
  }
}

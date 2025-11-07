import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NoticiaService } from '../../../services/noticia.service';
import { AuthService } from '../../../services/auth.service';
import { VistasNoticiaService } from '../../../services/vistas-noticia.service';
import { Noticia, NoticiasParams } from '../../../models/noticia.model';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { InfoIPComponent } from '../info-ip/info-ip.component';
import { ContadorVistasComponent } from '../contador-vistas/contador-vistas.component';

@Component({
  selector: 'app-detalle-noticia',
  standalone: true,
  imports: [CommonModule, RouterModule, InfoIPComponent, ContadorVistasComponent],
  templateUrl: './detalle-noticia.component.html',
  styleUrls: ['./detalle-noticia.component.css']
})
export class DetalleNoticiaComponent implements OnInit {
  noticia: Noticia | null = null;
  isLoading = true;
  error = '';
  isAdmin = false;

  // Noticias relacionadas y recientes
  noticiasRelacionadas: Noticia[] = [];
  noticiasRecientes: Noticia[] = [];

  // Imagen por defecto
  imagenPorDefecto = 'assets/images/noticia-placeholder.jpg';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public noticiaService: NoticiaService,
    private authService: AuthService,
    private vistasNoticiaService: VistasNoticiaService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['admin']);

    // Suscribirse a cambios en la URL para recargar cuando cambia la noticia
    this.route.paramMap.subscribe(params => {
      this.cargarNoticia();
    });
  }

  cargarNoticia(): void {
    this.isLoading = true;
    this.error = '';

    // Obtener parámetros de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    const slug = this.route.snapshot.paramMap.get('slug');
    const categoria = this.route.snapshot.paramMap.get('categoria');

    // Si tenemos ID, cargar por ID
    if (id) {
      this.cargarPorId(+id);
    }
    // Si tenemos slug y categoría, cargar por slug
    else if (slug && categoria) {
      this.cargarPorSlugYCategoria(slug, categoria);
    }
    // Si no hay parámetros suficientes, mostrar error
    else {
      this.isLoading = false;
      this.error = 'No se encontró la noticia solicitada';
    }
  }

  // Método para cargar noticia por ID
  private cargarPorId(id: number): void {
    this.noticiaService.getNoticia(id).subscribe({
      next: (response: any) => {
        this.noticia = response.noticia;
        this.isLoading = false;
        this.cargarNoticiasRelacionadas();
        this.cargarNoticiasRecientes();
        // Registrar vista automáticamente para TODOS los usuarios
        this.registrarVista();
      },
      error: (err: any) => this.manejarError(err)
    });
  }

  // Método para cargar noticia por slug y categoría
  private cargarPorSlugYCategoria(slug: string, categoriaStr: string): void {
    // Usamos getNoticias con filtros más genéricos, ya que 'slug' no es parte de NoticiasParams
    // Primero, tratamos de buscar noticias por categoría
    const params: NoticiasParams = {
      limit: 10
    };

    // Convertir la categoría string a la categoría esperada por el servicio (si es necesario)
    if (categoriaStr) {
      // @ts-ignore: Ignoramos temporalmente errores de tipo
      params.categoria = categoriaStr.toUpperCase();
    }

    this.noticiaService.getNoticias(params).subscribe({
      next: (response: any) => {
        if (response.noticias && response.noticias.length > 0) {
          // Buscar manualmente la noticia que coincida con el slug
          const noticiaEncontrada = response.noticias.find((noticia: Noticia) =>
            this.noticiaService.generateSlug(noticia.titulo) === slug || noticia.slug === slug
          );

          if (noticiaEncontrada) {
            this.noticia = noticiaEncontrada;
            this.isLoading = false;
            this.cargarNoticiasRelacionadas();
            this.cargarNoticiasRecientes();
            // Registrar vista automáticamente para TODOS los usuarios
            this.registrarVista();
          } else {
            this.manejarError({ status: 404 });
          }
        } else {
          this.manejarError({ status: 404 });
        }
      },
      error: (err: any) => this.manejarError(err)
    });
  }

  /**
   * Registra automáticamente la vista de la noticia para cualquier usuario
   * (logueado o no logueado)
   */
  private registrarVista(): void {
    if (!this.noticia?.idNoticia) {
      console.warn('No se puede registrar vista: ID de noticia no disponible');
      return;
    }

    this.vistasNoticiaService.registrarVista(this.noticia.idNoticia).subscribe({
      next: (response) => {
        // Actualizar el contador de vistas en la noticia si está disponible
        if (response.success && this.noticia) {
          this.noticia.vistas = (this.noticia.vistas || 0) + 1;
        }

        // Mostrar información de debug si es admin
        if (this.isAdmin) {
          this.mostrarDebugVistas();
        }
      },
      error: (error) => {
        // No mostrar error al usuario, solo log en consola
        console.log('Error registrando vista:', error);
      }
    });
  }

  /**
   * Muestra información de debug sobre las vistas almacenadas
   */
  private mostrarDebugVistas(): void {
    if (!this.noticia?.idNoticia) return;

    // Obtener vistas del localStorage para debug
    const STORAGE_KEY = 'noticia_vistas';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const todasLasVistas = JSON.parse(stored);
        const vistasDeEstaNoticia = todasLasVistas.filter((v: any) => v.noticiaId === this.noticia?.idNoticia);
        console.log(`Debug - Vistas almacenadas para noticia ${this.noticia.idNoticia}:`, vistasDeEstaNoticia);
        console.log(`Debug - Total de vistas en localStorage:`, todasLasVistas.length);
      }
    } catch (error) {
      console.error('Error leyendo vistas del localStorage para debug:', error);
    }
  }

  // Método para cargar noticias relacionadas
  private cargarNoticiasRelacionadas(): void {
    if (!this.noticia) return;

    const params: NoticiasParams = {
      limit: 4,
      estado: 'ACTIVO'
    };

    // Añadir la categoría si está disponible, con el tipo correcto
    if (this.noticia.categoria) {
      // @ts-ignore: Ignoramos temporalmente errores de tipo
      params.categoria = this.noticia.categoria;
    }

    // Evitar incluir la noticia actual
    if (this.noticia.idNoticia) {
      // @ts-ignore: Ignorar error por propiedad adicional
      params.idExcluir = this.noticia.idNoticia;
    }

    this.noticiaService.getNoticias(params).subscribe({
      next: (response: any) => {
        this.noticiasRelacionadas = response.noticias;
      },
      error: (err: any) => console.error('Error al cargar noticias relacionadas:', err)
    });
  }

  // Método para cargar noticias recientes
  private cargarNoticiasRecientes(): void {
    const params: NoticiasParams = {
      limit: 5,
      estado: 'ACTIVO'
    };

    // Evitar incluir la noticia actual
    if (this.noticia?.idNoticia) {
      // @ts-ignore: Ignorar error por propiedad adicional
      params.idExcluir = this.noticia.idNoticia;
    }

    this.noticiaService.getNoticias(params).subscribe({
      next: (response: any) => {
        this.noticiasRecientes = response.noticias;
      },
      error: (err: any) => console.error('Error al cargar noticias recientes:', err)
    });
  }

  manejarError(err: any): void {
    this.isLoading = false;
    if (err.status === 404) {
      this.error = 'La noticia solicitada no existe o ha sido eliminada.';
    } else {
      this.error = 'Ha ocurrido un error al cargar la noticia.';
    }
    console.error('Error al cargar noticia:', err);
  }

  // Método para cambiar estado (solo admin)
  cambiarEstado(estado: 'ACTIVO' | 'INACTIVO' | 'BORRADOR'): void {
    if (!this.noticia || !this.noticia.idNoticia) return;

    this.noticiaService.cambiarEstado(this.noticia.idNoticia, estado).subscribe({
      next: (response: any) => {
        this.noticia = response.noticia;
        alert(`Estado cambiado a: ${estado}`);
      },
      error: (err: any) => {
        console.error('Error al cambiar estado:', err);
        alert('Error al cambiar el estado de la noticia');
      }
    });
  }

  // Método para ir a editar la noticia
  irAEditar(): void {
    if (!this.noticia || !this.noticia.idNoticia) return;
    this.router.navigate(['/admin/noticias/editar', this.noticia.idNoticia]);
  }

  // Método para formatear fecha
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '-';

    const date = new Date(fecha);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    return new Intl.DateTimeFormat('es', options).format(date);
  }

  // Método para navegar entre noticias desde los paneles laterales
  navegarANoticia(): void {
    // Desplazarse al inicio de la página al hacer clic en un enlace de noticia
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Método para formatear fechas en formato corto
  formatearFechaCorta(fecha: string | undefined): string {
    if (!fecha) return '-';

    const date = new Date(fecha);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    return new Intl.DateTimeFormat('es', options).format(date);
  }

  // Gestionar renderizado de bloques
  getTextoProcesado(contenido: string): string {
    if (!contenido) return '';

    // Dividir por líneas vacías para crear párrafos
    return contenido
      .split('\n\n')
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // Manejar errores de carga de imágenes
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.imagenPorDefecto;
  }

  volver(): void {
    this.location.back();
  }
}

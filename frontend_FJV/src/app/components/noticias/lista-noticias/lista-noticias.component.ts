import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NoticiaService } from '../../../services/noticia.service';
import { AuthService } from '../../../services/auth.service';
import { Noticia, CategoriaOption, NoticiasParams } from '../../../models/noticia.model';
import { NoticiaCardComponent } from '../noticia-card/noticia-card.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-lista-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NoticiaCardComponent, NgbPaginationModule],
  templateUrl: './lista-noticias.component.html',
  styleUrls: ['./lista-noticias.component.css']
})
export class ListaNoticiasComponent implements OnInit {
  noticias: Noticia[] = [];
  destacadas: Noticia[] = [];
  categorias: CategoriaOption[] = [];

  // Parámetros de búsqueda y filtrado
  filtros: NoticiasParams = {
    estado: 'ACTIVO',
    page: 1,
    limit: 9
  };

  // Estado de carga
  isLoading = false;
  error = '';

  // Información de paginación
  totalItems = 0;
  totalPages = 0;

  // Vista de cuadrícula o lista
  vistaActual: 'grid' | 'lista' = 'grid';

  // Propiedad para verificar si es admin
  isAdmin: boolean = false;

  constructor(
    private noticiaService: NoticiaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verificar si el usuario es admin
    this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.rol?.nombre === 'admin';
    });

    this.cargarCategorias();
    this.cargarNoticias();
  }

  cargarCategorias(): void {
    this.noticiaService.getCategorias().subscribe({
      next: (response) => {
        this.categorias = response.categorias;
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  cargarNoticias(): void {
    this.isLoading = true;
    this.error = '';

    this.noticiaService.getNoticias(this.filtros).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.noticias = response.noticias;

        // Configurar paginación
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;

        // Si es la primera página, obtener destacadas
        if (this.filtros.page === 1 && !this.filtros.categoria) {
          this.cargarDestacadas();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.message || 'Error al cargar las noticias';
        console.error('Error al cargar noticias:', err);
      }
    });
  }

  cargarDestacadas(): void {
    this.noticiaService.getNoticias({
      estado: 'ACTIVO',
      destacado: true,
      limit: 3
    }).subscribe({
      next: (response) => {
        this.destacadas = response.noticias;
      },
      error: (err) => {
        console.error('Error al cargar noticias destacadas:', err);
      }
    });
  }

  // Método para cambiar de página
  cambiarPagina(pagina: number): void {
    this.filtros.page = pagina;
    this.cargarNoticias();
  }

  // Aplicar filtros
  aplicarFiltros(): void {
    this.filtros.page = 1; 
    this.cargarNoticias();
  }

  // Limpiar filtros
  limpiarFiltros(): void {
    this.filtros = {
      estado: 'ACTIVO',
      page: 1,
      limit: 9
    };
    this.cargarNoticias();
  }

  // Cambiar vista
  cambiarVista(vista: 'grid' | 'lista'): void {
    this.vistaActual = vista;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NoticiaService } from '../../../../services/noticia.service';
import { Noticia, CategoriaOption, NoticiasParams } from '../../../../models/noticia.model';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-lista-noticias-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbPaginationModule],
  templateUrl: './lista-noticias-admin.component.html',
  styleUrls: ['./lista-noticias-admin.component.css']
})
export class ListaNoticiasAdminComponent implements OnInit {
  noticias: Noticia[] = [];
  categorias: CategoriaOption[] = [];

  // Parámetros de búsqueda y filtrado
  filtros: NoticiasParams = {
    page: 1,
    limit: 10
  };

  // Estados disponibles
  estados = [
    { valor: '', etiqueta: 'Todos' },
    { valor: 'ACTIVO', etiqueta: 'Activo' },
    { valor: 'INACTIVO', etiqueta: 'Inactivo' },
    { valor: 'BORRADOR', etiqueta: 'Borrador' }
  ];

  // Estado de carga
  isLoading = false;
  error = '';

  // Información de paginación
  totalItems = 0;
  totalPages = 0;

  constructor(private noticiaService: NoticiaService) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarNoticias();
  }

  cargarCategorias(): void {
    this.noticiaService.getCategorias().subscribe({
      next: (response) => {
        this.categorias = [
          { valor: '' as any, etiqueta: 'Todas' },
          ...response.categorias
        ];
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  cargarNoticias(): void {
    this.isLoading = true;
    this.error = '';

    // Limpiar valores vacíos para evitar parámetros innecesarios
    const filtrosLimpios = Object.fromEntries(
      Object.entries(this.filtros).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );

    this.noticiaService.getNoticias(filtrosLimpios as NoticiasParams).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.noticias = response.noticias;

        // Configurar paginación
        this.totalItems = response.pagination.totalItems;
        this.totalPages = response.pagination.totalPages;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.message || 'Error al cargar las noticias';
        console.error('Error al cargar noticias:', err);
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
      page: 1,
      limit: 10
    };
    this.cargarNoticias();
  }

  // Cambiar estado de una noticia
  cambiarEstado(noticia: Noticia, nuevoEstado: 'ACTIVO' | 'INACTIVO' | 'BORRADOR'): void {
    if (!noticia.idNoticia) return;

    if (confirm(`¿Está seguro que desea cambiar el estado de la noticia "${noticia.titulo}" a ${nuevoEstado}?`)) {
      this.noticiaService.cambiarEstado(noticia.idNoticia, nuevoEstado).subscribe({
        next: (response) => {
          // Actualizar la noticia en la lista
          const index = this.noticias.findIndex(n => n.idNoticia === noticia.idNoticia);
          if (index !== -1) {
            this.noticias[index] = response.noticia;
          }
          alert(`Noticia ahora ${nuevoEstado.toLowerCase()}`);
        },
        error: (err) => {
          console.error('Error al cambiar estado:', err);
          alert('Error al cambiar el estado de la noticia');
        }
      });
    }
  }

  // Eliminar noticia
  eliminarNoticia(noticia: Noticia): void {
    if (!noticia.idNoticia) return;

    if (confirm(`¿Está seguro que desea eliminar permanentemente la noticia "${noticia.titulo}"? Esta acción no se puede deshacer.`)) {
      this.noticiaService.eliminarNoticia(noticia.idNoticia).subscribe({
        next: (response) => {
          // Eliminar la noticia de la lista
          this.noticias = this.noticias.filter(n => n.idNoticia !== noticia.idNoticia);
          alert('Noticia eliminada correctamente');
        },
        error: (err) => {
          console.error('Error al eliminar noticia:', err);
          alert('Error al eliminar la noticia');
        }
      });
    }
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '-';

    const date = new Date(fecha);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return new Intl.DateTimeFormat('es', options).format(date);
  }

  // Obtener clase CSS para el estado
  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'bg-success';
      case 'INACTIVO': return 'bg-danger';
      case 'BORRADOR': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  // Truncar texto largo
  truncarTexto(texto: string | undefined, longitud: number = 60): string {
    if (!texto) return '';
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
  }
}

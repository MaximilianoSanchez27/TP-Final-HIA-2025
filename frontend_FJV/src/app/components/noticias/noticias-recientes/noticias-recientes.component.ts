import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NoticiaService } from '../../../services/noticia.service';
import { Noticia } from '../../../models/noticia.model';
import { NoticiaCardComponent } from '../noticia-card/noticia-card.component';

@Component({
  selector: 'app-noticias-recientes',
  standalone: true,
  imports: [CommonModule, RouterModule, NoticiaCardComponent],
  templateUrl: './noticias-recientes.component.html',
  styleUrls: ['./noticias-recientes.component.css']
})
export class NoticiasRecientesComponent implements OnInit {
  @Input() titulo: string = 'Noticias Recientes';
  @Input() mostrarTodas: boolean = true;
  @Input() cantidadNoticias: number = 4;
  @Input() categoria?: string;
  @Input() mostrarDestacadas: boolean = true;

  noticias: Noticia[] = [];
  noticiaDestacada: Noticia | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(private noticiaService: NoticiaService) {}

  ngOnInit(): void {
    this.cargarNoticias();
  }

  cargarNoticias(): void {
    this.isLoading = true;
    this.error = null;

    // Parámetros para la consulta
    const params = {
      estado: 'ACTIVO',
      limit: this.cantidadNoticias,
      page: 1,
      categoria: this.categoria as any
    };

    this.noticiaService.getNoticias(params).subscribe({
      next: (response) => {
        this.noticias = response.noticias;

        // Si hay que mostrar destacadas y no hay noticias destacadas en los resultados,
        // buscar una noticia destacada
        if (this.mostrarDestacadas && !this.noticias.some(n => n.destacado)) {
          this.buscarNoticiaDestacada();
        } else if (this.mostrarDestacadas) {
          // Si hay una destacada entre los resultados, usarla y quitarla de la lista principal
          const destacadaIndex = this.noticias.findIndex(n => n.destacado);
          if (destacadaIndex !== -1) {
            this.noticiaDestacada = this.noticias.splice(destacadaIndex, 1)[0];
          }
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las noticias';
        this.isLoading = false;
        console.error('Error al cargar noticias recientes:', err);
      }
    });
  }

  buscarNoticiaDestacada(): void {
    const params = {
      estado: 'ACTIVO',
      destacado: true,
      limit: 1,
      categoria: this.categoria as any
    };

    this.noticiaService.getNoticias(params).subscribe({
      next: (response) => {
        if (response.noticias.length > 0) {
          this.noticiaDestacada = response.noticias[0];
        }
      },
      error: (err) => console.error('Error al buscar noticia destacada:', err)
    });
  }
}

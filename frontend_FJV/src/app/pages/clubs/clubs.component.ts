import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Club } from '../../interfaces/club.interface';
import { ClubService } from '../../services/club.service';
import { ListadoClubesComponent } from './components/listado-clubes/listado-clubes.component';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule, ListadoClubesComponent],
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css']
})
export class ClubsComponent implements OnInit {
  clubes: Club[] = [];
  clubParaEditar: Club | null = null;
  mostrarModalEdicion = false;
  loading = false;

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.cargarClubes();
  }

  cargarClubes(): void {
    this.loading = true;
    this.clubService.getClubes().subscribe({
      next: (clubes) => {
        this.clubes = clubes;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar clubes:', error);
        this.loading = false;
      }
    });
  }

  onEditClub(club: Club): void {
    this.clubParaEditar = club;
    this.mostrarModalEdicion = true;
  }

  abrirModalCreacion(): void {
    this.clubParaEditar = null;
    this.mostrarModalEdicion = true;
  }

  cerrarModal(): void {
    this.mostrarModalEdicion = false;
    this.clubParaEditar = null;
  }

  onEliminarClub(idClub: number): void {
    if (confirm('¿Está seguro de que desea eliminar este club?')) {
      this.clubService.deleteClub(idClub).subscribe({
        next: () => {
          console.log('Club eliminado exitosamente');
          this.cargarClubes();
        },
        error: (error) => {
          console.error('Error al eliminar club:', error);
          alert('Error al eliminar el club');
        }
      });
    }
  }

  onGuardarClub(club: Club): void {
    console.log('Club guardado:', club);
    this.cerrarModal();
    this.cargarClubes();
  }

  onCancelarEdicion(): void {
    this.cerrarModal();
  }
}

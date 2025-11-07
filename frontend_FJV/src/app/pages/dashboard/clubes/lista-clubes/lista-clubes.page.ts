import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubService } from '../../../../services/club.service';
import { Club } from '../../../../interfaces/club.interface';
import { ClubFilter } from '../../../../services/club.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-lista-clubes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lista-clubes.page.html',
  styleUrls: ['./lista-clubes.page.css']
})
export class ListaClubesPage implements OnInit {
  clubes: Club[] = [];
  filteredClubes: Club[] = [];
  isLoading = true;
  errorMessage = '';
  filterParams: ClubFilter = {};

  // Estados de afiliación para el filtro select
  estadosAfiliacion = ['Activo', 'Inactivo', 'Suspendido'];

  constructor(private clubService: ClubService) { }

  ngOnInit(): void {
    this.cargarClubes();
  }

  cargarClubes(): void {
    this.isLoading = true;
    this.clubService.getClubes().subscribe({
      next: (data) => {
        this.clubes = data;
        this.filteredClubes = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar clubes: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.isLoading = true;
    this.clubService.filterClubes(this.filterParams).subscribe({
      next: (data) => {
        this.filteredClubes = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al filtrar clubes: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filterParams = {};
    this.filteredClubes = this.clubes;
  }

  eliminarClub(id: number): void {
    if (confirm('¿Está seguro que desea eliminar este club? Esta acción no se puede deshacer.')) {
      this.clubService.deleteClub(id).subscribe({
        next: (response) => {
          if (response.status === "1") {
            this.cargarClubes();
            alert(response.msg);
          }
        },
        error: (error) => {
          alert(`Error al eliminar el club: ${error.error?.msg || error.message}`);
        }
      });
    }
  }

  getLogoUrl(club: Club): string {
    if (club.logo) {
      // Si el logo ya incluye la URL base completa
      if (club.logo.startsWith('http')) {
        return club.logo;
      }
      // Si es una ruta relativa, construir la URL completa usando environment
      return `${environment.apiUrl.replace('/api', '')}${club.logo}`;
    }
    return '';
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary';

    switch (estado.toLowerCase()) {
      case 'activo':
        return 'bg-success';
      case 'suspendido':
        return 'bg-warning text-dark';
      case 'inactivo':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }
}

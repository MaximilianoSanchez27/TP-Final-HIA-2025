import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClubService } from '../../../../services/club.service';
import { Club } from '../../../../interfaces/club.interface';
import { CobroService, Cobro } from '../../../../services/cobro.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { GenerarCobroComponent } from '../../components/generar-cobro/generar-cobro.component';

@Component({
  selector: 'app-detalle-club',
  standalone: true,
  imports: [CommonModule, RouterModule, GenerarCobroComponent],
  templateUrl: './detalle-club.page.html',
  styleUrls: ['./detalle-club.page.css']
})
export class DetalleClubPage implements OnInit {
  club: Club | null = null;
  cobros: Cobro[] = [];
  isLoading = true;
  isLoadingCobros = false;
  errorMessage = '';
  showCobroModal = false;

  badgeClasses: {[key: string]: string} = {
    'Activo': 'bg-success',
    'Suspendido': 'bg-warning',
    'Inactivo': 'bg-secondary'
  };

  cobroBadgeClasses: {[key: string]: string} = {
    'Pendiente': 'bg-warning',
    'Pagado': 'bg-success',
    'Vencido': 'bg-danger',
    'Anulado': 'bg-secondary'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clubService: ClubService,
    private cobroService: CobroService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (isNaN(id)) {
          return of(null);
        }
        return this.clubService.getClub(id);
      })
    ).subscribe({
      next: (club) => {
        this.isLoading = false;
        if (!club) {
          this.errorMessage = 'No se encontró el club solicitado';
          return;
        }
        this.club = club;
        this.cargarCobrosDelClub();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Error al cargar el club: ${error.message}`;
      }
    });
  }

  cargarCobrosDelClub(): void {
    if (!this.club?.idClub) return;

    this.isLoadingCobros = true;

    // Usar el servicio real para cargar cobros del club
    this.cobroService.getCobrosByClub(this.club.idClub)
      .subscribe({
        next: (cobros) => {
          this.cobros = cobros;
          this.isLoadingCobros = false;
        },
        error: (error) => {
          console.error('Error al cargar cobros:', error);
          this.isLoadingCobros = false;
          this.cobros = []; // Inicializamos como array vacío para evitar errores en la vista
        }
      });
  }

  mostrarFormularioCobro(): void {
    this.showCobroModal = true;
    document.body.classList.add('modal-open');
  }

  cerrarFormularioCobro(): void {
    this.showCobroModal = false;
    document.body.classList.remove('modal-open');
  }

  onCobroGenerado(cobro: Cobro): void {
    this.cerrarFormularioCobro();
    this.cargarCobrosDelClub();
    // Opcional: Mostrar mensaje de éxito
    alert(`Cobro por $${cobro.monto} generado con éxito.`);
  }

  marcarComoPagado(idCobro: number): void {
    if (confirm('¿Está seguro que desea marcar este cobro como pagado?')) {
      // Usar la API para actualizar el estado del cobro
      this.cobroService.cambiarEstadoCobro(idCobro, 'Pagado')
        .subscribe({
          next: (response) => {
            if (response.status === "1") {
              alert(response.msg || 'Cobro marcado como pagado con éxito');
              this.cargarCobrosDelClub();
            } else {
              alert('No se pudo actualizar el estado del cobro');
            }
          },
          error: (error) => {
            alert(`Error: ${error.error?.msg || 'No se pudo actualizar el cobro'}`);
          }
        });
    }
  }

  eliminarClub(): void {
    if (!this.club?.idClub) return;

    if (confirm('¿Está seguro que desea eliminar este club? Esta acción no se puede deshacer.')) {
      this.clubService.deleteClub(this.club.idClub).subscribe({
        next: (response) => {
          if (response.status === "1") {
            alert('Club eliminado con éxito');
            this.router.navigate(['/dashboard/clubes']);
          }
        },
        error: (error) => {
          alert(`Error al eliminar el club: ${error.error?.msg || error.message}`);
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['/dashboard/clubes']);
  }
}

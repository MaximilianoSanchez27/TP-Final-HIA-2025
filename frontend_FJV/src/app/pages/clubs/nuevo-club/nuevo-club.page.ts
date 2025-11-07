import { Component, OnInit } from '@angular/core';
import { FormularioClubComponent } from '../components/formulario-club/formulario-club.component';
import { Club } from '../../../interfaces/club.interface';
import { ClubService } from '../../../services/club.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-nuevo-club-page',
  standalone: true,
  imports: [CommonModule, FormularioClubComponent],
  template: `
    <div class="container my-4">
      <app-formulario-club
        [clubParaEditar]="clubParaEditar"
        (guardarClub)="onGuardarClub($event)">
      </app-formulario-club>
    </div>
  `,
  styles: []
})
export class NuevoClubPage implements OnInit {
  clubParaEditar: Club | null = null;

  constructor(
    private clubService: ClubService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const clubId = this.route.snapshot.paramMap.get('id');
    if (clubId) {
      this.clubService.getClub(+clubId).subscribe({
        next: (club: Club) => this.clubParaEditar = club,
        error: (err: any) => {
          console.error('Error al cargar el club para editar:', err);
          this.router.navigate(['/clubs/listado']);
        }
      });
    }
  }

  onGuardarClub(club: Club): void {
    if (club.fechaAfiliacion && typeof club.fechaAfiliacion === 'object') {
      const ngbDate = club.fechaAfiliacion as NgbDateStruct;
      club.fechaAfiliacion = `${ngbDate.year}-${String(ngbDate.month).padStart(2, '0')}-${String(ngbDate.day).padStart(2, '0')}`;
    }

    const operation = club.idClub
      ? this.clubService.updateClub(club.idClub, club)
      : this.clubService.createClub(club);

    operation.subscribe({
      next: () => {
        alert(`Club ${club.idClub ? 'actualizado' : 'agregado'} con éxito!`);
        this.router.navigate(['/clubs/listado']);
      },
      error: (err: any) => {
        console.error(`Error al ${club.idClub ? 'actualizar' : 'agregar'} club:`, err);
        alert(`Error al ${club.idClub ? 'actualizar' : 'agregar'} el club. Por favor, intente de nuevo.`);
      }
    });
  }
}

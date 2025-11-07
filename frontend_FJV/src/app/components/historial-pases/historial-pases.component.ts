import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pase } from '../../interfaces/pase.interface';
import { PaseService } from '../../services/pase.service';

@Component({
  selector: 'app-historial-pases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-pases.component.html',
  styleUrls: ['./historial-pases.component.css']
})
export class HistorialPasesComponent implements OnInit, OnChanges {
  @Input() idPersona: number | null = null;
  @Input() mostrarTitulo: boolean = true;
  @Input() maxPases: number = 10;

  pases: Pase[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private paseService: PaseService) {}

  ngOnInit(): void {
    if (this.idPersona) {
      this.cargarPases();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idPersona'] && this.idPersona) {
      this.cargarPases();
    }
  }

  cargarPases(): void {
    if (!this.idPersona) return;

    this.isLoading = true;
    this.error = null;

    this.paseService.getPasesByPersona(this.idPersona).subscribe({
      next: (pases) => {
        this.pases = pases.slice(0, this.maxPases);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el historial de pases';
        this.isLoading = false;
        console.error('Error al cargar pases:', err);
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'HABILITADO':
        return 'badge bg-success';
      case 'PENDIENTE':
        return 'badge bg-warning';
      case 'RECHAZADO':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

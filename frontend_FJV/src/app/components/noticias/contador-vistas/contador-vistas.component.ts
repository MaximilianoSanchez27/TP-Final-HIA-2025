import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { VistasNoticiaService } from '../../../services/vistas-noticia.service';

@Component({
  selector: 'app-contador-vistas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contador-vistas">
      <div class="vista-count">
        <i class="fas fa-eye me-1"></i>
        <span class="count-number">{{ totalVistas }}</span>
        <span class="count-label">vistas</span>
      </div>

      <div class="vista-info" *ngIf="mostrarInfo">
        <small class="text-muted">
          Última actualización: {{ ultimaActualizacion | date:'HH:mm:ss' }}
        </small>
      </div>
    </div>
  `,
  styles: [`
    .contador-vistas {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .vista-count {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 1.1rem;
    }

    .count-number {
      font-weight: bold;
      color: #007bff;
      font-size: 1.2rem;
    }

    .count-label {
      color: #666;
      font-size: 0.9rem;
    }

    .vista-info {
      font-size: 0.8rem;
    }

    .vista-count i {
      color: #007bff;
    }
  `]
})
export class ContadorVistasComponent implements OnInit, OnDestroy {
  @Input() noticiaId!: number;
  @Input() mostrarInfo = false;
  @Input() actualizarEnTiempoReal = false;
  @Input() intervaloActualizacion = 30000; // 30 segundos por defecto
  @Input() vistasNoticia?: number; // Nuevo input para recibir las vistas de la noticia

  totalVistas = 0;
  ultimaActualizacion = new Date();
  loading = false;
  error = '';

  private subscriptions = new Subscription();

  constructor(private vistasNoticiaService: VistasNoticiaService) {}

  ngOnInit(): void {
    // Si tenemos las vistas de la noticia, usarlas directamente
    if (this.vistasNoticia !== undefined) {
      this.totalVistas = this.vistasNoticia;
      this.ultimaActualizacion = new Date();
    } else if (this.noticiaId) {
      // Si no tenemos las vistas, intentar obtenerlas del backend
      this.cargarVistas();

      if (this.actualizarEnTiempoReal) {
        this.iniciarActualizacionAutomatica();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  cargarVistas(): void {
    this.loading = true;
    this.error = '';

    const sub = this.vistasNoticiaService.getTotalVistas(this.noticiaId).subscribe({
      next: (total) => {
        this.totalVistas = total;
        this.ultimaActualizacion = new Date();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });

    this.subscriptions.add(sub);
  }

  private iniciarActualizacionAutomatica(): void {
    const intervalSub = interval(this.intervaloActualizacion).subscribe(() => {
      this.cargarVistas();
    });

    this.subscriptions.add(intervalSub);
  }

  // Método público para actualizar manualmente
  actualizar(): void {
    this.cargarVistas();
  }

  // Método para actualizar las vistas cuando cambian
  actualizarVistas(nuevasVistas: number): void {
    this.totalVistas = nuevasVistas;
    this.ultimaActualizacion = new Date();
  }
}

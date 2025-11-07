import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { IPGuideService } from '../../../services/ip-guide.service';
import { AuthService } from '../../../services/auth.service';
import { IPInfo } from '../../../models/ip-guide.model';

@Component({
  selector: 'app-info-ip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Solo mostrar si el usuario es administrador -->
    <div class="info-ip-container" *ngIf="isAdmin">
      <h4>Información de tu ubicación</h4>

      <div class="ip-info" *ngIf="ipInfo && ipInfo.ubicacion">
        <div class="info-row" *ngIf="ipInfo.ubicacion.ciudad || ipInfo.ubicacion.pais">
          <span class="label">Ubicación:</span>
          <span class="value">{{ formatLocation(ipInfo.ubicacion) }}</span>
        </div>

        <div class="info-row" *ngIf="ipInfo.red?.sistemaAutonomo?.nombre || ipInfo.red?.sistemaAutonomo?.asn">
          <span class="label">Proveedor:</span>
          <span class="value">{{ formatASN(ipInfo.red.sistemaAutonomo) }}</span>
        </div>

        <div class="info-row" *ngIf="ipInfo.red?.cidr">
          <span class="label">Red:</span>
          <span class="value">{{ ipInfo.red.cidr }}</span>
        </div>

        <!-- Mostrar IP completa -->
        <div class="info-row">
          <span class="label">IP:</span>
          <span class="value">{{ ipInfo.ip }}</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Obteniendo información de tu ubicación...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>Error: {{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .info-ip-container {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #007bff;
    }

    .info-ip-container h4 {
      color: #333;
      margin: 0 0 15px 0;
      font-size: 1.1rem;
    }

    .ip-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
    }

    .label {
      font-weight: 500;
      color: #666;
      font-size: 0.9rem;
    }

    .value {
      color: #333;
      font-size: 0.9rem;
      text-align: right;
      word-break: break-all;
    }

    .loading,
    .error {
      text-align: center;
      padding: 10px;
      color: #666;
      font-size: 0.9rem;
    }

    .error {
      color: #dc3545;
    }

    @media (max-width: 768px) {
      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .value {
        text-align: left;
      }
    }
  `]
})
export class InfoIPComponent implements OnInit, OnDestroy {
  ipInfo: IPInfo | null = null;
  loading = false;
  error = '';
  isAdmin = false;

  private subscription = new Subscription();

  constructor(
    private ipGuideService: IPGuideService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verificar si el usuario es administrador
    this.subscription.add(
      this.authService.isAdmin$.subscribe(isAdmin => {
        this.isAdmin = isAdmin;
        // Solo cargar información de IP si es admin
        if (isAdmin) {
          this.obtenerInfoIP();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  obtenerInfoIP(): void {
    this.loading = true;
    this.error = '';

    const sub = this.ipGuideService.getCurrentIPInfo().subscribe({
      next: (response) => {
        if (response.success && 'ip' in response.data) {
          this.ipInfo = response.data as IPInfo;
        } else {
          this.error = 'No se pudo obtener información de ubicación';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Error al obtener información de IP';
        this.loading = false;
      }
    });

    this.subscription.add(sub);
  }

  formatLocation(ubicacion: any): string {
    return this.ipGuideService.formatLocationDisplay(ubicacion);
  }

  formatASN(sistemaAutonomo: any): string {
    return this.ipGuideService.formatASNDisplay(sistemaAutonomo);
  }
}

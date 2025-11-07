import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-5 text-center">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-body p-5">
              <div class="text-danger mb-4">
                <i class="fas fa-exclamation-triangle fa-5x"></i>
              </div>
              <h2 class="card-title mb-4">Acceso Denegado</h2>
              <p class="card-text fs-5">
                No tienes los permisos necesarios para acceder a esta página.
              </p>
              <p class="text-muted">
                Si crees que esto es un error, por favor contacta al administrador.
              </p>
              <div class="d-flex justify-content-center mt-4">
                <a routerLink="/" class="btn btn-outline-primary me-3">
                  <i class="fas fa-home me-2"></i> Ir al inicio
                </a>
                <a routerLink="/auth/login" class="btn btn-primary">
                  <i class="fas fa-sign-in-alt me-2"></i> Iniciar sesión
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 10px;
    }
    .text-danger {
      color: var(--error-color);
    }
  `]
})
export class UnauthorizedPage {}

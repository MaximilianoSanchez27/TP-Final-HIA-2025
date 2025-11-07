import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow">
            <div class="card-body p-5 text-center">
              @if (isProcessing) {
                <div>
                  <div class="spinner-border text-primary mb-4" role="status">
                    <span class="visually-hidden">Procesando autenticación...</span>
                  </div>
                  <h3 class="mb-3">Procesando autenticación</h3>
                  <p class="text-muted">Por favor espere mientras completamos su inicio de sesión...</p>
                </div>
              } @else if (error) {
                <div>
                  <div class="text-danger mb-4">
                    <i class="fas fa-exclamation-circle fa-4x"></i>
                  </div>
                  <h3 class="mb-3">Error de autenticación</h3>
                  <p class="mb-4">{{error}}</p>
                  <a routerLink="/auth/login" class="btn btn-primary">
                    Volver al inicio de sesión
                  </a>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border-radius: 10px;
      border: none;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  isProcessing = true;
  error: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Procesar los parámetros de URL para extraer token y datos de usuario
    this.processAuthParams();
  }

  private processAuthParams(): void {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);

    // Verificar si hay error
    if (urlParams.has('error')) {
      const errorMsg = urlParams.get('error') || 'Error desconocido';
      this.error = decodeURIComponent(errorMsg);
      this.isProcessing = false;

      // Si estamos en una ventana emergente, enviar mensaje a ventana padre
      if (window.opener) {
        window.opener.postMessage({
          type: 'AUTH_ERROR',
          error: this.error
        }, window.location.origin);

        setTimeout(() => window.close(), 300);
      }

      return;
    }

    // Verificar si hay token y datos de usuario
    const token = urlParams.get('token');
    const userDataStr = urlParams.get('userData');
    const success = urlParams.get('success');

    if (token && userDataStr && success === 'true') {
      try {
        // Decodificar datos de usuario (podría estar codificado)
        let userDataDecoded = decodeURIComponent(userDataStr);
        // En algunos casos podría estar doblemente codificado
        if (userDataDecoded.includes('%')) {
          try {
            userDataDecoded = decodeURIComponent(userDataDecoded);
          } catch (e) {
            console.warn('No se pudo decodificar doblemente userDataStr');
          }
        }

        const userData = JSON.parse(userDataDecoded);

        // Si estamos en una ventana emergente, enviar mensaje a ventana padre
        if (window.opener) {
          window.opener.postMessage({
            type: 'AUTH_SUCCESS',
            token,
            user: userData
          }, window.location.origin);

          setTimeout(() => window.close(), 300);
        } else {
          // Si no hay ventana padre, completar autenticación directamente
          this.authService.completeSocialAuth(token, userData);
          this.router.navigate([userData.rol?.nombre === 'admin' ? '/dashboard' : '/']);
        }
      } catch (error) {
        console.error('Error procesando datos de usuario:', error);
        this.error = 'Error al procesar los datos de autenticación';
        this.isProcessing = false;
      }
    } else {
      this.error = 'Respuesta de autenticación incompleta o incorrecta';
      this.isProcessing = false;
    }
  }
}

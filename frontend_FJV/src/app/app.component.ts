import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NotificationToastComponent],
  template: `
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>

    <!-- Notificaciones Toast - Se muestran en toda la aplicación -->
    <app-notification-toast></app-notification-toast>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Federación Jujeña de Voleibol';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Verificar si hay tokens en la URL (esto maneja autenticación en raíz)
    this.processAuthParamsInUrl();
  }

  private processAuthParamsInUrl(): void {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userDataStr = urlParams.get('userData');
    const success = urlParams.get('success');
    const provider = urlParams.get('provider') || 'unknown';

    // Si hay token y datos de usuario, intentar autenticación
    if (token && userDataStr && success === 'true') {
      console.log(`Detectados parámetros de autenticación de ${provider} en URL raíz`);
      try {
        // Decodificar datos de usuario
        let userDataDecoded = decodeURIComponent(userDataStr);
        // En algunos casos podría estar doblemente codificado
        try {
          if (userDataDecoded.includes('%')) {
            userDataDecoded = decodeURIComponent(userDataDecoded);
          }
        } catch (e) {
          console.warn('No se pudo decodificar doblemente userDataStr');
        }

        const userData = JSON.parse(userDataDecoded);
        // Completar la autenticación
        this.authService.completeSocialAuth(token, userData);

        // Limpiar URL sin recargar la página
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error procesando datos de autenticación:', error);
      }
    } else if (success === 'false' && urlParams.get('error')) {
      // Procesar error
      this.authService.checkAuthErrorInUrl();
    }
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.css']
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showPassword = false;
  returnUrl: string = '/';
  isSocialAuthInProgress = false;
  subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    // Inicializar el formulario
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });

    // Obtener URL de retorno si existe
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
    });

    // Verificar si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    // Suscribirse al estado de autenticación social
    this.subscriptions.push(
      this.authService.socialAuthInProgress$.subscribe(
        inProgress => this.isSocialAuthInProgress = inProgress
      )
    );

    // Suscribirse a errores de autenticación social
    this.subscriptions.push(
      this.authService.socialAuthError$.subscribe(
        error => {
          if (error) {
            console.log('Error de autenticación social recibido:', error);
            // Modificar los mensajes para eliminar sugerencias de registro y manejar errores de LinkedIn
            if (error.includes('no encontrado') || error.includes('not found')) {
              this.errorMessage = 'No se encontró ninguna cuenta asociada con esa dirección de correo.';
            } else if (error.includes('user_cancelled_login') || error.includes('canceled')) {
              this.errorMessage = 'Se canceló el proceso de autenticación.';
            } else if (error.includes('access_denied')) {
              this.errorMessage = 'No se concedieron los permisos necesarios para iniciar sesión.';
            } else {
              this.errorMessage = error;
            }
          }
        }
      )
    );

    // Comprobar parámetros de error en URL (esto se ejecuta al cargar la página)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');

    if (success === 'false' && error) {
      const decodedError = decodeURIComponent(error);
      if (decodedError.includes('no encontrado') || decodedError.includes('not found')) {
        this.errorMessage = 'No se encontró ninguna cuenta asociada con esa dirección de correo.';
      } else {
        this.errorMessage = decodedError;
      }
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkErrorInUrl(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
      this.errorMessage = decodeURIComponent(error);

      // Limpiar parámetros de URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (user) => {
        this.isSubmitting = false;
        console.log('Login exitoso:', user);

        // Redireccionar basado en el rol
        if (user.rol.nombre === 'admin') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message || 'Error al iniciar sesión. Verifique sus credenciales.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Métodos para autenticación con redes sociales
  loginWithGoogle(): void {
    this.errorMessage = '';
    this.authService.loginWithGoogle();
  }

  loginWithLinkedIn(): void {
    this.errorMessage = '';
    this.authService.loginWithLinkedIn();
  }

  clearError(): void {
    this.errorMessage = '';
  }

  // Getters para facilitar el acceso a los campos del formulario en el template
  get passwordControl() {
    return this.loginForm.get('password');
  }

  get emailControl() {
    return this.loginForm.get('email');
  }
}

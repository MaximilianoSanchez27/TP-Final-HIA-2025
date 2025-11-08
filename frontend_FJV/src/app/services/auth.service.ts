import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rolId?: number; 
  rol: {
    id: number;
    nombre: string;
    descripcion: string;
  };
  fotoPerfil?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;
  googleId?: string;
  providerType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  usuario: User;
  token: string;
}

export interface TokenValidationResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly TOKEN_EXPIRATION_KEY = 'auth_token_expiration';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Para seguimiento del proceso de autenticación social
  private socialAuthInProgressSubject = new BehaviorSubject<boolean>(false);
  public socialAuthInProgress$ = this.socialAuthInProgressSubject.asObservable();

  // Para manejar errores de autenticación social
  private socialAuthErrorSubject = new BehaviorSubject<string | null>(null);
  public socialAuthError$ = this.socialAuthErrorSubject.asObservable();

  // Referencia a la ventana emergente de autenticación
  private socialAuthWindow: Window | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);
      const expirationStr = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);

      if (token && userStr) {
        // Verificar si el token ha expirado
        if (expirationStr) {
          const expiration = new Date(expirationStr);
          if (expiration <= new Date()) {
            // Token expirado, limpiamos y salimos
            console.log('Token expirado localmente, cerrando sesión');
            this.clearAuthData();
            return;
          }
        }

        // Si el token no ha expirado localmente, restauramos el estado
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);

        // Validamos el token con el servidor
        this.validateToken().subscribe({
          error: (err) => {
            console.error('Error validando token:', err);
            this.clearAuthData();
          }
        });
      }
    } catch (error) {
      console.error('Error cargando datos de usuario desde localStorage', error);
      this.clearAuthData();
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRATION_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  login(email: string, password: string): Observable<User> {
  console.log('🔍 URL final de login:', `${this.API_URL}/auth/login`.trim());

  return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`.trim(), { email, password })
    .pipe(   // 👈 sin el punto y coma antes
      tap(response => {
        if (response.success && response.token) {
          this.storeAuthData(response.token, response.usuario);
          this.currentUserSubject.next(response.usuario);
          this.isAuthenticatedSubject.next(true);
        }
      }),
      map(response => response.usuario),
      catchError(error => {
        console.error('Error en el login', error);
        return throwError(() =>
          new Error(error.error?.message || 'Error al iniciar sesión')
        );
      })
    );
}

  private storeAuthData(token: string, user: User): void {
    // Almacenar el token y el usuario
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    // Calcular y almacenar la fecha de expiración (ejemplo: 1 hora)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);
    localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationDate.toISOString());
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Verificar expiración local
    const expirationStr = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);
    if (expirationStr) {
      const expiration = new Date(expirationStr);
      if (expiration <= new Date()) {
        this.clearAuthData();
        return false;
      }
    }

    return true;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.clearAuthData();
      return of(false);
    }

    return this.http.get<TokenValidationResponse>(`/api/auth/validate-token`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Actualizar el usuario y renovar el token (si el backend lo proporciona)
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);

            // Si la respuesta incluye un nuevo token, actualizar
            if (response.token) {
              this.storeAuthData(response.token, response.user);
            } else {
              // Si no hay nuevo token, solo actualizamos el usuario
              localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
            }
          } else {
            this.clearAuthData();
          }
        }),
        map(response => response.success),
        catchError(error => {
          console.error('Token inválido o expirado', error);
          this.clearAuthData();
          return of(false);
        })
      );
  }

  checkToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    return this.http.get<{valid: boolean, message: string, token?: string}>(`/api/auth/check-token`)
      .pipe(
        tap(response => {
          // Si la respuesta incluye un nuevo token, actualizar
          if (response.token) {
            localStorage.setItem(this.TOKEN_KEY, response.token);

            // Actualizar la expiración
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 1);
            localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationDate.toISOString());
          }
        }),
        map(response => response.valid),
        catchError(() => {
          this.clearAuthData();
          return of(false);
        })
      );
  }

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.rol) return false;
    return roles.includes(user.rol.nombre);
  }

  /**
   * Inicia el proceso de autenticación con Google directamente en la misma página
   */
  loginWithGoogle(): void {
    this.socialAuthInProgressSubject.next(true);
    this.socialAuthErrorSubject.next(null);

    // Almacenar URL de retorno antes de la redirección
    sessionStorage.setItem('auth_redirect', window.location.href);

    // Redirigir directamente al endpoint de autenticación con Google
    // Especificamos la URL de frontend completa para callback
    window.location.href = `/api/auth/google`;
  }

  /**
   * Inicia el proceso de autenticación con LinkedIn directamente en la misma página
   */
  loginWithLinkedIn(): void {
    this.socialAuthInProgressSubject.next(true);
    this.socialAuthErrorSubject.next(null);

    // Almacenar URL de retorno antes de la redirección
    sessionStorage.setItem('auth_redirect', window.location.href);

    // Redirigir directamente al endpoint de autenticación con LinkedIn
    window.location.href = `/api/auth/linkedin`;
  }

  /**
   * Verifica si hay errores de autenticación en la URL y los procesa
   */
  checkAuthErrorInUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const provider = urlParams.get('provider') || 'unknown';

    // Procesar resultado de autenticación social en URL
    if (success === 'false' && error) {
      let decodedError = decodeURIComponent(error);

      // Modificar mensaje de error para no sugerir registro
      if (decodedError.includes('no encontrado') || decodedError.includes('not found')) {
        decodedError = 'No se encontró ninguna cuenta asociada con esa dirección de correo.';
      } else if (decodedError.includes('user_cancelled_login') || decodedError.includes('canceled')) {
        decodedError = 'Se canceló el proceso de autenticación.';
      } else if (decodedError.includes('access_denied')) {
        decodedError = 'No se concedieron los permisos necesarios para iniciar sesión.';
      }

      console.log(`Error de autenticación con ${provider}: ${decodedError}`);

      this.socialAuthInProgressSubject.next(false);
      this.socialAuthErrorSubject.next(decodedError);

      // Limpiar URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);

      // Si el usuario no está en la página de login, redirigimos
      if (window.location.pathname !== '/auth/login') {
        this.router.navigate(['/auth/login']);
      }

      return decodedError;
    } else if (success === 'true') {
      // Autenticación exitosa, será manejada por processAuthParamsInUrl en AppComponent
      this.socialAuthInProgressSubject.next(false);
    }

    return null;
  }

  /**
   * Completa el proceso de autenticación social
   * Esta función espera un token y datos de usuario codificados correctamente
   */
  completeSocialAuth(token: string, userData: User): void {
    const provider = userData.providerType || 'desconocido';

    console.log(`Completando autenticación social con ${provider}`, {
      token: token?.substring(0, 10) + '...',
      user: userData
    });

    // Validar que tengamos los datos mínimos necesarios
    if (!token || !userData) {
      this.socialAuthErrorSubject.next('Datos de autenticación incompletos');
      return;
    }

    try {
      // Asegurar que el objeto user tenga un rol válido
      if (!userData.rol) {
        console.warn('Usuario sin rol asignado, utilizando rol por defecto');
        userData.rol = {
          id: 0,
          nombre: 'usuario',
          descripcion: 'Usuario estándar'
        };
      }

      // Almacenar datos de autenticación
      this.storeAuthData(token, userData);
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      this.socialAuthInProgressSubject.next(false);

      // Redirigir basado en el rol
      const redirectUrl = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');

      console.log('Autenticación completada. Redirigiendo a:',
        userData.rol.nombre === 'admin' ? '/dashboard' : redirectUrl);

      if (userData.rol.nombre === 'admin') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigateByUrl(redirectUrl);
      }

    } catch (error) {
      console.error('Error en completeSocialAuth:', error);
      this.socialAuthErrorSubject.next('Error al procesar los datos de autenticación');
    }
  }

  // Agregamos el método isAdmin$ como un Observable derivado
  get isAdmin$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user !== null && user.rol?.nombre === 'admin')
    );
  }
}


import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { routes } from './app.routes';
import { catchError, throwError } from 'rxjs';

// Creamos un interceptor más simple que no cause dependencias circulares
const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtenemos el token del localStorage directamente en lugar de usar el servicio
  const token = localStorage.getItem('auth_token');

  // Si hay token, añadirlo a los headers
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: any) => {
      // Solo redirigir al login si es una ruta protegida que requiere autenticación
      if ((error.status === 401 || error.status === 403) && isProtectedRoute(req.url)) {
        // Limpiamos el localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Redirigimos al login usando window.location para evitar inyección circular
        window.location.href = '/auth/login';
      }
      return throwError(() => error);
    })
  );
};

// Función para determinar si una ruta requiere autenticación
function isProtectedRoute(url: string): boolean {
  // Rutas que requieren autenticación
  const protectedRoutes = [
    '/api/usuario',
    '/api/rol',
    '/api/personas',
    '/api/clubs',
    '/api/categorias',
    '/api/equipos',
    '/api/cobros',
    '/api/credenciales',
    '/api/noticias/upload-image',
    '/api/noticias/delete-image',
    '/api/noticias/estadisticas'
  ];

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/api/noticias',
    '/api/noticias/vista', 
    '/api/noticias/vistas',
    '/api/ip-guide', 
    '/api/auth' 
  ];

  // Si es una ruta protegida específica, requiere autenticación
  if (protectedRoutes.some(route => url.includes(route))) {
    return true;
  }

  // Si es una ruta pública, no requiere autenticación
  if (publicRoutes.some(route => url.includes(route))) {
    return false;
  }

  // Por defecto, no redirigir (permitir acceso público)
  return false;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};

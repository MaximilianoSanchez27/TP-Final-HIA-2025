import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

/**
 * Functional route guard to protect routes that require authentication.
 *
 * This guard performs the following checks:
 * 1. Validates the user's token with the backend using `authService.validateToken()`.
 *    This ensures the user session is still active and refreshes user data.
 * 2. If the token is valid, it checks if the route requires specific roles.
 * 3. If roles are required, it verifies that the current user has at least one of the required roles.
 * 4. If any check fails, it redirects the user to the login page or an unauthorized page.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.validateToken().pipe(
    map((isTokenValid) => {
      if (isTokenValid) {
        const requiredRoles = route.data['roles'] as string[] | undefined;
        if (requiredRoles && requiredRoles.length > 0) {
          if (!authService.hasRole(requiredRoles)) {
            router.navigate(['/unauthorized']);
            return false;
          }
        }
        return true; // Token is valid and user has the required role (or no role is required)
      }
      // Token is not valid, redirect to login
      router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }),
    catchError(() => {
      // Handle any unexpected errors from the HTTP request itself
      router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};

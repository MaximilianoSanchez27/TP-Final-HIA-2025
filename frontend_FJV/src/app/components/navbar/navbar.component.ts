import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive,NgbDropdownModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMenuCollapsed = true;
  isAuthenticated = false;
  activeDropdown: string | null = null;
  userProfile = {
    name: 'Usuario Demo',
    image: 'assets/images/avatar-default.png',
    role: 'Miembro'
  };
  imageLoadError = false;

  private authStatusSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación
    this.authStatusSubscription = this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });

    // Suscribirse a los cambios en el usuario actual con manejo seguro de valores nulos
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Acceder a propiedades de manera segura, usando operadores de encadenamiento opcional
        this.userProfile = {
          name: `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario',
          image: user.fotoPerfil || 'assets/images/avatar-default.png',
          role: user.rol?.nombre || 'Usuario'
        };

        console.log('User profile updated:', this.userProfile);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.authStatusSubscription) {
      this.authStatusSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    // Cerrar dropdowns cuando se abre/cierra el menú principal
    if (this.isMenuCollapsed) {
      this.activeDropdown = null;
    }
  }

  closeMenu() {
    this.isMenuCollapsed = true;
    this.activeDropdown = null;
  }

  toggleMobileDropdown(dropdown: string) {
    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdown;
    }
  }

  logout() {
    this.authService.logout();
    this.closeMenu();
  }

  handleImageError() {
    this.imageLoadError = true;
  }
}

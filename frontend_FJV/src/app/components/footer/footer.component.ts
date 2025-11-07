import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContactoService } from '../../services/contacto.service';
import { Contacto } from '../../interfaces/contacto.interface';

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  currentYear = new Date().getFullYear();

  // Datos de contacto dinámicos del admin
  contacto: Contacto | null = null;
  isLoading = true;

  // Enlaces sociales dinámicos basados en los datos del admin
  socialLinks: SocialLink[] = [];

  // Enlaces fijos del footer
  footerLinks = [
    { label: 'Inicio', url: '/' },
    { label: 'Noticias', url: '/noticias' },
    { label: 'Contacto', url: '/contacto' }
  ];

  constructor(private contactoService: ContactoService) {}

  ngOnInit(): void {
    this.cargarDatosContacto();
  }

  private cargarDatosContacto(): void {
    this.contactoService.obtenerContacto().subscribe({
      next: (data) => {
        this.contacto = data;
        this.actualizarRedesSociales();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando datos de contacto:', err);
        // Cargar datos por defecto en caso de error
        this.cargarDatosPorDefecto();
        this.isLoading = false;
      }
    });
  }

  private actualizarRedesSociales(): void {
    this.socialLinks = [];

    if (this.contacto?.facebook) {
      this.socialLinks.push({
        name: 'Facebook',
        url: this.getFacebookUrl(this.contacto.facebook),
        icon: 'fab fa-facebook-f'
      });
    }

    if (this.contacto?.instagram) {
      this.socialLinks.push({
        name: 'Instagram',
        url: this.getInstagramUrl(this.contacto.instagram),
        icon: 'fab fa-instagram'
      });
    }
  }

  private cargarDatosPorDefecto(): void {
    // Datos por defecto si no se pueden cargar del servidor
    this.contacto = {
      direccion: 'San Salvador de Jujuy, Argentina',
      telefono: '(388) 123-4567',
      email: 'fjv.desde1974@gmail.com',
      horarios: 'Lunes a Viernes: 9:00 - 17:00',
      facebook: 'federacionjujenavoleyof',
      instagram: 'fjvjujuy'
    };

    this.socialLinks = [
      {
        name: 'Facebook',
        url: 'https://www.facebook.com/federacionjujenavoleyof',
        icon: 'fab fa-facebook-f'
      },
      {
        name: 'Instagram',
        url: 'https://www.instagram.com/fjvjujuy/',
        icon: 'fab fa-instagram'
      }
    ];
  }

  private getFacebookUrl(usernameOrUrl: string): string {
    if (usernameOrUrl.startsWith('http')) {
      return usernameOrUrl;
    }
    // Si empieza con @ o solo username, construir URL
    const username = usernameOrUrl.startsWith('@') ? usernameOrUrl.slice(1) : usernameOrUrl;
    return `https://facebook.com/${username}`;
  }

  private getInstagramUrl(usernameOrUrl: string): string {
    if (usernameOrUrl.startsWith('http')) {
      return usernameOrUrl;
    }
    // Si empieza con @ o solo username, construir URL
    const username = usernameOrUrl.startsWith('@') ? usernameOrUrl.slice(1) : usernameOrUrl;
    return `https://instagram.com/${username}`;
  }

  // Método para formatear teléfono como enlace tel:
  getTelUrl(telefono: string): string {
    return `tel:${telefono}`;
  }

  // Método para formatear email como enlace mailto:
  getEmailUrl(email: string): string {
    return `mailto:${email}`;
  }

  getWhatsAppUrl(telefono: string): string {
    // Limpiar el teléfono y formatear para WhatsApp
    const cleanPhone = telefono.replace(/[^\d+]/g, '');
    const message = encodeURIComponent('Hola, me contacto desde la página web de la FJV');
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  // Métodos de tracking para Angular
  trackBySocial(index: number, social: SocialLink): string {
    return social.name;
  }

  trackByLink(index: number, link: any): string {
    return link.label;
  }

  // Método para scroll hacia arriba
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

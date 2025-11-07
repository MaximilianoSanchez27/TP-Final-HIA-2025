import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Afiliado } from '../../../../interfaces/afiliado.interface';
import { Credencial } from '../../../../interfaces/credencial.interface';
import { AfiliadoService } from '../../../../services/afiliado.service';
import { CredencialService } from '../../../../services/credencial.service';
import { GeneradorCredencialComponent } from '../../../../components/generador-credencial/generador-credencial.component';
import { VisualizadorCredencialComponent } from '../../../../components/visualizador-credencial/visualizador-credencial.component';
import { HistorialPasesComponent } from '../../../../components/historial-pases/historial-pases.component';

@Component({
  selector: 'app-detalle-afiliado',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GeneradorCredencialComponent,
    VisualizadorCredencialComponent,
    HistorialPasesComponent
  ],
  templateUrl: './detalle-afiliado.component.html',
  styleUrls: ['./detalle-afiliado.component.css']
})
export class DetalleAfiliadoComponent implements OnInit {
  afiliado: Afiliado | null = null;
  credencial: Credencial | null = null;
  mostrarGeneradorCredencial = false;
  mostrarVisualizadorCredencial = false;

  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private afiliadoService: AfiliadoService,
    private credencialService: CredencialService
  ) {}

  ngOnInit(): void {
    const idPersona = this.route.snapshot.paramMap.get('id');
    console.log('ID de persona obtenido de la ruta:', idPersona);

    if (idPersona && !isNaN(+idPersona)) {
      this.cargarDatosAfiliado(+idPersona);
    } else {
      this.error = 'ID de persona no válido';
      this.loading = false;
      console.error('ID de persona no válido:', idPersona);
    }
  }

  //Escuchar el evento 'keydown.escape' en el documento
  @HostListener('document:keydown.escape', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.mostrarGeneradorCredencial) {
      this.cerrarGeneradorCredencial();
    } else if (this.mostrarVisualizadorCredencial) {
      this.cerrarVisualizadorCredencial();
    }
  }

  private cargarDatosAfiliado(idPersona: number): void {
    this.loading = true;
    console.log('Cargando datos del afiliado con ID:', idPersona);

    // Cargar datos del afiliado
    this.afiliadoService.obtenerAfiliadoPorId(idPersona).subscribe({
      next: (afiliado) => {
        console.log('Datos del afiliado cargados:', afiliado);
        console.log('Foto URL del afiliado:', afiliado.foto || 'No tiene foto');
        this.afiliado = afiliado;

        // La foto ya viene como URL de ImgBB en el mapeo del servicio
        // Solo cargar desde servidor si realmente no hay foto
        if (!afiliado.foto) {
          console.log('No hay foto en el objeto afiliado, intentando cargar desde servidor');
          this.cargarFotoDesdeServidor(afiliado.idPersona!);
        }

        this.cargarCredencial(idPersona);
      },
      error: (error) => {
        console.error('Error al cargar afiliado:', error);
        this.error = 'Error al cargar los datos del afiliado';
        this.loading = false;
      }
    });
  }

  private cargarFotoDesdeServidor(idPersona: number): void {
    this.afiliadoService.obtenerFotoPerfil(idPersona).subscribe({
      next: (fotoUrl) => {
        if (fotoUrl && this.afiliado) {
          console.log('Foto URL cargada desde servidor para detalle:', fotoUrl);
          this.afiliado.foto = fotoUrl;
        } else {
          console.log('No hay foto disponible en servidor para detalle');
        }
      },
      error: (error) => {
        console.log('Error al cargar foto desde servidor para detalle:', error);
      }
    });
  }

  private cargarCredencial(idPersona: number): void {
    console.log('Cargando credencial para persona:', idPersona);

    this.credencialService.obtenerCredencialPorPersona(idPersona).subscribe({
      next: (credencial) => {
        console.log('Credencial cargada:', credencial);
        this.credencial = credencial;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar credencial:', error);
        this.credencial = null;
        this.loading = false;
      }
    });
  }

  onEditar(): void {
    if (this.afiliado?.idPersona) {
      console.log('Navegando a editar afiliado:', this.afiliado.idPersona);
      this.router.navigate(['/afiliados/editar', this.afiliado.idPersona]);
    }
  }

  onVolver(): void {
    console.log('Volviendo al listado de afiliados');
    this.router.navigate(['/afiliados']);
  }

  onGenerarCredencial(): void {
    if (this.credencial && this.afiliado) {
      this.mostrarGeneradorCredencial = true;
    } else {
      alert('No hay una credencial para generar o faltan datos del afiliado.');
    }
  }

  cerrarGeneradorCredencial(): void {
    this.mostrarGeneradorCredencial = false;
  }

  onVerCredencial(): void {
    if (this.credencial && this.afiliado) {
      this.mostrarVisualizadorCredencial = true;
    } else {
      alert('No hay credencial disponible para mostrar.');
    }
  }

  cerrarVisualizadorCredencial(): void {
    this.mostrarVisualizadorCredencial = false;
  }

onCrearCredencial(): void {
  if (this.afiliado?.idPersona) {
    if (this.credencial) {
      alert('Este afiliado ya tiene una credencial. Solo se permite una credencial por afiliado.');
      return;
    }

    const confirmar = confirm('¿Desea crear una credencial para este afiliado?');

    if (confirmar) {
      this.credencialService.crearCredencialAutomatica(this.afiliado.idPersona).subscribe({
        next: () => {
          // Siempre recarga la credencial desde el backend
          this.cargarCredencial(this.afiliado!.idPersona!);
          alert('Credencial creada exitosamente');
        },
        error: (error) => {
          // Incluso si hay error, intenta recargar la credencial
          this.cargarCredencial(this.afiliado!.idPersona!);
          console.error('Error al crear credencial:', error);
          if (error.error?.msg) {
            alert(`Error: ${error.error.msg}`);
          } else {
            alert('Error al crear la credencial. Intente nuevamente.');
          }
        }
      });
    }
  }
}

  onRenovarCredencial(): void {
    if (this.credencial?.idCredencial) {
      const confirmar = confirm('¿Está seguro de que desea renovar esta credencial? Esto extenderá la validez por un año más.');

      if (confirmar) {
        this.credencialService.renovarCredencial(this.credencial.idCredencial).subscribe({
          next: (response) => {
            console.log('Credencial renovada exitosamente:', response);
            alert('Credencial renovada exitosamente');
            if (this.afiliado?.idPersona) {
              this.cargarCredencial(this.afiliado.idPersona);
            }
          },
          error: (error) => {
            console.error('Error al renovar credencial:', error);
            if (error.error?.msg) {
              alert(`Error: ${error.error.msg}`);
            } else {
              alert('Error al renovar la credencial. Intente nuevamente.');
            }
          }
        });
      }
    }
  }

  onSuspenderCredencial(): void {
    if (!this.credencial?.idCredencial) return;

    const motivo = prompt('Ingrese el motivo de suspensión:');
    if (motivo) {
      this.credencialService.suspenderCredencial(this.credencial.idCredencial, motivo).subscribe({
        next: (response: any) => {
          console.log('Credencial suspendida exitosamente:', response);
          alert('Credencial suspendida exitosamente');
          if (this.afiliado?.idPersona) {
            this.cargarCredencial(this.afiliado.idPersona);
          }
        },
        error: (error: any) => {
          console.error('Error al suspender credencial:', error);
          if (error.error?.msg) {
            alert(`Error: ${error.error.msg}`);
          } else {
            alert('Error al suspender la credencial. Intente nuevamente.');
          }
        }
      });
    }
  }

  onReactivarCredencial(): void {
    if (!this.credencial?.idCredencial) return;

    const confirmar = confirm('¿Está seguro de que desea reactivar esta credencial?');
    if (confirmar) {
      this.credencialService.reactivarCredencial(this.credencial.idCredencial).subscribe({
        next: (response: any) => {
          console.log('Credencial reactivada exitosamente:', response);
          alert('Credencial reactivada exitosamente');
          if (this.afiliado?.idPersona) {
            this.cargarCredencial(this.afiliado.idPersona);
          }
        },
        error: (error: any) => {
          console.error('Error al reactivar credencial:', error);
          if (error.error?.msg) {
            alert(`Error: ${error.error.msg}`);
          } else {
            alert('Error al reactivar la credencial. Intente nuevamente.');
          }
        }
      });
    }
  }

  esCredencialActiva(): boolean {
    return this.credencial?.estado === 'ACTIVO';
  }

  esCredencialSuspendida(): boolean {
    return this.credencial?.estado === 'SUSPENDIDO';
  }

  esCredencialVencida(): boolean {
    return this.credencial?.estado === 'VENCIDO';
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'bg-success';
      case 'INACTIVO':
        return 'bg-secondary';
      case 'SUSPENDIDO':
        return 'bg-warning text-dark';
      case 'VENCIDO':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getAvatarUrl(): string {
    if (this.afiliado) {
      return this.afiliadoService.getAvatarUrl(this.afiliado);
    }
    return '';
  }

  getAvatarIcon(): any {
    if (this.afiliado) {
      return this.afiliadoService.getAvatarIcon(this.afiliado);
    }
    return { icon: 'fas fa-user', color: '#6c757d', size: '6rem' };
  }

  calcularEdad(): number {
    if (!this.afiliado?.fechaNacimiento) return 0;

    const hoy = new Date();
    const fechaNac = new Date(this.afiliado.fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    return edad;
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'No disponible';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch (error) {
      console.error('Error al formatear fecha:', fecha, error);
      return 'Fecha inválida';
    }
  }

  tienePase(): boolean {
    return !!(this.afiliado?.pase && this.afiliado.pase.length > 0);
  }
}

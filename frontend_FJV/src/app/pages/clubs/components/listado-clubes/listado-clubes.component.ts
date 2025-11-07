import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Club } from '../../../../interfaces/club.interface';
import { ClubService } from '../../../../services/club.service';

@Component({
  selector: 'app-listado-clubes',
  standalone: true,
  imports: [CommonModule, DatePipe, NgbModalModule, ReactiveFormsModule],
  templateUrl: './listado-clubes.component.html',
  styleUrls: ['./listado-clubes.component.css']
})
export class ListadoClubesComponent implements OnInit, OnChanges {
  @Input() clubes: Club[] = [];
  @Input() mostrarModalEdicion = false;
  @Input() clubParaEditar: Club | null = null;
  @Output() editarClub = new EventEmitter<Club>();
  @Output() eliminarClub = new EventEmitter<number>();
  @Output() crearClub = new EventEmitter<Club>();
  @Output() cerrarModal = new EventEmitter<void>();

  clubParaEliminar: Club | null = null;

  // Formulario
  clubForm!: FormGroup;
  procesando = false;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private modalService: NgbModal,
    public clubService: ClubService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Método requerido por OnInit
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clubParaEditar'] || changes['mostrarModalEdicion']) {
      if (this.mostrarModalEdicion) {
        this.initForm();
        if (this.clubParaEditar) {
          this.cargarDatosClub();
        }
        this.mensajeExito = '';
        this.mensajeError = '';
      }
    }
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      telefono: ['', [Validators.pattern(/^[0-9+\-\s]{6,20}$/)]],
      email: ['', [Validators.required, Validators.email]],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]],
      fechaAfiliacion: ['', Validators.required],
      estadoAfiliacion: ['', Validators.required]
    });
  }

  cargarDatosClub(): void {
    if (this.clubParaEditar) {
      this.clubForm.patchValue({
        nombre: this.clubParaEditar.nombre,
        direccion: this.clubParaEditar.direccion,
        telefono: this.clubParaEditar.telefono || '',
        email: this.clubParaEditar.email,
        cuit: this.clubParaEditar.cuit,
        fechaAfiliacion: this.clubParaEditar.fechaAfiliacion,
        estadoAfiliacion: this.clubParaEditar.estadoAfiliacion
      });
    }
  }

  cerrarModalLocal(): void {
    this.cerrarModal.emit();
  }

  onSubmitModal(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    this.procesando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const clubData: Club = this.clubForm.value;

    if (this.clubParaEditar) {
      // Actualizar club existente
      this.clubService.updateClub(this.clubParaEditar.idClub!, clubData).subscribe({
        next: (response) => {
          this.procesando = false;
          if (response.status === "1") {
            this.mensajeExito = 'Club actualizado exitosamente';
            setTimeout(() => {
              this.crearClub.emit(clubData);
            }, 1500);
          } else {
            this.mensajeError = response.msg || 'Error al actualizar el club';
          }
        },
        error: (error) => {
          this.procesando = false;
          this.mensajeError = error.error?.msg || 'Error al actualizar el club';
        }
      });
    } else {
      // Crear nuevo club
      this.clubService.createClub(clubData).subscribe({
        next: (response) => {
          this.procesando = false;
          if (response.status === "1") {
            this.mensajeExito = 'Club creado exitosamente';
            setTimeout(() => {
              this.crearClub.emit(clubData);
            }, 1500);
          } else {
            this.mensajeError = response.msg || 'Error al crear el club';
          }
        },
        error: (error) => {
          this.procesando = false;
          this.mensajeError = error.error?.msg || 'Error al crear el club';
        }
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clubForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onEditar(club: Club): void {
    this.editarClub.emit(club);
  }

  // Método para eliminar con modal simple como afiliados
  onEliminar(content: any, club: Club): void {
    this.clubParaEliminar = club;
  }

  // Confirmar eliminación
  confirmarEliminacion(): void {
    if (this.clubParaEliminar) {
      this.eliminarClub.emit(this.clubParaEliminar.idClub!);
      this.clubParaEliminar = null;
    }
  }

  // Cancelar eliminación
  cancelarEliminacion(): void {
    this.clubParaEliminar = null;
  }

  getLogoUrl(club: Club): string {
    const logoUrl = this.clubService.getLogoUrl(club);
    // Validar que la URL sea válida
    if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('data:'))) {
      return logoUrl;
    }
    return '';
  }

  // Método para obtener clase CSS del estado - IGUAL QUE AFILIADOS
  getEstadoBadgeClass(estado: string | undefined): string {
    if (!estado) return 'bg-secondary';

    switch (estado.toLowerCase()) {
      case 'activo':
        return 'bg-success';
      case 'suspendido':
        return 'bg-warning text-dark';
      case 'inactivo':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  // Método para formatear fecha de forma más legible
  formatearFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Método para obtener el día de la semana
  obtenerDiaSemana(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  }
  // Método para formatear el CUIT
  formatearCuit(cuit: string | undefined | null): string {
    if (!cuit) {
      return 'N/A';
    }
    // Asegurarse de que no tenga guiones antes de formatear
    const cuitLimpio = cuit.toString().replace(/-/g, '');

    if (cuitLimpio.length !== 11) {
      return cuit; // Devuelve el original si no tiene 11 dígitos
    }
    return `${cuitLimpio.substring(0, 2)}-${cuitLimpio.substring(2, 10)}-${cuitLimpio.substring(10, 11)}`;
  }
}

import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Club } from '../../../../interfaces/club.interface';
import { ClubService } from '../../../../services/club.service';

@Component({
  selector: 'app-formulario-club',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario-club.component.html',
  styleUrls: ['./formulario-club.component.css']
})
export class FormularioClubComponent implements OnInit, OnChanges {
  @Input() clubParaEditar: Club | null = null;
  @Output() guardarClub = new EventEmitter<Club>();
  @Output() cancelar = new EventEmitter<void>();

  clubForm!: FormGroup;
  estadoAfiliacionOpciones = ['Activo', 'Inactivo', 'Pendiente'];

  // Nuevas propiedades para manejo de logo
  logoUrl: string = '';
  logoFile: File | null = null;
  uploadingLogo = false;
  logoUploadError = '';

  constructor(private fb: FormBuilder, private clubService: ClubService) {
    this.initForm();
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clubParaEditar'] && this.clubParaEditar) {
      this.setFormValues(this.clubParaEditar);

      // Cargar logo si existe
      if (this.clubParaEditar.logo) {
        this.logoUrl = this.clubService.getLogoUrl(this.clubParaEditar);
      } else {
        this.logoUrl = '';
      }
    } else if (changes['clubParaEditar'] && !this.clubParaEditar) {
      this.cancelarEdicion();
    }
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      idClub: [null],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', [Validators.maxLength(255)]],
      telefono: ['', [Validators.pattern(/^[\d-() ]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]],
      fechaAfiliacion: ['', Validators.required],
      estadoAfiliacion: ['Activo', Validators.required],
      logo: ['']
    });
  }

  setFormValues(club: Club): void {
    let fechaAfiliacion = '';
    if (club.fechaAfiliacion) {
      const fecha = new Date(club.fechaAfiliacion);
      if (!isNaN(fecha.getTime())) {
        fechaAfiliacion = fecha.toISOString().split('T')[0];
      }
    }

    this.clubForm.patchValue({
      idClub: club.idClub,
      nombre: club.nombre || '',
      direccion: club.direccion || '',
      telefono: club.telefono || '',
      email: club.email || '',
      cuit: club.cuit || '',
      fechaAfiliacion: fechaAfiliacion,
      estadoAfiliacion: club.estadoAfiliacion || 'Activo',
      logo: club.logo || ''
    });
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validaciones
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. El tamaño máximo permitido es 4MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, GIF, WebP.');
      return;
    }

    this.logoFile = file;
    this.logoUploadError = '';
    this.clubForm.markAsDirty();

    // Preview de la imagen
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  onLogoRemoved(): void {
    this.logoUrl = '';
    this.logoFile = null;
    this.logoUploadError = '';
    this.clubForm.get('logo')?.setValue('');
    this.clubForm.markAsDirty();
  }

  onGuardar(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    if (this.logoFile) {
      this.uploadingLogo = true;
      this.logoUploadError = '';
    }

    const formValues = this.clubForm.value;

    // Limpiamos el CUIT para enviar solo los números al backend
    const clubData: Club = {
      nombre: formValues.nombre?.trim() || '',
      direccion: formValues.direccion?.trim() || '',
      telefono: formValues.telefono?.trim() || '',
      email: formValues.email?.trim() || '',
      cuit: (formValues.cuit || '').replace(/-/g, ''),
      fechaAfiliacion: formValues.fechaAfiliacion || '',
      estadoAfiliacion: formValues.estadoAfiliacion || 'Activo',
      logo: formValues.logo || ''
    };

    // Agregar idClub solo si estamos editando
    if (this.clubParaEditar?.idClub) {
      clubData.idClub = this.clubParaEditar.idClub;
    }

    console.log('Datos del club a enviar:', clubData);

    const operation = this.clubParaEditar
      ? this.clubService.actualizarClubConLogo(this.clubParaEditar.idClub!, clubData, this.logoFile || undefined)
      : this.clubService.crearClubConLogo(clubData, this.logoFile || undefined);

    operation.subscribe({
      next: (clubGuardado) => {
        this.uploadingLogo = false;
        this.logoUploadError = '';
        console.log('Club guardado exitosamente:', clubGuardado);
        this.guardarClub.emit(clubGuardado);
        this.resetForm();
      },
      error: (error) => {
        this.uploadingLogo = false;
        console.error('Error completo al guardar club:', error);

        if (error.error?.message) {
          this.logoUploadError = error.error.message;
        } else if (error.error?.msg) {
          this.logoUploadError = error.error.msg;
        } else if (error.status === 400) {
          this.logoUploadError = 'Datos inválidos. Verifique que todos los campos estén completos y sean válidos.';
        } else {
          this.logoUploadError = 'Error al guardar el club';
        }

        alert(`Error: ${this.logoUploadError}`);
      }
    });
  }

  resetForm(): void {
    this.clubForm.reset({
      estadoAfiliacion: 'Activo',
      idClub: null
    });
    this.logoUrl = '';
    this.logoFile = null;
    this.logoUploadError = '';
    this.uploadingLogo = false;
  }

  cancelarEdicion(): void {
    this.clubParaEditar = null;
    this.resetForm();
  }
}

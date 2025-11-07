import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClubService } from '../../../../services/club.service';
import { Club } from '../../../../interfaces/club.interface';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-editar-club',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './editar-club.page.html',
  styleUrls: ['./editar-club.page.css']
})
export class EditarClubPage implements OnInit {
  clubForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  clubId: number = 0;

  // Propiedades para manejo de logo
  logoUrl: string = '';
  logoFile: File | null = null;
  uploadingLogo = false;
  logoUploadError = '';

  // Estados de afiliación disponibles
  estadosAfiliacion = ['Activo', 'Inactivo', 'Suspendido'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clubService: ClubService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (isNaN(id)) {
          return of(null);
        }
        this.clubId = id;
        return this.clubService.getClub(id);
      })
    ).subscribe({
      next: (club) => {
        this.isLoading = false;
        if (!club) {
          this.errorMessage = 'No se encontró el club solicitado';
          return;
        }
        this.patchFormValues(club);
        // Cargar logo si existe
        if (club.logo) {
          this.logoUrl = this.clubService.getLogoUrl(club);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Error al cargar el club: ${error.message}`;
      }
    });
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      telefono: ['', [Validators.pattern(/^[0-9+\-\s]{6,20}$/)]],
      email: ['', [Validators.required, Validators.email]],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]],
      fechaAfiliacion: ['', Validators.required],
      estadoAfiliacion: ['', Validators.required],
      logo: ['']
    });
  }

  patchFormValues(club: Club): void {
    this.clubForm.patchValue({
      nombre: club.nombre,
      direccion: club.direccion,
      telefono: club.telefono || '',
      email: club.email,
      cuit: club.cuit,
      fechaAfiliacion: club.fechaAfiliacion,
      estadoAfiliacion: club.estadoAfiliacion,
      logo: club.logo || ''
    });
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.logoUploadError = 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)';
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      this.logoUploadError = 'El archivo es demasiado grande. Máximo 5MB.';
      return;
    }

    this.logoFile = file;
    this.logoUploadError = '';

    // Mostrar preview
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
  }

  onSubmit(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.clubForm.value;

    if (this.logoFile) {
      this.uploadingLogo = true;
      this.logoUploadError = '';
    }

    // Preparar datos del club
    const clubData: Club = {
      idClub: this.clubId,
      nombre: formValues.nombre,
      direccion: formValues.direccion,
      telefono: formValues.telefono,
      email: formValues.email,
      cuit: formValues.cuit,
      fechaAfiliacion: formValues.fechaAfiliacion,
      estadoAfiliacion: formValues.estadoAfiliacion,
      logo: formValues.logo || ''
    };

    // Usar el método de actualización con logo
    this.clubService.actualizarClubConLogo(this.clubId, clubData, this.logoFile || undefined).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.uploadingLogo = false;
        this.logoUploadError = '';

        this.successMessage = 'Club actualizado exitosamente';
        setTimeout(() => {
          this.router.navigate(['/dashboard/clubes/detalle', this.clubId]);
        }, 2000);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.uploadingLogo = false;

        if (error.error?.message) {
          this.logoUploadError = error.error.message;
        } else if (error.error?.msg) {
          this.logoUploadError = error.error.msg;
        } else if (error.status === 400) {
          this.logoUploadError = 'Datos inválidos. Verifique que todos los campos estén completos y sean válidos.';
        } else {
          this.logoUploadError = 'Error al actualizar el club';
        }

        this.errorMessage = this.logoUploadError;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/clubes/detalle', this.clubId]);
  }

  resetForm(): void {
    this.clubForm.reset();
    this.logoUrl = '';
    this.logoFile = null;
    this.logoUploadError = '';
    this.uploadingLogo = false;
  }

  // Getters para acceder a los controles del formulario desde el template
  get nombreControl() { return this.clubForm.get('nombre'); }
  get direccionControl() { return this.clubForm.get('direccion'); }
  get telefonoControl() { return this.clubForm.get('telefono'); }
  get emailControl() { return this.clubForm.get('email'); }
  get cuitControl() { return this.clubForm.get('cuit'); }
  get fechaAfiliacionControl() { return this.clubForm.get('fechaAfiliacion'); }
  get estadoAfiliacionControl() { return this.clubForm.get('estadoAfiliacion'); }
}

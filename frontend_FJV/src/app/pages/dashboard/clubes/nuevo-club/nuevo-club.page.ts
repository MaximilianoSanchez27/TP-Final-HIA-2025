import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClubService } from '../../../../services/club.service';
import { Club } from '../../../../interfaces/club.interface';

@Component({
  selector: 'app-nuevo-club',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nuevo-club.page.html',
  styleUrls: ['./nuevo-club.page.css']
})
export class NuevoClubPage implements OnInit {
  clubForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Estados de afiliación disponibles
  estadosAfiliacion = ['Activo', 'Inactivo', 'Suspendido'];

  constructor(
    private fb: FormBuilder,
    private clubService: ClubService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    // Obtener la fecha actual en formato yyyy-MM-dd
    const today = new Date().toISOString().substring(0, 10);

    this.clubForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      telefono: ['', [Validators.pattern(/^[0-9+\-\s]{6,20}$/)]],
      email: ['', [Validators.required, Validators.email]],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{8}-\d{1}$/)]],
      fechaAfiliacion: [today, Validators.required],
      estadoAfiliacion: ['Activo', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const club: Club = this.clubForm.value;

    this.clubService.createClub(club).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.status === "1") {
          this.successMessage = response.msg;
          setTimeout(() => {
            this.router.navigate(['/dashboard/clubes']);
          }, 2000);
        } else {
          this.errorMessage = response.msg || 'Error al crear el club';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.msg || 'Error al crear el club. Por favor intente nuevamente.';
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/clubes']);
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

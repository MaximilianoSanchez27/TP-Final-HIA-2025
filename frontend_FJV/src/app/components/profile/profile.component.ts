import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { User } from '../../services/auth.service'; // Importamos la interfaz User desde AuthService

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile: User | null = null;
  isLoading = true;
  isEditing = false;
  error: string | null = null;
  successMessage: string | null = null;
  profileForm!: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private profileService: ProfileService,
    private titleService: Title,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Mi Perfil - FJV');
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.userProfile = data;
        this.initializeForm();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'No se pudo cargar el perfil. Por favor, intente de nuevo más tarde.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  initializeForm(): void {
    this.profileForm = this.fb.group({
      nombre: [this.userProfile?.nombre, Validators.required],
      apellido: [this.userProfile?.apellido, Validators.required],
      phone: [this.userProfile?.phone],
      address: this.fb.group({
        street: [this.userProfile?.address?.street || ''],
        city: [this.userProfile?.address?.city || ''],
        state: [this.userProfile?.address?.state || ''],
        zipCode: [this.userProfile?.address?.zipCode || ''],
        country: [this.userProfile?.address?.country || '']
      })
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.error = null;
      this.successMessage = null;
    } else {
      // Resetea el formulario con los datos actuales cada vez que se entra en modo edición
      this.profileForm.patchValue(this.userProfile || {});
      this.selectedFile = null;
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      // Opcional: mostrar previsualización de la imagen
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.error = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;

    const formData = new FormData();
    const formValue = this.profileForm.value;

    formData.append('nombre', formValue.nombre);
    formData.append('apellido', formValue.apellido);
    formData.append('phone', formValue.phone || '');
    formData.append('address', JSON.stringify(formValue.address));

    if (this.selectedFile) {
      formData.append('fotoPerfil', this.selectedFile, this.selectedFile.name);
    }

    this.profileService.updateProfile(formData).subscribe({
      next: (response) => {
        this.userProfile = response.usuario; // El backend devuelve el usuario actualizado
        this.isLoading = false;
        this.isEditing = false;
        this.successMessage = '¡Perfil actualizado con éxito!';
      },
      error: (err) => {
        this.error = 'No se pudo actualizar el perfil. Inténtelo de nuevo.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}

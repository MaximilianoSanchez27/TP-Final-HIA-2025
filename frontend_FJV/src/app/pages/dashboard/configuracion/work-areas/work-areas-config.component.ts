import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { WorkAreasService } from '../../../../services/work-areas.service';
import { WorkAreasConfig, WorkArea } from '../../../../models/work-areas.model';

@Component({
  selector: 'app-work-areas-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './work-areas-config.component.html',
  styleUrls: ['./work-areas-config.component.css']
})
export class WorkAreasConfigComponent implements OnInit, OnDestroy {
  workAreasForm!: FormGroup;
  currentConfig: WorkAreasConfig | null = null;
  availableIcons: { icon: string; label: string }[] = [];

  // Estados
  isLoading = true;
  isSaving = false;
  editingIndex = -1;

  // Mensajes
  errorMessage = '';
  successMessage = '';
  validationErrors: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private workAreasService: WorkAreasService
  ) {
    this.initializeForm();
    this.availableIcons = this.workAreasService.getAvailableIcons();
  }

  ngOnInit(): void {
    this.loadWorkAreasConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.workAreasForm = this.fb.group({
      tituloSeccion: ['Áreas de trabajo', [Validators.required, Validators.maxLength(100)]],
      areas: this.fb.array([])
    });
  }

  /**
   * Getter para el FormArray de áreas
   */
  get areasFormArray(): FormArray {
    return this.workAreasForm.get('areas') as FormArray;
  }

  /**
   * Getter para las áreas actuales
   */
  get currentAreas(): any[] {
    return this.areasFormArray.value || [];
  }

  /**
   * Carga la configuración actual desde el backend
   */
  private loadWorkAreasConfig(): void {
    this.isLoading = true;
    this.clearMessages();

    this.workAreasService.getWorkAreasConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.currentConfig = config;
          this.populateForm(config);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando configuración:', error);
          this.errorMessage = 'Error al cargar la configuración. Se usarán valores por defecto.';
          this.loadDefaultConfig();
          this.isLoading = false;
        }
      });
  }

  /**
   * Carga configuración por defecto
   */
  private loadDefaultConfig(): void {
    const defaultConfig: WorkAreasConfig = {
      tituloSeccion: 'Áreas de trabajo',
      areas: [
        {
          titulo: 'Torneos Provinciales',
          descripcion: 'Organizamos torneos en todas las categorías, promoviendo la competencia a nivel provincial y regional.',
          icono: 'fas fa-trophy',
          orden: 1,
          activo: true
        },
        {
          titulo: 'Selecciones Provinciales',
          descripcion: 'Formamos y preparamos las selecciones de Jujuy para representar a nuestra provincia en torneos nacionales.',
          icono: 'fas fa-users',
          orden: 2,
          activo: true
        },
        {
          titulo: 'Capacitación Deportiva',
          descripcion: 'Ofrecemos cursos para jugadores, entrenadores y árbitros para mantener el alto nivel del voley jujeño.',
          icono: 'fas fa-graduation-cap',
          orden: 3,
          activo: true
        }
      ],
      activo: true
    };

    this.currentConfig = defaultConfig;
    this.populateForm(defaultConfig);
  }

  /**
   * Popula el formulario con la configuración
   */
  private populateForm(config: WorkAreasConfig): void {
    // Limpiar FormArray actual
    while (this.areasFormArray.length !== 0) {
      this.areasFormArray.removeAt(0);
    }

    // Establecer título de sección
    this.workAreasForm.patchValue({
      tituloSeccion: config.tituloSeccion
    });

    // Agregar áreas
    config.areas.forEach((area) => {
      const areaFormGroup = this.createAreaFormGroup(area);
      this.areasFormArray.push(areaFormGroup);
    });
  }

  /**
   * Crea un FormGroup para un área
   */
  private createAreaFormGroup(area?: WorkArea): FormGroup {
    return this.fb.group({
      titulo: [area?.titulo || '', [Validators.required, Validators.maxLength(100)]],
      descripcion: [area?.descripcion || '', [Validators.required, Validators.maxLength(300)]],
      icono: [area?.icono || '', [Validators.required]]
    });
  }

  /**
   * Agrega una nueva área
   */
  addArea(): void {
    if (this.currentAreas.length >= 6) {
      this.errorMessage = 'Máximo 6 áreas de trabajo permitidas.';
      return;
    }

    const newAreaFormGroup = this.createAreaFormGroup();
    this.areasFormArray.push(newAreaFormGroup);
    this.editingIndex = this.areasFormArray.length - 1;
    this.clearMessages();
  }

  /**
   * Remueve un área
   */
  removeArea(index: number): void {
    if (this.currentAreas.length <= 1) {
      this.errorMessage = 'Debe haber al menos un área de trabajo.';
      return;
    }

    this.areasFormArray.removeAt(index);

    // Ajustar el índice de edición
    if (this.editingIndex === index) {
      this.editingIndex = -1;
    } else if (this.editingIndex > index) {
      this.editingIndex--;
    }

    this.clearMessages();
  }

  /**
   * Alterna la edición de un área
   */
  toggleEditArea(index: number): void {
    this.editingIndex = this.editingIndex === index ? -1 : index;
  }

  /**
   * Obtiene las áreas para la vista previa
   */
  getPreviewAreas(): any[] {
    return this.areasFormArray.value || [];
  }

  /**
   * Valida y envía el formulario
   */
  onSubmit(): void {
    this.clearMessages();

    if (this.workAreasForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    const formValue = this.workAreasForm.value;

    // Crear configuración
    const config: WorkAreasConfig = {
      idConfig: this.currentConfig?.idConfig,
      tituloSeccion: formValue.tituloSeccion,
      areas: formValue.areas.map((area: any, index: number) => ({
        idArea: this.currentConfig?.areas[index]?.idArea,
        titulo: area.titulo,
        descripcion: area.descripcion,
        icono: area.icono,
        orden: index + 1,
        activo: true
      })),
      activo: true
    };

    // Validar configuración
    const validation = this.workAreasService.validateWorkAreasConfig(config);
    if (!validation.valid) {
      this.validationErrors = validation.errors;
      return;
    }

    this.saveConfiguration(config);
  }

  /**
   * Guarda la configuración
   */
  private saveConfiguration(config: WorkAreasConfig): void {
    this.isSaving = true;
    this.clearMessages();

    this.workAreasService.updateWorkAreasConfig(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedConfig) => {
          this.currentConfig = savedConfig;
          this.successMessage = 'Configuración guardada exitosamente.';
          this.isSaving = false;
          this.editingIndex = -1;

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error guardando configuración:', error);
          this.errorMessage = 'Error al guardar la configuración. Inténtelo nuevamente.';
          this.isSaving = false;
        }
      });
  }

  /**
   * Navega de vuelta al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Limpia mensajes de error y éxito
   */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = [];
  }

  /**
   * Obtiene el texto de validación para un campo
   */
  getFieldError(fieldName: string, index?: number): string {
    let control;

    if (index !== undefined) {
      control = this.areasFormArray.at(index).get(fieldName);
    } else {
      control = this.workAreasForm.get(fieldName);
    }

    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Este campo es requerido';
      }
      if (control.errors['maxlength']) {
        return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      }
    }

    return '';
  }

  /**
   * Verifica si un campo tiene errores
   */
  hasFieldError(fieldName: string, index?: number): boolean {
    let control;

    if (index !== undefined) {
      control = this.areasFormArray.at(index).get(fieldName);
    } else {
      control = this.workAreasForm.get(fieldName);
    }

    return control ? control.invalid && control.touched : false;
  }
}

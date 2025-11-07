import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClubService } from '../../../../services/club.service';
import { Club } from '../../../../interfaces/club.interface';
import { CobroService, Cobro } from '../../../../services/cobro.service';

interface TipoComprobante {
  id: string;
  nombre: string;
}

interface Estado {
  id: string;
  nombre: string;
  color: string;
}

@Component({
  selector: 'app-nuevo-cobro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nuevo-cobro.page.html',
  styleUrls: ['./nuevo-cobro.page.css']
})
export class NuevoCobroPage implements OnInit {
  cobroForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  isLoadingClubes = true;

  // Datos reales desde la API
  clubes: Club[] = [];

  tiposComprobante: TipoComprobante[] = [
    { id: 'RECIBO_DE_PAGO', nombre: 'Recibo de pago' }
  ];

  estados: Estado[] = [
    { id: 'Pendiente', nombre: 'Pendiente', color: 'warning' },
    { id: 'Pagado', nombre: 'Pagado', color: 'success' },
    { id: 'Vencido', nombre: 'Vencido', color: 'danger' },
    { id: 'Anulado', nombre: 'Anulado', color: 'secondary' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private clubService: ClubService,
    private cobroService: CobroService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarClubes();
  }

  initForm(): void {
    // Obtener la fecha actual en formato yyyy-MM-dd para el campo fecha
    const today = new Date();
    const formattedDate = today.toISOString().substring(0, 10);

    // Calcular fecha de vencimiento por defecto (30 días después)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const formattedDueDate = dueDate.toISOString().substring(0, 10);

    this.cobroForm = this.fb.group({
      monto: ['', [Validators.required, Validators.min(1)]],
      fechaCobro: [formattedDate, Validators.required],
      concepto: ['', [Validators.required, Validators.minLength(5)]],
      idClub: ['', Validators.required],
      estado: ['Pendiente', Validators.required],
      fechaVencimiento: [formattedDueDate, Validators.required],
      tipoComprobante: ['', Validators.required]
    });
  }

  cargarClubes(): void {
    this.isLoadingClubes = true;
    this.clubService.getClubes().subscribe({
      next: (clubes) => {
        this.clubes = clubes;
        this.isLoadingClubes = false;
      },
      error: (error) => {
        console.error('Error al cargar clubes:', error);
        this.errorMessage = 'Error al cargar la lista de clubes';
        this.isLoadingClubes = false;
      }
    });
  }

  onSubmit(): void {
    if (this.cobroForm.invalid) {
      this.cobroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = this.cobroForm.value;
    const nuevoCobro: Cobro = {
      concepto: formData.concepto,
      monto: parseFloat(formData.monto),
      fechaCobro: formData.fechaCobro,
      fechaVencimiento: formData.fechaVencimiento,
      estado: formData.estado as 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado',
      tipoComprobante: formData.tipoComprobante,
      idClub: parseInt(formData.idClub)
    };

    console.log("Enviando datos de cobro:", nuevoCobro);

    this.cobroService.createCobro(nuevoCobro).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.status === '1' && response.cobro) {
          this.successMessage = response.msg || 'Cobro creado exitosamente';

          // Redirigir al detalle del cobro después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/dashboard/cobros/detalle', response.cobro!.idCobro]);
          }, 2000);
        } else {
          this.successMessage = 'Cobro creado exitosamente';
          setTimeout(() => {
            this.router.navigate(['/dashboard/cobros']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error("Error al crear cobro:", error);
        this.errorMessage = error.error?.msg || error.error?.error ||
                           'Error al generar el cobro. Intente nuevamente.';
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/cobros']);
  }

  // Getters para el formulario
  get montoControl() { return this.cobroForm.get('monto'); }
  get fechaCobroControl() { return this.cobroForm.get('fechaCobro'); }
  get fechaVencimientoControl() { return this.cobroForm.get('fechaVencimiento'); }
  get conceptoControl() { return this.cobroForm.get('concepto'); }
  get tipoComprobanteControl() { return this.cobroForm.get('tipoComprobante'); }
  get estadoControl() { return this.cobroForm.get('estado'); }
  get idClubControl() { return this.cobroForm.get('idClub'); }
}

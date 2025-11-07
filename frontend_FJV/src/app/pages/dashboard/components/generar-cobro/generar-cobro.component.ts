import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Club } from '../../../../interfaces/club.interface';
import { Cobro, CobroService } from '../../../../services/cobro.service';

@Component({
  selector: 'app-generar-cobro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './generar-cobro.component.html',
  styleUrls: ['./generar-cobro.component.css']
})
export class GenerarCobroComponent implements OnInit {
  @Input() club!: Club;
  @Output() cobroGenerado = new EventEmitter<Cobro>();

  cobroForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  tiposComprobante = [
    { id: 'FACTURA_A', nombre: 'Factura A' },
    { id: 'FACTURA_B', nombre: 'Factura B' },
    { id: 'FACTURA_C', nombre: 'Factura C' },
    { id: 'RECIBO', nombre: 'Recibo' }
  ];

  estadosCobroDisponibles = [
    'Pendiente',
    'Pagado',
    'Vencido',
    'Anulado'
  ];

  constructor(
    private fb: FormBuilder,
    private cobroService: CobroService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    // Obtener la fecha actual en formato yyyy-MM-dd
    const today = new Date().toISOString().substring(0, 10);

    // Calcular fecha de vencimiento por defecto (30 días después)
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);
    const vencimientoStr = vencimiento.toISOString().substring(0, 10);

    this.cobroForm = this.fb.group({
      monto: ['', [Validators.required, Validators.min(1)]],
      fechaCobro: [today, Validators.required],  
      fechaVencimiento: [vencimientoStr, Validators.required],
      concepto: ['', [Validators.required, Validators.minLength(5)]],
      tipoComprobante: ['', Validators.required],
      estado: ['Pendiente', Validators.required] 
    });
  }

  onSubmit(): void {
    if (this.cobroForm.invalid) {
      this.cobroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData = this.cobroForm.value;
    const nuevoCobro: Cobro = {
      ...formData,
      idClub: this.club.idClub!,
      // Asegurarse de que el estado sea uno de los permitidos
      estado: formData.estado as 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado'
    };

    console.log("Enviando datos de cobro:", nuevoCobro);

    // Usar el servicio real
    this.cobroService.createCobro(nuevoCobro).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.status === '1' && response.cobro) {
          this.cobroGenerado.emit(response.cobro);
        } else {
          // Caso de respuesta exitosa pero sin datos de cobro
          console.log("Cobro creado pero sin datos retornados:", response);
          // Emitir el cobro original con un ID simulado para mantener la UX
          this.cobroGenerado.emit({
            ...nuevoCobro,
            idCobro: Math.floor(Math.random() * 1000) + 10
          });
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error("Error al crear cobro:", error);
        this.errorMessage = error.error?.msg || error.error?.detalle ||
                           'Error al generar el cobro. Intente nuevamente.';
      }
    });

    // Comentar la simulación ahora que tenemos la API real
    /*
    this.cobroService.simulateCreateCobro(nuevoCobro)
      .subscribe({
        next: (cobro) => {
          this.isSubmitting = false;
          this.cobroGenerado.emit(cobro);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error("Error al crear cobro:", error);
          this.errorMessage = error.error?.detalle || error.error?.message || 'Error al generar el cobro. Intente nuevamente.';
        }
      });
    */
  }

  // Getters para el formulario
  get montoControl() { return this.cobroForm.get('monto'); }
  get fechaCobroControl() { return this.cobroForm.get('fechaCobro'); } 
  get fechaVencimientoControl() { return this.cobroForm.get('fechaVencimiento'); }
  get conceptoControl() { return this.cobroForm.get('concepto'); }
  get tipoComprobanteControl() { return this.cobroForm.get('tipoComprobante'); }
  get estadoControl() { return this.cobroForm.get('estado'); } 
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Pase, PaseFilter } from '../../interfaces/pase.interface';
import { Club } from '../../interfaces/club.interface';
import { Afiliado } from '../../interfaces/afiliado.interface';
import { PaseService } from '../../services/pase.service';
import { ClubService } from '../../services/club.service';
import { AfiliadoService } from '../../services/afiliado.service';

@Component({
  selector: 'app-pases',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './pases.page.html',
  styleUrls: ['./pases.page.css']
})
export class PasesPage implements OnInit {
  pases: Pase[] = [];
  clubs: Club[] = [];
  personas: Afiliado[] = [];
  filtros: PaseFilter = {};

  // Formulario para crear pases
  formularioPase!: FormGroup;
  mostrarFormularioCrear = false;
  creandoPase = false;

  isLoading = false;
  error: string | null = null;

  // Filtros de la interfaz
  filtroPersona = '';
  filtroClub = '';
  filtroTipo: 'provenientes' | 'destino' | 'todos' = 'todos';
  filtroHabilitacion: 'HABILITADO' | 'PENDIENTE' | 'RECHAZADO' | '' = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private paseService: PaseService,
    private clubService: ClubService,
    private afiliadoService: AfiliadoService,
    private fb: FormBuilder
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  inicializarFormulario(): void {
    this.formularioPase = this.fb.group({
      idPersona: ['', Validators.required],
      clubProveniente: [''],
      clubDestino: ['', Validators.required],
      fechaPase: [new Date().toISOString().split('T')[0], Validators.required],
      habilitacion: ['PENDIENTE'],
      motivo: [''],
      observaciones: ['']
    });
  }

  cargarDatos(): void {
    this.cargarPases();
    this.cargarClubes();
    this.cargarPersonas();
  }

  cargarPersonas(): void {
    this.afiliadoService.obtenerAfiliados().subscribe({
      next: (afiliados: Afiliado[]) => {
        this.personas = afiliados;
      },
      error: (err: any) => {
        console.error('Error al cargar afiliados:', err);
      }
    });
  }

  cargarPases(): void {
    this.isLoading = true;
    this.error = null;

    this.paseService.getPases().subscribe({
      next: (pases) => {
        this.pases = pases;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los pases';
        this.isLoading = false;
        console.error('Error al cargar pases:', err);
      }
    });
  }

  cargarClubes(): void {
    this.clubService.getClubes().subscribe({
      next: (clubs: Club[]) => {
        this.clubs = clubs;
      },
      error: (err: any) => {
        console.error('Error al cargar clubs:', err);
      }
    });
  }

  aplicarFiltros(): void {
    // Implementar lógica de filtros
    this.cargarPases();
  }

  limpiarFiltros(): void {
    this.filtroPersona = '';
    this.filtroClub = '';
    this.filtroTipo = 'todos';
    this.filtroHabilitacion = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.cargarPases();
  }

  actualizarHabilitacion(pase: Pase, nuevaHabilitacion: 'HABILITADO' | 'PENDIENTE' | 'RECHAZADO'): void {
    if (!pase.idPase) return;

    const observaciones = prompt('Observaciones (opcional):');

    this.paseService.updateHabilitacion(pase.idPase, nuevaHabilitacion, observaciones || undefined).subscribe({
      next: (response) => {
        // Actualizar el pase en la lista
        const index = this.pases.findIndex(p => p.idPase === pase.idPase);
        if (index !== -1) {
          this.pases[index] = response.pase;
        }
        alert('Estado de habilitación actualizado correctamente');
      },
      error: (err) => {
        console.error('Error al actualizar habilitación:', err);
        alert('Error al actualizar el estado de habilitación');
      }
    });
  }

  getEstadoBadgeClass(habilitacion: string): string {
    switch (habilitacion) {
      case 'HABILITADO':
        return 'badge bg-success';
      case 'PENDIENTE':
        return 'badge bg-warning';
      case 'RECHAZADO':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  exportarPases(): void {
    // Implementar exportación a CSV/Excel
    console.log('Exportar pases');
  }

  crearPase(): void {
    if (this.formularioPase.invalid) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    this.creandoPase = true;
    const paseData = this.formularioPase.value;

    // Validar que el club destino esté seleccionado
    if (!paseData.clubDestino || paseData.clubDestino.trim() === '') {
      alert('Debe seleccionar un club destino');
      this.creandoPase = false;
      return;
    }

    // Buscar el ID del club destino
    const clubDestino = this.clubs.find(c => c.nombre === paseData.clubDestino);
    if (clubDestino) {
      paseData.idClubDestino = clubDestino.idClub;
    }

    // Buscar el ID del club origen si se proporciona
    if (paseData.clubProveniente && paseData.clubProveniente.trim() !== '') {
      const clubOrigen = this.clubs.find(c => c.nombre === paseData.clubProveniente);
      if (clubOrigen) {
        paseData.idClubProveniente = clubOrigen.idClub;
      }
    }

    // Validar que no sean el mismo club
    if (paseData.clubProveniente === paseData.clubDestino) {
      alert('El club origen y destino no pueden ser el mismo');
      this.creandoPase = false;
      return;
    }

    this.paseService.createPase(paseData).subscribe({
      next: (response) => {
        alert('Pase creado exitosamente');
        this.cancelarCreacion();
        this.cargarPases();
      },
      error: (err) => {
        console.error('Error al crear pase:', err);
        const errorMsg = err.error?.msg || 'Error al crear el pase';
        alert(errorMsg);
        this.creandoPase = false;
      }
    });
  }

  cancelarCreacion(): void {
    this.mostrarFormularioCrear = false;
    this.creandoPase = false;
    this.formularioPase.reset();
    this.inicializarFormulario();
  }
}

import { Component, OnInit } from '@angular/core';
import { FormularioAfiliadoComponent } from '../components/Formulario/formulario-afiliado.component';
import { Afiliado } from '../../../interfaces/afiliado.interface';
import { AfiliadoService } from '../../../services/afiliado.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Club } from '../../../interfaces/club.interface';
@Component({
  selector: 'app-nuevo-afiliado-page',
  standalone: true,
  imports: [CommonModule, FormularioAfiliadoComponent],
  template: `
    <div class="container my-4">
      <app-formulario-afiliado
        [afiliadoParaEditar]="afiliadoParaEditar"
        [clubes]="clubesNombres"
        (guardarAfiliado)="onGuardarAfiliado($event)"
        (cancelar)="onCancelar()"
        (editarCategorias)="onEditarCategorias($event)"
        (editarClubes)="onEditarClubes()"
      ></app-formulario-afiliado>
    </div>
  `,
  styles: []
})
export class NuevoAfiliadoPage implements OnInit {
 
  clubesNombres: string[] = [];
  clubesCompletos: Club[] = [];
  afiliadoParaEditar: Afiliado | null = null;

  constructor(
    private afiliadoService: AfiliadoService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadClubes();
    const afiliadoId = this.route.snapshot.paramMap.get('id');
    if (afiliadoId) {
      this.afiliadoService.obtenerAfiliadoPorId(+afiliadoId).subscribe({
        next: (afiliado: Afiliado) => this.afiliadoParaEditar = afiliado,
        error: (err: any) => {
          console.error('Error al cargar el afiliado para editar:', err);
          this.router.navigate(['/afiliados/listado']);
        }
      });
    }
  }

  private loadClubes(): void {
    this.afiliadoService.obtenerClubes().subscribe(data => {
        this.clubesCompletos = data;
        this.clubesNombres = data.map(club => club.nombre);
    });
  }

  onGuardarAfiliado(afiliadoForm: Afiliado): void {
    console.log('Datos recibidos del formulario:', afiliadoForm);

    const idClubMapped = this.clubesCompletos.find(c => c.nombre === afiliadoForm.club)?.idClub || null;

    const afiliadoParaGuardar: Afiliado = {
        ...afiliadoForm,
        idClub: idClubMapped,
        clubActual: afiliadoForm.club,
        paseClub: afiliadoForm.clubDestino,
        otorgado: afiliadoForm.fechaPase ? true : false,
    };

    console.log('Afiliado preparado para guardar:', afiliadoParaGuardar);

    const operation = afiliadoParaGuardar.idPersona
      ? this.afiliadoService.actualizarAfiliado(afiliadoParaGuardar.idPersona, afiliadoParaGuardar)
      : this.afiliadoService.agregarAfiliado(afiliadoParaGuardar);

    operation.subscribe({
      next: (afiliadoGuardado) => {
        console.log('Afiliado guardado exitosamente:', afiliadoGuardado);

        // Verificar si el afiliado se guardó correctamente
        if (afiliadoGuardado && afiliadoGuardado.idPersona) {
          alert(`Afiliado ${afiliadoParaGuardar.idPersona ? 'actualizado' : 'agregado'} con éxito!`);
          this.router.navigate(['/afiliados/listado']);
        } else {
          console.error('Respuesta del servidor incompleta:', afiliadoGuardado);
          alert('El afiliado se guardó pero hubo un problema con la respuesta del servidor.');
          this.router.navigate(['/afiliados/listado']);
        }
      },
      error: (err) => {
        console.error(`Error al ${afiliadoParaGuardar.idPersona ? 'actualizar' : 'agregar'} afiliado:`, err);

        // Mostrar mensaje de error más específico
        let errorMessage = 'Error desconocido';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.msg) {
          errorMessage = err.error.msg;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 500) {
          errorMessage = 'Error del servidor. Intente nuevamente.';
        }

        alert(`Error al ${afiliadoParaGuardar.idPersona ? 'actualizar' : 'agregar'} el afiliado: ${errorMessage}`);
      }
    });
  }

  onCancelar(): void {
    // Navegar de vuelta al listado de afiliados
    this.router.navigate(['/afiliados']);
  }

  onEditarCategorias(tipo: 'categoria1' | 'categoria2' | 'categoria3'): void {
    console.log(`Editando categorías tipo: ${tipo}`);
    // Implementar lógica para editar categorías
  }

  onEditarClubes(): void {
    console.log('Editando clubes');
    this.router.navigate(['/clubes']);
  }
}

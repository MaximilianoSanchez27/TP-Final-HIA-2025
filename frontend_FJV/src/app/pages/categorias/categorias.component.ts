import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoriaService } from '../../services/categoria.service';
import { Categoria } from '../../interfaces/categoria.interface';

@Component({
  standalone: true,
  selector: 'app-categorias',
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class CategoriasPage implements OnInit {
  form: FormGroup;
  categorias: Categoria[] = [];
  editando: boolean = false;
  idEditando: number | null = null;
  filtroNombre: string = '';

  tipos = [
    { valor: 'categoria1', label: 'Categoría 1 (Tipo de afiliado)' },
    { valor: 'categoria2', label: 'Categoría 2 (División)' },
    { valor: 'categoria3', label: 'Categoría 3 (Nivel de competencia)' },
  ];

  constructor(private fb: FormBuilder, private categoriaService: CategoriaService) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      tipo: ['', Validators.required],
      edadMinima: [''],
      edadMaxima: [''],
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.categoriaService.getCategorias().subscribe(data => {
      this.categorias = data;
    });
  }

  onGuardar(): void {
    if (this.form.invalid) return;

    const nuevaCategoria = {
      nombre: this.form.get('nombre')?.value,
      tipo: this.form.get('tipo')?.value,
      edadMinima: this.form.get('edadMinima')?.value || null,
      edadMaxima: this.form.get('edadMaxima')?.value || null,
    };

    if (this.editando && this.idEditando !== null) {
      // Actualizar categoría
      this.categoriaService.updateCategoria(this.idEditando, nuevaCategoria).subscribe({
        next: () => {
          this.cargarCategorias();
          this.resetFormulario();
        },
        error: err => {
          console.error('Error actualizando categoría', err);
        }
      });
    } else {
      // Crear categoría nueva
      this.categoriaService.createCategoria(nuevaCategoria).subscribe({
        next: () => {
          this.cargarCategorias();
          this.resetFormulario();
        },
        error: err => {
          console.error('Error creando categoría', err);
        }
      });
    }
  }

  onEditar(categoria: Categoria): void {
    this.editando = true;
    this.idEditando = categoria.idCategoria;
    this.form.patchValue({
      nombre: categoria.nombre,
      tipo: categoria.tipo,
    });
  }

  onEliminar(id: number): void {
    if (confirm('¿Estás seguro de eliminar esta categoría?')) {
      this.categoriaService.deleteCategoria(id).subscribe(() => {
        this.cargarCategorias();
      });
    }
  }

  resetFormulario(): void {
    this.editando = false;
    this.idEditando = null;
    this.form.reset();
  }

 filtroTipo: string = '';

filtrar(): Categoria[] {
  return this.categorias.filter(c =>
    (this.filtroTipo === '' || c.tipo === this.filtroTipo) &&
    c.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase())
  );
}

  getTipoLabel(valor: string): string {
    const tipo = this.tipos.find(t => t.valor === valor);
    return tipo ? tipo.label : valor;
  }

}

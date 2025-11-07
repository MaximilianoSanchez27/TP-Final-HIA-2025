import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NoticiaService } from '../../../services/noticia.service';
import {
  Noticia,
  Bloque,
  BloqueTexto,
  BloqueImagen,
  BloqueGaleria,
  CategoriaOption
} from '../../../models/noticia.model';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, map } from 'rxjs';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

enum TipoBloque {
  TEXTO = 'texto',
  IMAGEN = 'imagen',
  GALERIA = 'galeria'
}

interface BloqueTemporal {
  id: string;
  tipo: TipoBloque;
  form: FormGroup;
}

@Component({
  selector: 'app-editor-noticia',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ImageUploadComponent],
  templateUrl: './editor-noticia.component.html',
  styleUrls: ['./editor-noticia.component.css']
})
export class EditorNoticiaComponent implements OnInit {
  @ViewChild('bloqueContainer') bloqueContainer!: ElementRef;

  noticiaForm!: FormGroup;
  modoEdicion = false;
  idNoticia: number | null = null;
  isLoading = false;
  isSaving = false;
  error = '';

  // Lista de bloques que se están editando
  bloques: BloqueTemporal[] = [];

  // Datos para selects
  categorias: CategoriaOption[] = [];
  estados = [
    { valor: 'BORRADOR', etiqueta: 'Borrador' },
    { valor: 'ACTIVO', etiqueta: 'Publicada' },
    { valor: 'INACTIVO', etiqueta: 'Inactiva' }
  ];

  // Para guardar temporalmente el bloque que se está arrastrando
  draggedItem: BloqueTemporal | null = null;

  // Enumeraciones para uso en template
  tiposBloque = TipoBloque;

  // Esta variable almacenará el título original para comparar cambios
  tituloOriginal: string = '';
  slugExiste: boolean = false;
  verificandoSlug: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    // Cambiar a público para que sea accesible desde la plantilla
    public noticiaService: NoticiaService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.inicializarForm();
    this.cargarCategorias();
    this.configurarVerificacionTitulo();

    // Verificar si estamos en modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion = true;
      this.idNoticia = parseInt(id);
      this.cargarNoticia(this.idNoticia);
    }
  }

  private inicializarForm(): void {
    this.noticiaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
      resumen: ['', [Validators.maxLength(500)]],
      imagenPrincipal: [''],
      imagenPrincipalAlt: ['', [Validators.maxLength(200)]],
      estado: ['BORRADOR', Validators.required],
      fechaProgramada: [null],
      categoria: ['GENERAL', Validators.required],
      etiquetas: [''],
      destacado: [false]
    });
  }

  private configurarVerificacionTitulo(): void {
    // Observar cambios en el título para verificar duplicados y actualizar previsualización de slug
    this.noticiaForm.get('titulo')?.valueChanges
      .pipe(
        debounceTime(500), 
        distinctUntilChanged(), 
        switchMap(titulo => {
          if (!titulo || titulo.length < 5) {
            this.slugExiste = false;
            return of({ slug: '', existe: false });
          }

          // Si estamos en modo edición y el título es el mismo que el original, no verificar
          if (this.modoEdicion && titulo === this.tituloOriginal) {
            this.slugExiste = false;
            return of({ slug: this.noticiaService.generateSlug(titulo), existe: false });
          }

          this.verificandoSlug = true;

          // Generar el slug para verificar
          // Usar el endpoint del backend para generar el slug
          return this.noticiaService.generarSlugBackend(titulo).pipe(
            catchError(() => {
              // Si falla la generación del backend, usar la generación local
              return of({ slug: this.noticiaService.generateSlug(titulo) });
            }),
            switchMap(slugResponse => {
              const slug = slugResponse.slug;

              // Verificar si existe una noticia con ese slug
              return this.noticiaService.verificarSlug(slug).pipe(
                map(resultado => {
                  return {
                    slug: slug,
                    existe: resultado.existe
                  };
                }),
                catchError(() => {
                  // En caso de error, asumimos que no existe
                  return of({ slug: slug, existe: false });
                })
              );
            })
          );
        })
      )
      .subscribe(resultado => {
        this.verificandoSlug = false;

        if (resultado) {
          this.slugExiste = resultado.existe;

          if (this.slugExiste) {
            // Si el slug existe, mostrar un mensaje de advertencia
            this.noticiaForm.get('titulo')?.setErrors({ slugExistente: true });
          }
        }
      });
  }

  cargarCategorias(): void {
    this.noticiaService.getCategorias().subscribe({
      next: (response) => {
        this.categorias = response.categorias;
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.error = 'No se pudieron cargar las categorías';
      }
    });
  }

  cargarNoticia(id: number): void {
    this.isLoading = true;
    this.error = '';

    this.noticiaService.getNoticia(id).subscribe({
      next: (response) => {
        const noticia = response.noticia;
        this.tituloOriginal = noticia.titulo; 
        this.noticiaForm.patchValue({
          titulo: noticia.titulo,
          resumen: noticia.resumen || '',
          imagenPrincipal: noticia.imagenPrincipal || '',
          imagenPrincipalAlt: noticia.imagenPrincipalAlt || '',
          estado: noticia.estado,
          fechaProgramada: noticia.fechaProgramada ? new Date(noticia.fechaProgramada).toISOString().split('T')[0] : null,
          categoria: noticia.categoria,
          etiquetas: noticia.etiquetas || '',
          destacado: noticia.destacado
        });

        // Cargar bloques
        if (noticia.bloques && Array.isArray(noticia.bloques)) {
          this.cargarBloques(noticia.bloques);
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Error al cargar la noticia';
        console.error('Error al cargar noticia:', err);
      }
    });
  }

  cargarBloques(bloques: Bloque[]): void {
    // Ordenar bloques por orden
    const bloquesOrdenados = [...bloques].sort((a, b) => a.orden - b.orden);

    // Crear FormGroup para cada bloque
    bloquesOrdenados.forEach(bloque => {
      this.agregarBloqueExistente(bloque);
    });
  }

  agregarBloqueExistente(bloque: Bloque): void {
    const id = `bloque-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Crear FormGroup según el tipo
    let formBloque: FormGroup;

    switch (bloque.tipo) {
      case TipoBloque.TEXTO:
        formBloque = this.fb.group({
          tipo: [bloque.tipo],
          orden: [bloque.orden],
          contenido: [(bloque as BloqueTexto).contenido, [Validators.required]]
        });
        break;

      case TipoBloque.IMAGEN:
        const bloqueImagen = bloque as BloqueImagen;
        formBloque = this.fb.group({
          tipo: [bloque.tipo],
          orden: [bloque.orden],
          url: [bloqueImagen.url, [Validators.required]],
          alt: [bloqueImagen.alt || ''],
          caption: [bloqueImagen.caption || ''],
          ancho: [bloqueImagen.ancho || 'auto'],
          alineacion: [bloqueImagen.alineacion || 'center']
        });
        break;

      case TipoBloque.GALERIA:
        const bloqueGaleria = bloque as BloqueGaleria;

        // Crear FormArray para imágenes
        const imagenesFormArray = this.fb.array([] as FormGroup[]);
        bloqueGaleria.imagenes.forEach(img => {
          // Crear FormGroup para cada imagen
          const imgForm = this.fb.group({
            url: [img.url, [Validators.required]],
            alt: [img.alt || ''],
            caption: [img.caption || '']
          });
          // Usar .push() del FormArray que acepta FormGroup
          (imagenesFormArray as FormArray).push(imgForm);
        });

        formBloque = this.fb.group({
          tipo: [bloque.tipo],
          orden: [bloque.orden],
          columnas: [bloqueGaleria.columnas || 2],
          imagenes: imagenesFormArray
        });
        break;

      default:
        throw new Error(`Tipo de bloque no válido: ${bloque.tipo}`);
    }

    // Agregar el bloque a la lista
    this.bloques.push({
      id,
      tipo: bloque.tipo as TipoBloque,
      form: formBloque
    });
  }

  // Crear un nuevo bloque
  crearBloque(tipo: TipoBloque): void {
    const id = `bloque-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let formBloque: FormGroup;

    switch (tipo) {
      case TipoBloque.TEXTO:
        formBloque = this.fb.group({
          tipo: [tipo],
          orden: [this.bloques.length + 1],
          contenido: ['', [Validators.required]]
        });
        break;

      case TipoBloque.IMAGEN:
        formBloque = this.fb.group({
          tipo: [tipo],
          orden: [this.bloques.length + 1],
          url: ['', [Validators.required]],
          alt: [''],
          caption: [''],
          ancho: ['auto'],
          alineacion: ['center']
        });
        break;

      case TipoBloque.GALERIA:
        formBloque = this.fb.group({
          tipo: [tipo],
          orden: [this.bloques.length + 1],
          columnas: [2],
          imagenes: this.fb.array([this.crearImagenGaleriaForm()])
        });
        break;

      default:
        throw new Error(`Tipo de bloque no válido: ${tipo}`);
    }

    this.bloques.push({
      id,
      tipo,
      form: formBloque
    });

    // Hacer scroll al nuevo bloque
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  crearImagenGaleriaForm(): FormGroup {
    return this.fb.group({
      url: ['', [Validators.required]],
      alt: [''],
      caption: ['']
    });
  }

  // Obtener el FormArray de imágenes para un bloque galería
  getImagenesFormArray(bloque: BloqueTemporal): FormArray {
    return bloque.form.get('imagenes') as FormArray;
  }

  // Agregar una imagen a una galería
  agregarImagenGaleria(bloque: BloqueTemporal): void {
    const imagenes = this.getImagenesFormArray(bloque);
    const nuevoForm = this.crearImagenGaleriaForm();
    // Usar cast explícito para solucionar el problema de tipos
    (imagenes as FormArray).push(nuevoForm);
  }

  // Eliminar una imagen de una galería
  eliminarImagenGaleria(bloque: BloqueTemporal, index: number): void {
    const imagenes = this.getImagenesFormArray(bloque);
    if (imagenes.length > 1) {
      imagenes.removeAt(index);
    } else {
      alert('La galería debe tener al menos una imagen.');
    }
  }

  // Eliminar un bloque
  eliminarBloque(index: number): void {
    if (confirm('¿Está seguro que desea eliminar este bloque?')) {
      this.bloques.splice(index, 1);
      this.actualizarOrdenBloques();
    }
  }

  // Mover un bloque
  moverBloque(direccion: 'arriba' | 'abajo', index: number): void {
    if (direccion === 'arriba' && index > 0) {
      const temp = this.bloques[index];
      this.bloques[index] = this.bloques[index - 1];
      this.bloques[index - 1] = temp;
      this.actualizarOrdenBloques();
    } else if (direccion === 'abajo' && index < this.bloques.length - 1) {
      const temp = this.bloques[index];
      this.bloques[index] = this.bloques[index + 1];
      this.bloques[index + 1] = temp;
      this.actualizarOrdenBloques();
    }
  }

  actualizarOrdenBloques(): void {
    this.bloques.forEach((bloque, index) => {
      bloque.form.get('orden')!.setValue(index + 1);
    });
  }

  // Métodos para drag & drop
  onDragStart(bloque: BloqueTemporal): void {
    this.draggedItem = bloque;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (this.draggedItem) {
      const currentIndex = this.bloques.findIndex(b => b.id === this.draggedItem!.id);
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        // Eliminar de la posición actual
        const [removedBloque] = this.bloques.splice(currentIndex, 1);
        // Insertar en la nueva posición
        this.bloques.splice(targetIndex, 0, removedBloque);
        this.actualizarOrdenBloques();
      }
      this.draggedItem = null;
    }
  }

  // Preparar los datos para guardar
  prepararNoticia(): Noticia {
    const formValues = this.noticiaForm.value;

    // Generar slug a partir del título actual, asegurándonos de usar todo el título
    const slug = this.noticiaService.generateSlug(formValues.titulo);

    // Convertir los bloques FormGroup a estructura de bloques
    const bloques: Bloque[] = this.bloques.map((bloque, index) => {
      const formBloque = bloque.form.value;

      switch (bloque.tipo) {
        case TipoBloque.TEXTO:
          return {
            tipo: 'texto' as const,
            orden: index + 1,
            contenido: formBloque.contenido
          };

        case TipoBloque.IMAGEN:
          return {
            tipo: 'imagen' as const,
            orden: index + 1,
            url: formBloque.url,
            alt: formBloque.alt,
            caption: formBloque.caption,
            ancho: formBloque.ancho,
            alineacion: formBloque.alineacion
          };

        case TipoBloque.GALERIA:
          return {
            tipo: 'galeria' as const,
            orden: index + 1,
            columnas: formBloque.columnas,
            imagenes: formBloque.imagenes
          };

        default:
          throw new Error(`Tipo de bloque no válido: ${bloque.tipo}`);
      }
    });

    // Crear objeto noticia con slug actualizado
    const noticia: Noticia = {
      titulo: formValues.titulo,
      resumen: formValues.resumen,
      bloques,
      imagenPrincipal: formValues.imagenPrincipal,
      imagenPrincipalAlt: formValues.imagenPrincipalAlt,
      estado: formValues.estado,
      fechaProgramada: formValues.fechaProgramada,
      categoria: formValues.categoria,
      etiquetas: formValues.etiquetas,
      destacado: formValues.destacado,
      slug: slug 
    };

    // Si es edición, incluir el ID y marcar que debe actualizarse el slug
    if (this.modoEdicion && this.idNoticia) {
      noticia.idNoticia = this.idNoticia;

      // Si el título ha cambiado, indicar explícitamente que debe actualizarse el slug
      if (formValues.titulo !== this.tituloOriginal) {
        console.log('Título modificado, actualizando slug:', {
          original: this.tituloOriginal,
          nuevo: formValues.titulo,
          slugGenerado: slug,
          tituloCompleto: true
        });

        // Forzar la actualización del slug
        noticia.actualizarSlug = true;
      }
    }

    return noticia;
  }

  // Guardar la noticia
  guardarNoticia(): void {
    if (this.noticiaForm.invalid) {
      this.noticiaForm.markAllAsTouched();

      // Verificar específicamente error de slug duplicado
      if (this.noticiaForm.get('titulo')?.hasError('slugExistente')) {
        alert('Ya existe una noticia con un título similar. Por favor, modifique el título para que sea único.');
        return;
      }

      alert('Hay errores en el formulario. Por favor revise los campos.');
      return;
    }

    if (this.bloques.length === 0) {
      alert('Debe agregar al menos un bloque de contenido.');
      return;
    }

    // Verificar que todos los bloques son válidos
    let bloquesInvalidos = false;
    this.bloques.forEach(bloque => {
      if (bloque.form.invalid) {
        bloque.form.markAllAsTouched();
        bloquesInvalidos = true;
      }
    });

    if (bloquesInvalidos) {
      alert('Hay errores en algunos bloques. Por favor revise el contenido.');
      return;
    }

    const noticia = this.prepararNoticia();

    // Agregar log para verificar que el slug se está generando correctamente
    console.log('Guardando noticia con datos:', {
      titulo: noticia.titulo,
      slug: noticia.slug,
      actualizarSlug: noticia.actualizarSlug || false,
      modoEdicion: this.modoEdicion,
      tituloTruncado: noticia.titulo?.length > 30 ? true : false
    });

    this.isSaving = true;

    const operation = this.modoEdicion
      ? this.noticiaService.actualizarNoticia(this.idNoticia!, noticia)
      : this.noticiaService.crearNoticia(noticia);

    operation.subscribe({
      next: (response) => {
        this.isSaving = false;
        console.log('Noticia guardada con éxito. Respuesta del servidor:', {
          msg: response.msg,
          slug: response.noticia.slug,
          slugCoincideConTitulo: this.noticiaService.generateSlug(response.noticia.titulo) === response.noticia.slug
        });

        // Actualizar slug en el formulario si el backend devolvió uno diferente
        if (noticia.slug !== response.noticia.slug) {
          console.log('El backend ha modificado el slug:', {
            original: noticia.slug,
            nuevo: response.noticia.slug
          });
        }

        alert(response.msg);
        this.router.navigate(['/admin/noticias/listado']);
      },
      error: (err) => {
        this.isSaving = false;
        this.error = err.error?.msg || 'Error al guardar la noticia';
        console.error('Error al guardar noticia:', err);
        alert(`Error: ${this.error}`);
      }
    });
  }

  // Cancelar la edición
  cancelar(): void {
    if (confirm('¿Está seguro que desea cancelar? Se perderán los cambios no guardados.')) {
      this.location.back();
    }
  }

  // Utilidades para template
  get tituloControl() { return this.noticiaForm.get('titulo'); }
  get resumenControl() { return this.noticiaForm.get('resumen'); }
  get imagenPrincipalControl() { return this.noticiaForm.get('imagenPrincipal'); }
  get estadoControl() { return this.noticiaForm.get('estado'); }
  get categoriaControl() { return this.noticiaForm.get('categoria'); }

  // Método auxiliar para mostrar mensaje de error por slug duplicado
  get tituloErrorMsg(): string {
    const control = this.noticiaForm.get('titulo');

    if (control?.hasError('required')) {
      return 'El título es obligatorio';
    }

    if (control?.hasError('minlength')) {
      return 'El título debe tener al menos 5 caracteres';
    }

    if (control?.hasError('maxlength')) {
      return 'El título no debe exceder los 300 caracteres';
    }

    if (control?.hasError('slugExistente')) {
      return 'Ya existe una noticia con un título similar';
    }

    return '';
  }

  // Agregar método para generar slug desde el componente
  generateSlug(texto: string): string {
    return this.noticiaService.generateSlug(texto);
  }

  // Método para obtener previsualización del slug
  getSlugPreview(titulo: string): string {
    if (!titulo) return '';
    return this.noticiaService.generateSlug(titulo);
  }

  // Método para manejar imagen subida para la imagen principal
  onMainImageUploaded(imageUrl: string): void {
    this.noticiaForm.get('imagenPrincipal')?.setValue(imageUrl);
  }

  // Método para manejar eliminación de imagen principal
  onMainImageRemoved(): void {
    this.noticiaForm.get('imagenPrincipal')?.setValue('');
  }

  // Método para manejar imagen subida para un bloque de imagen
  onBloqueImageUploaded(bloqueId: string, imageUrl: string): void {
    const bloque = this.bloques.find(b => b.id === bloqueId);
    if (bloque) {
      bloque.form.get('url')?.setValue(imageUrl);
    }
  }

  // Método para manejar eliminación de imagen de un bloque
  onBloqueImageRemoved(bloqueId: string): void {
    const bloque = this.bloques.find(b => b.id === bloqueId);
    if (bloque) {
      bloque.form.get('url')?.setValue('');
    }
  }

  // Método para manejar imagen subida para una imagen de galería
  onGaleriaImageUploaded(bloqueId: string, index: number, imageUrl: string): void {
    const bloque = this.bloques.find(b => b.id === bloqueId);
    if (bloque && bloque.tipo === TipoBloque.GALERIA) {
      const imagenesFormArray = this.getImagenesFormArray(bloque);
      const imageForm = imagenesFormArray.at(index);
      if (imageForm) {
        imageForm.get('url')?.setValue(imageUrl);
      }
    }
  }

  // Método para manejar eliminación de imagen de galería
  onGaleriaImageRemoved(bloqueId: string, index: number): void {
    const bloque = this.bloques.find(b => b.id === bloqueId);
    if (bloque && bloque.tipo === TipoBloque.GALERIA) {
      const imagenesFormArray = this.getImagenesFormArray(bloque);
      const imageForm = imagenesFormArray.at(index);
      if (imageForm) {
        imageForm.get('url')?.setValue('');
      }
    }
  }
}

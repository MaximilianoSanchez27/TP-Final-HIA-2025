import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscador-club',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  template: `
    <div class="input-group mb-3">
      <input
        type="text"
        class="form-control"
        placeholder="Buscar por nombre, dirección, email, teléfono o CUIT..."
        [(ngModel)]="searchTerm"
        (input)="onSearchInput()"
      />
      <button class="btn btn-outline-secondary" type="button" (click)="onClearSearch()">Limpiar</button>
    </div>
  `,
  styleUrls: ['./buscador-club.component.css'],
})
export class BuscadorClubComponent {
  searchTerm: string = '';

  @Output() searchChange = new EventEmitter<string>();

  onSearchInput(): void {
    this.searchChange.emit(this.searchTerm); 
  }

  onClearSearch(): void {
    this.searchTerm = '';
    this.searchChange.emit('');
  }
}
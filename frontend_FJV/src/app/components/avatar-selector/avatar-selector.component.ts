import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-selector.component.html',
  styleUrls: ['./avatar-selector.component.css']
})
export class AvatarSelectorComponent implements OnInit, OnChanges {
  @Input() avatar: any;
  @Input() fotoUrl?: string;
  @Output() avatarChange = new EventEmitter<any>();
  @Output() fotoSelected = new EventEmitter<File>();
  @Output() fotoRemoved = new EventEmitter<void>();

  selectedIcon = 'fas fa-user';
  selectedColor = '#6c757d';
  iconSize = '4rem';

  constructor() {}

  ngOnInit(): void {
    if (this.avatar) {
      this.selectedIcon = this.avatar.icon || 'fas fa-user';
      this.selectedColor = this.avatar.color || '#6c757d';
      this.iconSize = this.avatar.size || '4rem';
    } else {
      this.generateDefaultAvatar();
    }
    this.updateAvatar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['avatar'] && this.avatar) {
      this.selectedIcon = this.avatar.icon || 'fas fa-user';
      this.selectedColor = this.avatar.color || '#6c757d';
      this.iconSize = this.avatar.size || '4rem';
    } else if (changes['avatar'] && !this.avatar) {
      this.generateDefaultAvatar();
    }
    this.updateAvatar();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Validaciones de archivo
      const maxSize = 4 * 1024 * 1024; 
      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. El tamaño máximo permitido es 4MB.');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, GIF, WebP.');
        return;
      }

      this.fotoSelected.emit(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  }

  removeFoto(): void {
    this.fotoRemoved.emit();
  }

  private generateDefaultAvatar(): void {
    this.selectedIcon = 'fas fa-user';
    this.selectedColor = '#6c757d';
    this.iconSize = '4rem';
  }

  private updateAvatar(): void {
    const avatar = {
      icon: this.selectedIcon,
      color: this.selectedColor,
      size: this.iconSize,
      type: 'fontawesome'
    };
    this.avatarChange.emit(avatar);
  }
}

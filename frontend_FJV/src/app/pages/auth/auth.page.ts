import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="auth-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./auth.page.css']
})
export class AuthPage {}

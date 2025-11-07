import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface ActionCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-action-cards',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './action-cards.component.html',
  styleUrls: ['./action-cards.component.css']
})
export class ActionCardsComponent {
  @Input() cards: ActionCard[] = [];
}

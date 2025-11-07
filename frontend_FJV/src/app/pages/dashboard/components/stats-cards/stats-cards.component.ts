import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DashboardStats {
  totalCobros: number;
  cobrosPendientes: number;
  cobrosVencidos: number;
  totalRecaudado: number;
}

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-cards.component.html',
  styleUrls: ['./stats-cards.component.css']
})
export class StatsCardsComponent {
  @Input() statistics!: DashboardStats;

  /**
   * Formatea un número como moneda argentina
   */
  formatCurrency(amount: number): string {
    if (!amount || isNaN(amount)) {
      return '$ 0';
    }

    // Formatear con separadores de miles y símbolo de peso
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

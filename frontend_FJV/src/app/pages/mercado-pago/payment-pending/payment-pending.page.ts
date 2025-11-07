import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-pending.page.html',
  styleUrls: ['./payment-pending.page.css']
})
export class PaymentPendingPage implements OnInit {
  paymentId: string | null = null;
  merchantOrderId: string | null = null;
  preferenceId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.paymentId = params['payment_id'] || null;
      this.merchantOrderId = params['merchant_order_id'] || null;
      this.preferenceId = params['preference_id'] || null;

      console.log('Parámetros de pago pendiente:', {
        paymentId: this.paymentId,
        merchantOrderId: this.merchantOrderId,
        preferenceId: this.preferenceId
      });
    });
  }

  checkStatus(): void {
    // Aquí podrías implementar una llamada al backend para verificar el estado del pago
    window.location.reload();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCobros(): void {
    this.router.navigate(['/dashboard/cobros']);
  }
}

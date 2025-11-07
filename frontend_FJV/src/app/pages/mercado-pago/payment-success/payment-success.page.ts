import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.page.html',
  styleUrls: ['./payment-success.page.css']
})
export class PaymentSuccessPage implements OnInit {
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

      console.log('Parámetros de pago exitoso:', {
        paymentId: this.paymentId,
        merchantOrderId: this.merchantOrderId,
        preferenceId: this.preferenceId
      });
    });

    // Auto-redirigir después de 10 segundos
    setTimeout(() => {
      this.goToDashboard();
    }, 10000);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCobros(): void {
    this.router.navigate(['/dashboard/cobros']);
  }
}

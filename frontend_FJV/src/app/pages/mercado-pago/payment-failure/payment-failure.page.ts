import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-failure.page.html',
  styleUrls: ['./payment-failure.page.css']
})
export class PaymentFailurePage implements OnInit {
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

      console.log('Parámetros de pago fallido:', {
        paymentId: this.paymentId,
        merchantOrderId: this.merchantOrderId,
        preferenceId: this.preferenceId
      });
    });
  }

  tryAgain(): void {
    this.router.navigate(['/dashboard/cobros']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getHelp(): void {
    // Aquí podrías redirigir a una página de ayuda o abrir un chat de soporte
    window.open('https://www.mercadopago.com.ar/ayuda', '_blank');
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CartService } from '../../../core/services/cart.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-user-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './user-cart.component.html',
  styleUrls: ['./user-cart.component.scss'],
})
export class UserCartComponent {
  constructor(public cart: CartService, private api: ApiService, private router: Router) {}

  itemImage(image: string | null): string {
    return image ? this.api.imageUrl(image) : '';
  }

  checkout(): void {
    if (this.cart.items().length === 0) return;
    this.router.navigate(['/app/checkout']);
  }
}

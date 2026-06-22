import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../shared/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { Product } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-store',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  templateUrl: './user-store.component.html',
  styleUrls: ['./user-store.component.scss'],
})
export class UserStoreComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedType = signal('all');
  expandedId = signal<string | null>(null);

  readonly PRODUCT_TYPES: { label: string; value: string }[] = [
    { label: 'Food',      value: 'food'     },
    { label: 'Meds',      value: 'meds'     },
    { label: 'Grooming',  value: 'groom'    },
    { label: 'Supplies',  value: 'supplies' },
    { label: 'Toys',      value: 'toys'     },
    { label: 'Beds',      value: 'beds'     },
  ];

  filtered = computed(() => {
    let list = this.products().filter(p => p.isActive === true || p.isActive === 'true');
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    if (type !== 'all') list = list.filter(p => (p.type ?? '').toLowerCase() === type);
    return list;
  });

  constructor(private api: ApiService, private snack: MatSnackBar, public cart: CartService, private router: Router) {}

  addToCart(p: Product): void {
    if (!this.isInStock(p)) return;
    this.cart.add(p);
    this.snack.open(`${p.name} added to cart`, 'View cart', { duration: 2500 })
      .onAction().subscribe(() => this.router.navigate(['/app/cart']));
  }

  cartQty(p: Product): number {
    return this.cart.items().find(i => i.productId === p.productId)?.qty ?? 0;
  }

  ngOnInit(): void {
    this.api.getAllProducts().subscribe({
      next: data => { this.products.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Failed to load products', 'Close', { duration: 3000 }); },
    });
  }

  toggleExpand(productId: string): void {
    this.expandedId.set(this.expandedId() === productId ? null : productId);
  }

  imageUrl(path: string): string { return this.api.imageUrl(path); }
  firstImage(images: string | string[]): string {
    const raw = Array.isArray(images) ? images[0] : images;
    return raw ? this.api.imageUrl(raw) : '';
  }

  stockLabel(qty: number): { label: string; cls: string } {
    if (+qty === 0) return { label: 'Out of Stock', cls: 'out' };
    if (+qty < 10)  return { label: 'Low Stock',    cls: 'low' };
    return               { label: 'In Stock',       cls: 'ok'  };
  }

  isInStock(p: Product): boolean { return +p.stockQty > 0; }
}

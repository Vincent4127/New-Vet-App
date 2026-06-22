import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../shared/services/api.service';
import { Product } from '../../../core/models/user.model';
import { ProductFormDialogComponent } from './product-form-dialog.component';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatDialogModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSlideToggleModule,
  ],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss'],
})
export class AdminProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedType = signal('all');
  deleteLoading = signal<string | null>(null);

  readonly PRODUCT_TYPES: { label: string; value: string }[] = [
    { label: 'Food',      value: 'food'     },
    { label: 'Meds',      value: 'meds'     },
    { label: 'Grooming',  value: 'groom'    },
    { label: 'Supplies',  value: 'supplies' },
    { label: 'Toys',      value: 'toys'     },
    { label: 'Beds',      value: 'beds'     },
  ];

  filtered = computed(() => {
    let list = this.products();
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();

    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    }
    if (type !== 'all') {
      list = list.filter(p => (p.type ?? '').toLowerCase() === type);
    }
    return list;
  });

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(): void {
    this.loading.set(true);
    this.api.getAllProducts().subscribe({
      next: data => { this.products.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load products', 'error'); },
    });
  }

  openAdd(): void {
    const ref = this.dialog.open(ProductFormDialogComponent, {
      width: '580px',
      maxWidth: '95vw',
      data: { mode: 'add', productTypes: this.PRODUCT_TYPES },
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadProducts(); });
  }

  openEdit(product: Product): void {
    const ref = this.dialog.open(ProductFormDialogComponent, {
      width: '580px',
      maxWidth: '95vw',
      data: { mode: 'edit', product, productTypes: this.PRODUCT_TYPES },
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadProducts(); });
  }

  toggleActive(product: Product): void {
    const newState = this.isActive(product) ? false : true;
    this.api.updateProduct(product.productId, { newIsActive: newState }).subscribe({
      next: () => {
        this.products.update(list =>
          list.map(p => p.productId === product.productId ? { ...p, isActive: newState } : p)
        );
        this.toast(`Product ${newState ? 'activated' : 'deactivated'}`, 'success');
      },
      error: () => this.toast('Failed to update product status', 'error'),
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    this.deleteLoading.set(product.productId);
    this.api.deleteProduct(product.productId).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.productId !== product.productId));
        this.deleteLoading.set(null);
        this.toast('Product deleted', 'success');
      },
      error: () => { this.deleteLoading.set(null); this.toast('Failed to delete product', 'error'); },
    });
  }

  firstImage(product: Product): string {
    const img = product.images;
    const raw = Array.isArray(img) ? img[0] : img;
    return raw ? this.api.imageUrl(raw) : '';
  }

  isActive(p: Product): boolean { return p.isActive === true || p.isActive === 'true'; }

  typeLabelFor(value: string | undefined): string {
    return this.PRODUCT_TYPES.find(t => t.value === value)?.label ?? value ?? '';
  }

  stockBadge(qty: number): { label: string; cls: string } {
    if (qty === 0) return { label: 'Out of Stock', cls: 'badge-danger' };
    if (qty < 10)  return { label: 'Low Stock',    cls: 'badge-warning' };
    return              { label: 'In Stock',       cls: 'badge-success' };
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', {
      duration: 3500,
      panelClass: type === 'error' ? 'snack-error' : 'snack-success',
    });
  }
}

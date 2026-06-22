import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { Product } from '../../../core/models/user.model';

type StockFilter = 'all' | 'out' | 'low' | 'ok';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-inventory.component.scss'],
})
export class AdminInventoryComponent implements OnInit {
  products = signal<Product[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  stockFilter = signal<StockFilter>('all');
  editingQty = signal<string | null>(null);
  newQty = signal<number>(0);
  saveLoading = signal(false);

  readonly FILTERS: { value: StockFilter; label: string; cls: string }[] = [
    { value: 'all', label: 'All',         cls: '' },
    { value: 'out', label: 'Out of Stock', cls: 'danger' },
    { value: 'low', label: 'Low Stock',    cls: 'warning' },
    { value: 'ok',  label: 'In Stock',     cls: 'success' },
  ];

  filtered = computed(() => {
    let list = this.products();
    const q = this.searchQuery().toLowerCase().trim();
    const f = this.stockFilter();

    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
    if (f === 'out') list = list.filter(p => +p.stockQty === 0);
    if (f === 'low') list = list.filter(p => +p.stockQty > 0 && +p.stockQty < 10);
    if (f === 'ok')  list = list.filter(p => +p.stockQty >= 10);
    return list;
  });

  summary = computed(() => ({
    total:    this.products().length,
    outCount: this.products().filter(p => +p.stockQty === 0).length,
    lowCount: this.products().filter(p => +p.stockQty > 0 && +p.stockQty < 10).length,
    okCount:  this.products().filter(p => +p.stockQty >= 10).length,
  }));

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAllProducts().subscribe({
      next: data => { this.products.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load inventory', 'error'); },
    });
  }

  startEdit(p: Product): void {
    this.editingQty.set(p.productId);
    this.newQty.set(+p.stockQty);
  }

  cancelEdit(): void { this.editingQty.set(null); }

  saveQty(productId: string): void {
    const qty = this.newQty();
    if (qty < 0) { this.toast('Quantity cannot be negative', 'error'); return; }
    this.saveLoading.set(true);
    this.api.updateProduct(productId, { newStockQty: qty }).subscribe({
      next: () => {
        this.products.update(list =>
          list.map(p => p.productId === productId ? { ...p, stockQty: qty } : p)
        );
        this.editingQty.set(null);
        this.saveLoading.set(false);
        this.toast('Stock updated', 'success');
      },
      error: () => { this.saveLoading.set(false); this.toast('Failed to update stock', 'error'); },
    });
  }

  stockBadge(qty: number): { label: string; cls: string } {
    if (+qty === 0)  return { label: 'Out of Stock', cls: 'badge-danger' };
    if (+qty < 10)   return { label: 'Low Stock',    cls: 'badge-warning' };
    return                  { label: 'In Stock',     cls: 'badge-success' };
  }

  imageUrl(path: string): string { return this.api.imageUrl(path); }
  firstImage(images: string | string[]): string {
    const raw = Array.isArray(images) ? images[0] : images;
    return raw ? this.api.imageUrl(raw) : '';
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

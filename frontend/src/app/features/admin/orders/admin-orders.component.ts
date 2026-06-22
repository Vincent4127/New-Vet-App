import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../shared/services/api.service';
import { Order } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss'],
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  actingOn = signal<string | null>(null);

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getCurrentOrders().subscribe({
      next: res => { this.orders.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load orders', 'error'); },
    });
  }

  itemImage(image: string | null): string {
    return image ? this.api.imageUrl(image) : '';
  }

  formatDate(d: string | Date): string {
    const date = new Date(d);
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  setStatus(order: Order, status: 'confirmed' | 'cancelled'): void {
    const verb = status === 'confirmed' ? 'Confirm' : 'Cancel';
    if (!confirm(`${verb} order ${order.orderNumber}?`)) return;
    this.actingOn.set(order._id);
    this.api.updateOrderStatus(order._id, status).subscribe({
      next: () => {
        this.orders.update(list => list.filter(o => o._id !== order._id));
        this.actingOn.set(null);
        this.toast(`Order ${status}`, 'success');
      },
      error: () => { this.actingOn.set(null); this.toast('Failed to update order', 'error'); },
    });
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

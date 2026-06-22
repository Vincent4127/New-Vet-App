import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../shared/services/api.service';
import { Order } from '../../../core/models/user.model';

interface CalendarCell { day: number | null; key: string | null; count: number; }

@Component({
  selector: 'app-admin-orders-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './admin-orders-history.component.html',
  styleUrls: ['./admin-orders-history.component.scss'],
})
export class AdminOrdersHistoryComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);

  // First day of the month currently shown in the calendar
  viewMonth = signal(this.startOfMonth(new Date()));
  selectedKey = signal<string | null>(null);

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Orders grouped by the date they were placed (local YYYY-MM-DD)
  private byDate = computed(() => {
    const map = new Map<string, Order[]>();
    for (const o of this.orders()) {
      const k = this.dateKey(new Date(o.createdAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return map;
  });

  cells = computed<CalendarCell[]>(() => {
    const first = this.viewMonth();
    const year = first.getFullYear();
    const month = first.getMonth();
    const leading = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const map = this.byDate();

    const out: CalendarCell[] = [];
    for (let i = 0; i < leading; i++) out.push({ day: null, key: null, count: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = this.dateKey(new Date(year, month, d));
      out.push({ day: d, key, count: map.get(key)?.length ?? 0 });
    }
    return out;
  });

  monthLabel = computed(() =>
    this.viewMonth().toLocaleString(undefined, { month: 'long', year: 'numeric' }));

  selectedOrders = computed<Order[]>(() => {
    const k = this.selectedKey();
    if (!k) return [];
    return this.byDate().get(k) ?? [];
  });

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.api.getOrderHistory().subscribe({
      next: res => { this.orders.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Failed to load history', 'Close', { duration: 3000 }); },
    });
  }

  private startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
  private dateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  prevMonth(): void {
    const m = this.viewMonth();
    this.viewMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  nextMonth(): void {
    const m = this.viewMonth();
    this.viewMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  selectCell(cell: CalendarCell): void {
    if (!cell.key) return;
    this.selectedKey.set(this.selectedKey() === cell.key ? null : cell.key);
  }

  selectedDateLabel(): string {
    const k = this.selectedKey();
    if (!k) return '';
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  itemImage(image: string | null): string { return image ? this.api.imageUrl(image) : ''; }

  formatTime(d: string | Date): string {
    return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
}

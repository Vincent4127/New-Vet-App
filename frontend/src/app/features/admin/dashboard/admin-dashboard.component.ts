import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';

interface StatCard { label: string; value: number | string; icon: string; color: string; bg: string; route: string; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<StatCard[]>([]);
  recentAppointments = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    forkJoin({
      users:        this.api.getAllUsers(),
      products:     this.api.getAllProducts(),
      pets:         this.api.adminGetAllPets(),
      appointments: this.api.getAllAppointments(),
    }).subscribe({
      next: ({ users, products, pets, appointments }) => {
        const bookedAppts = appointments.data.filter((a: any) => a.appointment?.day);
        const lowStock    = products.filter(p => +p.stockQty < 10).length;
        const outOfStock  = products.filter(p => +p.stockQty === 0).length;

        this.stats.set([
          { label: 'Total Users',    value: users.length,          icon: 'people',           color: '#2563EB', bg: '#EFF6FF', route: '/admin/users'        },
          { label: 'Total Pets',     value: pets.data.length,      icon: 'pets',             color: '#7C3AED', bg: '#F5F3FF', route: '/admin/pets'         },
          { label: 'Appointments',   value: bookedAppts.length,    icon: 'calendar_today',   color: '#0891B2', bg: '#ECFEFF', route: '/admin/appointments' },
          { label: 'Products',       value: products.length,       icon: 'storefront',       color: '#D97706', bg: '#FFFBEB', route: '/admin/products'     },
          { label: 'Low Stock',      value: lowStock,              icon: 'warning',          color: '#DC2626', bg: '#FEF2F2', route: '/admin/inventory'    },
          { label: 'Out of Stock',   value: outOfStock,            icon: 'inventory_2',      color: '#9F1239', bg: '#FFF1F2', route: '/admin/inventory'    },
        ]);

        this.recentAppointments.set(
          appointments.data
            .filter((a: any) => a.appointment?.day)
            .slice(0, 6)
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatAppt(appt: any): string {
    if (!appt?.day) return '—';
    const h = String(appt.hour).padStart(2, '0');
    const m = String(appt.minutes).padStart(2, '0');
    return `${appt.day}/${appt.month}/${appt.year} at ${h}:${m}`;
  }
}

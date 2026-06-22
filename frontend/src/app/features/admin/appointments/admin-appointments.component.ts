import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../shared/services/api.service';

interface ApptRow {
  userId: string;
  username: string;
  email: string;
  appointment: { hour: any; minutes: any; day: any; month: any; year: any };
}

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './admin-appointments.component.html',
  styleUrls: ['./admin-appointments.component.scss'],
})
export class AdminAppointmentsComponent implements OnInit {
  appointments = signal<ApptRow[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  cancelLoading = signal<string | null>(null);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.appointments();
    return this.appointments().filter(a =>
      a.username.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    );
  });

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAllAppointments().subscribe({
      next: res => {
        const booked = res.data.filter((a: ApptRow) => a.appointment?.day && a.appointment.day !== '' && a.appointment.day !== null);
        this.appointments.set(booked);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast('Failed to load appointments', 'error'); },
    });
  }

  cancelAppt(row: ApptRow): void {
    if (!confirm(`Cancel appointment for "${row.username}"?`)) return;
    this.cancelLoading.set(row.userId);
    this.api.adminCancelAppointment(row.userId.toString()).subscribe({
      next: () => {
        this.appointments.update(list => list.filter(a => a.userId !== row.userId));
        this.cancelLoading.set(null);
        this.toast('Appointment cancelled', 'success');
      },
      error: () => { this.cancelLoading.set(null); this.toast('Failed to cancel appointment', 'error'); },
    });
  }

  formatAppt(a: any): string {
    if (!a?.day) return '—';
    const h = String(a.hour).padStart(2, '0');
    const m = String(a.minutes).padStart(2, '0');
    return `${a.day}/${a.month}/${a.year} at ${h}:${m}`;
  }

  sortedDate(a: any): number {
    if (!a?.year) return 0;
    return new Date(a.year, a.month - 1, a.day, a.hour, a.minutes).getTime();
  }

  isUpcoming(a: any): boolean {
    return this.sortedDate(a) >= Date.now();
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

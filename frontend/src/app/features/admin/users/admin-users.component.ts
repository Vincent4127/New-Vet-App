import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService } from '../../../shared/services/api.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
    MatTooltipModule, MatExpansionModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  deleteLoading = signal<string | null>(null);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q)
    );
  });

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAllUsers().subscribe({
      next: data => { this.users.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load users', 'error'); },
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.deleteLoading.set(user._id);
    this.api.deleteUser(user._id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u._id !== user._id));
        this.deleteLoading.set(null);
        this.toast('User deleted', 'success');
      },
      error: () => { this.deleteLoading.set(null); this.toast('Failed to delete user', 'error'); },
    });
  }

  hasAppointment(user: User): boolean {
    return !!user.appointment?.day && user.appointment.day !== '';
  }

  formatAppt(user: User): string {
    const a = user.appointment;
    if (!a?.day) return '—';
    const h = String(a.hour).padStart(2, '0');
    const m = String(a.minutes).padStart(2, '0');
    return `${a.day}/${a.month}/${a.year} at ${h}:${m}`;
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', {
      duration: 3500,
      panelClass: type === 'error' ? 'snack-error' : 'snack-success',
    });
  }
}

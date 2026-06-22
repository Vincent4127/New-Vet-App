import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { Pet } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './user-home.component.html',
  styleUrls: ['./user-home.component.scss'],
})
export class UserHomeComponent implements OnInit {
  loading = signal(true);
  pets = signal<Pet[]>([]);
  appointment = signal<any>(null);
  upcomingReminders = signal<{ petName: string; title: string; dueDate: any }[]>([]);

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    const uid = this.auth.getUserId();
    if (!uid) { this.loading.set(false); return; }

    forkJoin({
      pets:  this.api.getUserPets(uid).pipe(catchError(() => of([]))),
      appt:  this.api.getUserAppointment(uid).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ pets, appt }) => {
        this.pets.set(pets as Pet[]);
        this.appointment.set(appt);

        const reminders: { petName: string; title: string; dueDate: any }[] = [];
        (pets as Pet[]).forEach(p => {
          (p.reminders ?? []).forEach(r => reminders.push({ petName: p.name, title: r.title, dueDate: r.dueDate }));
        });
        reminders.sort((a, b) => this.dueDateMs(a.dueDate) - this.dueDateMs(b.dueDate));
        this.upcomingReminders.set(reminders.filter(r => this.dueDateMs(r.dueDate) >= Date.now()).slice(0, 4));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  hasAppointment(): boolean {
    const a = this.appointment();
    return !!a?.day && a.day !== '' && a.day !== null;
  }

  formatAppt(): string {
    const a = this.appointment();
    if (!this.hasAppointment()) return '';
    const h = String(a.hour).padStart(2, '0');
    const m = String(a.minutes).padStart(2, '0');
    return `${a.day}/${a.month}/${a.year} at ${h}:${m}`;
  }

  formatDueDate(d: any): string {
    if (!d?.day) return '—';
    return `${d.day}/${d.month}/${d.year}`;
  }

  petPicUrl(pet: Pet): string | null {
    return pet.profilePic ? this.api.imageUrl(pet.profilePic) : null;
  }

  petAge(dob: any): string {
    if (!dob?.year) return '';
    const now = new Date();
    let years = now.getFullYear() - dob.year;
    let months = now.getMonth() + 1 - dob.month;
    if (months < 0) { years--; months += 12; }
    if (years < 0) return '< 1m';
    return years > 0 ? `${years}y ${months}m` : `${months}m`;
  }

  private dueDateMs(d: any): number {
    if (!d?.year) return 0;
    return new Date(d.year, d.month - 1, d.day, d.hour ?? 0, d.minutes ?? 0).getTime();
  }
}

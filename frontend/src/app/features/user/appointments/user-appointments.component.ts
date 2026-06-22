import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

// Clinic opening hours: Mon–Fri 8:00–18:00, Sat 9:00–14:00, Sun closed.
// Returns { open, close } in minutes-from-midnight, or null if closed that day.
function clinicHours(dayOfWeek: number): { open: number; close: number } | null {
  if (dayOfWeek === 0) return null;                 // Sunday closed
  if (dayOfWeek === 6) return { open: 9 * 60, close: 14 * 60 };  // Saturday
  return { open: 8 * 60, close: 18 * 60 };          // Mon–Fri
}

// Cross-field validator: reject past date/times and bookings outside clinic hours.
// Uses the device clock; the backend re-checks against the server clock.
function appointmentRules(group: AbstractControl): ValidationErrors | null {
  const day = +group.get('day')?.value;
  const month = +group.get('month')?.value;
  const year = +group.get('year')?.value;
  const hour = +group.get('hour')?.value;
  const minutes = +group.get('minutes')?.value;
  if (!day || !month || !year) return null;

  const picked = new Date(year, month - 1, day, hour || 0, minutes || 0, 0, 0);
  if (isNaN(picked.getTime())) return null;

  // Past check (minute granularity so "right now" is allowed)
  const now = new Date();
  now.setSeconds(0, 0);
  if (picked.getTime() < now.getTime()) return { inPast: true };

  // Opening-hours check
  const hours = clinicHours(picked.getDay());
  if (!hours) return { closedDay: true };
  const mins = (hour || 0) * 60 + (minutes || 0);
  if (mins < hours.open || mins > hours.close) return { outsideHours: true };

  return null;
}

@Component({
  selector: 'app-user-appointments',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatProgressSpinnerModule,
  ],
  templateUrl: './user-appointments.component.html',
  styleUrls: ['./user-appointments.component.scss'],
})
export class UserAppointmentsComponent implements OnInit {
  appointment = signal<any>(null);
  loading = signal(true);
  showForm = signal(false);
  bookLoading = signal(false);
  cancelLoading = signal(false);
  bookError = signal('');
  form: FormGroup;

  // Current date parts (server-aligned reference for the UI hints / min year)
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private api: ApiService,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      day:     ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      month:   ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      year:    ['', [Validators.required, Validators.min(this.currentYear)]],
      hour:    ['', [Validators.required, Validators.min(0), Validators.max(23)]],
      minutes: ['', [Validators.required, Validators.min(0), Validators.max(59)]],
    }, { validators: appointmentRules });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.loading.set(true);
    this.api.getUserAppointment(uid).subscribe({
      next: appt => { this.appointment.set(appt); this.loading.set(false); },
      error: () => { this.appointment.set(null); this.loading.set(false); },
    });
  }

  hasAppointment(): boolean {
    const a = this.appointment();
    return !!a?.day && a.day !== '' && a.day !== null;
  }

  openBooking(): void {
    this.showForm.set(true);
    this.form.reset();
    this.bookError.set('');
  }

  cancelForm(): void { this.showForm.set(false); }

  book(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('inPast'))        this.bookError.set('You cannot book an appointment in the past.');
      else if (this.form.hasError('closedDay'))    this.bookError.set('The clinic is closed on Sundays. Please pick another day.');
      else if (this.form.hasError('outsideHours')) this.bookError.set('Please choose a time within clinic hours (Mon–Fri 8:00–18:00, Sat 9:00–14:00).');
      return;
    }
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.bookLoading.set(true);
    this.bookError.set('');
    const v = this.form.value;
    this.api.scheduleAppointment(uid, {
      day: +v.day, month: +v.month, year: +v.year,
      hour: +v.hour, minutes: +v.minutes,
    }).subscribe({
      next: () => {
        this.bookLoading.set(false);
        this.showForm.set(false);
        this.load();
        this.toast('Appointment booked!', 'success');
      },
      error: err => { this.bookLoading.set(false); this.bookError.set(err.error?.error ?? 'Failed to book appointment.'); },
    });
  }

  cancel(): void {
    if (!confirm('Cancel your appointment?')) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.cancelLoading.set(true);
    this.api.cancelAppointment(uid).subscribe({
      next: () => { this.cancelLoading.set(false); this.appointment.set(null); this.toast('Appointment cancelled', 'success'); },
      error: () => { this.cancelLoading.set(false); this.toast('Failed to cancel', 'error'); },
    });
  }

  formatAppt(): string {
    const a = this.appointment();
    if (!this.hasAppointment()) return '';
    const h = String(a.hour).padStart(2, '0');
    const m = String(a.minutes).padStart(2, '0');
    return `${a.day}/${a.month}/${a.year} at ${h}:${m}`;
  }

  isUpcoming(): boolean {
    const a = this.appointment();
    if (!this.hasAppointment()) return false;
    return new Date(a.year, a.month - 1, a.day, a.hour, a.minutes).getTime() >= Date.now();
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

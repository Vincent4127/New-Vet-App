import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { Pet } from '../../../core/models/user.model';

// The chosen date (day/month/year) must not be before today. Today is allowed.
export function dateNotPast(group: AbstractControl): ValidationErrors | null {
  const day = +group.get('day')?.value;
  const month = +group.get('month')?.value;
  const year = +group.get('year')?.value;
  if (!day || !month || !year) return null;
  const picked = new Date(year, month - 1, day);
  if (isNaN(picked.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today → today is allowed
  return picked.getTime() < today.getTime() ? { datePast: true } : null;
}

@Component({
  selector: 'app-user-records',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatExpansionModule,
    MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './user-records.component.html',
  styleUrls: ['./user-records.component.scss'],
})
export class UserRecordsComponent implements OnInit {
  pets = signal<Pet[]>([]);
  loading = signal(true);
  addingReminderFor = signal<string | null>(null);
  reminderLoading = signal(false);
  reminderError = signal('');
  reminderForm: FormGroup;
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private api: ApiService,
    private snack: MatSnackBar,
  ) {
    this.reminderForm = this.fb.group({
      title:  ['', Validators.required],
      day:    ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      month:  ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      year:   ['', [Validators.required, Validators.min(this.currentYear)]],
      hour:   [0,  [Validators.min(0), Validators.max(23)]],
      minutes:[0,  [Validators.min(0), Validators.max(59)]],
    }, { validators: dateNotPast });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.loading.set(true);
    this.api.getUserPets(uid).subscribe({
      next: data => { this.pets.set(data); this.loading.set(false); },
      error: () => { this.pets.set([]); this.loading.set(false); },
    });
  }

  startReminder(petName: string): void {
    this.addingReminderFor.set(petName);
    this.reminderForm.reset({ hour: 0, minutes: 0 });
    this.reminderError.set('');
  }

  cancelReminder(): void { this.addingReminderFor.set(null); }

  submitReminder(petName: string): void {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      if (this.reminderForm.hasError('datePast')) this.reminderError.set('Reminder date cannot be in the past.');
      return;
    }
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.reminderLoading.set(true);
    this.reminderError.set('');
    const v = this.reminderForm.value;
    const reminderId = 'rem_' + Date.now();
    this.api.addReminder(uid, petName, {
      reminderId,
      title: v.title,
      dueDate: { day: +v.day, month: +v.month, year: +v.year, hour: +v.hour, minutes: +v.minutes },
    }).subscribe({
      next: () => {
        this.reminderLoading.set(false);
        this.addingReminderFor.set(null);
        this.load();
        this.toast('Reminder added!', 'success');
      },
      error: err => { this.reminderLoading.set(false); this.reminderError.set(err.error?.error ?? 'Failed to add reminder.'); },
    });
  }

  deleteReminder(petName: string, reminderId: string): void {
    if (!confirm('Delete this reminder?')) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.api.deleteReminder(uid, petName, reminderId).subscribe({
      next: () => { this.load(); this.toast('Reminder deleted', 'success'); },
      error: () => this.toast('Failed to delete reminder', 'error'),
    });
  }

  deleteRecord(petName: string, recordId: string): void {
    if (!confirm('Delete this medical record?')) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.api.deleteMedicalRecord(uid, petName, recordId).subscribe({
      next: () => { this.load(); this.toast('Record deleted', 'success'); },
      error: () => this.toast('Failed to delete record', 'error'),
    });
  }

  formatDate(d: any): string {
    if (!d?.day) return '—';
    return `${d.day}/${d.month}/${d.year}`;
  }

  formatDue(d: any): string {
    if (!d?.day) return '—';
    const h = String(d.hour ?? 0).padStart(2, '0');
    const m = String(d.minutes ?? 0).padStart(2, '0');
    return `${d.day}/${d.month}/${d.year} ${h}:${m}`;
  }

  isOverdue(d: any): boolean {
    if (!d?.year) return false;
    return new Date(d.year, d.month - 1, d.day, d.hour ?? 0, d.minutes ?? 0).getTime() < Date.now();
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

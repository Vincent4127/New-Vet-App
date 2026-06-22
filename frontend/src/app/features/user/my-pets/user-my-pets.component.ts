import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { Pet } from '../../../core/models/user.model';

// DOB must be >= 1990 and not in the future.
export function dobRules(group: AbstractControl): ValidationErrors | null {
  const day = +group.get('dobDay')?.value;
  const month = +group.get('dobMonth')?.value;
  const year = +group.get('dobYear')?.value;
  if (!day || !month || !year) return null;

  if (year < 1990) return { dobTooOld: true };

  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow today
  if (dob.getTime() > today.getTime()) return { dobFuture: true };

  return null;
}

@Component({
  selector: 'app-user-my-pets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './user-my-pets.component.html',
  styleUrls: ['./user-my-pets.component.scss'],
})
export class UserMyPetsComponent implements OnInit {
  pets = signal<Pet[]>([]);
  loading = signal(true);
  showAddForm = signal(false);
  addLoading = signal(false);
  addError = signal('');
  deleteLoading = signal<string | null>(null);
  editingPet = signal<Pet | null>(null);
  editLoading = signal(false);
  editError = signal('');
  uploadingPic = signal<string | null>(null);

  addForm: FormGroup;
  editForm: FormGroup;
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private api: ApiService,
    private snack: MatSnackBar,
  ) {
    this.addForm = this.fb.group({
      name:     ['', Validators.required],
      breed:    ['', Validators.required],
      gender:   ['male', Validators.required],
      dobDay:   ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      dobMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      dobYear:  ['', [Validators.required, Validators.min(1990), Validators.max(this.currentYear)]],
    }, { validators: dobRules });
    this.editForm = this.fb.group({ newName: ['', Validators.required] });
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

  openAdd(): void { this.showAddForm.set(true); this.addForm.reset({ gender: 'male' }); this.addError.set(''); }
  cancelAdd(): void { this.showAddForm.set(false); }

  submitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      if (this.addForm.hasError('dobTooOld'))      this.addError.set('Date of birth year cannot be earlier than 1990.');
      else if (this.addForm.hasError('dobFuture')) this.addError.set('Date of birth cannot be in the future.');
      return;
    }
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.addLoading.set(true);
    this.addError.set('');
    const v = this.addForm.value;
    this.api.addPet(uid, {
      name: v.name, breed: v.breed, gender: v.gender,
      dateOfBirth: { day: +v.dobDay, month: +v.dobMonth, year: +v.dobYear },
    }).subscribe({
      next: () => { this.addLoading.set(false); this.showAddForm.set(false); this.load(); this.toast('Pet added!', 'success'); },
      error: err => { this.addLoading.set(false); this.addError.set(err.error?.error ?? 'Failed to add pet.'); },
    });
  }

  startEdit(pet: Pet): void { this.editingPet.set(pet); this.editForm.reset({ newName: pet.name }); this.editError.set(''); }
  cancelEdit(): void { this.editingPet.set(null); }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const uid = this.auth.getUserId();
    const pet = this.editingPet();
    if (!uid || !pet) return;
    this.editLoading.set(true);
    this.api.updatePetName(uid, pet.name, this.editForm.value.newName).subscribe({
      next: () => { this.editLoading.set(false); this.editingPet.set(null); this.load(); this.toast('Pet renamed!', 'success'); },
      error: err => { this.editLoading.set(false); this.editError.set(err.error?.error ?? 'Failed to rename.'); },
    });
  }

  deletePet(pet: Pet): void {
    if (!confirm(`Delete "${pet.name}"?`)) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    this.deleteLoading.set(pet.name);
    this.api.deletePet(uid, pet.name).subscribe({
      next: () => { this.pets.update(list => list.filter(p => p.name !== pet.name)); this.deleteLoading.set(null); this.toast('Pet removed', 'success'); },
      error: () => { this.deleteLoading.set(null); this.toast('Failed to delete', 'error'); },
    });
  }

  uploadPetPic(pet: Pet, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    const fd = new FormData();
    fd.append('petPic', file);
    this.uploadingPic.set(pet.name);
    this.api.uploadPetProfilePic(uid, pet.name, fd).subscribe({
      next: res => {
        this.pets.update(list => list.map(p => p.name === pet.name ? { ...p, profilePic: res.profilePic } : p));
        this.uploadingPic.set(null);
        this.toast('Photo updated!', 'success');
      },
      error: () => { this.uploadingPic.set(null); this.toast('Upload failed', 'error'); },
    });
    (event.target as HTMLInputElement).value = '';
  }

  petPicUrl(pet: Pet): string | null {
    return pet.profilePic ? this.api.imageUrl(pet.profilePic) : null;
  }

  healthStatus(pet: Pet): { label: string; cls: string } {
    const reminders = pet.reminders ?? [];
    if (reminders.length === 0) return { label: 'Healthy', cls: 'healthy' };
    const now = Date.now();
    const soon = now + 30 * 24 * 60 * 60 * 1000;
    const hasOverdue = reminders.some(r => {
      const d = r.dueDate;
      return d?.year && new Date(d.year, d.month - 1, d.day, d.hour ?? 0, d.minutes ?? 0).getTime() < now;
    });
    if (hasOverdue) return { label: 'Due Soon', cls: 'due-soon' };
    const hasUpcoming = reminders.some(r => {
      const d = r.dueDate;
      if (!d?.year) return false;
      const t = new Date(d.year, d.month - 1, d.day).getTime();
      return t >= now && t <= soon;
    });
    return hasUpcoming ? { label: 'Upcoming', cls: 'upcoming' } : { label: 'Up to date', cls: 'up-to-date' };
  }

  petAge(dob: any): string {
    if (!dob?.year) return '—';
    const now = new Date();
    let years = now.getFullYear() - dob.year;
    let months = now.getMonth() + 1 - dob.month;
    if (months < 0) { years--; months += 12; }
    if (years < 0) return '< 1m';
    return years > 0 ? `${years}y ${months}m` : `${months}m`;
  }

  nextVisit(pet: Pet): string {
    const now = Date.now();
    const future = (pet.reminders ?? [])
      .map(r => r.dueDate)
      .filter(d => d?.year && new Date(d.year, d.month - 1, d.day).getTime() >= now)
      .map(d => ({ ts: new Date(d.year, d.month - 1, d.day).getTime(), d }))
      .sort((a, b) => a.ts - b.ts);
    if (future.length === 0) return 'Not scheduled';
    const d = future[0].d;
    return `${d.day}/${d.month}/${d.year}`;
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

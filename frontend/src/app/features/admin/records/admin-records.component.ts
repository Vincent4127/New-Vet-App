import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../shared/services/api.service';
import { Pet, MedicalRecord } from '../../../core/models/user.model';

// The chosen date (day/month/year) must not be before today. Today is allowed.
function dateNotPast(group: AbstractControl): ValidationErrors | null {
  const day = +group.get('day')?.value;
  const month = +group.get('month')?.value;
  const year = +group.get('year')?.value;
  if (!day || !month || !year) return null;
  const picked = new Date(year, month - 1, day);
  if (isNaN(picked.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked.getTime() < today.getTime() ? { datePast: true } : null;
}

@Component({
  selector: 'app-admin-records',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
    MatTooltipModule, MatExpansionModule, MatProgressSpinnerModule,
  ],
  templateUrl: './admin-records.component.html',
  styleUrls: ['./admin-records.component.scss'],
})
export class AdminRecordsComponent implements OnInit {
  pets = signal<Pet[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  addingFor = signal<string | null>(null);
  addForm: FormGroup;
  addLoading = signal(false);
  addError = signal('');
  readonly currentYear = new Date().getFullYear();

  readonly RECORD_TYPES = ['Checkup', 'Vaccination', 'Surgery', 'Dental', 'Emergency', 'Lab Test', 'Other'];

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.pets();
    return this.pets().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q) ||
      (p.owner?.username ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private api: ApiService, private snack: MatSnackBar, private fb: FormBuilder) {
    this.addForm = this.fb.group({
      recordId:  ['', Validators.required],
      type:      ['', Validators.required],
      title:     ['', Validators.required],
      diagnosis: ['', Validators.required],
      notes:     ['', Validators.required],
      day:       ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      month:     ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      year:      ['', [Validators.required, Validators.min(this.currentYear)]],
    }, { validators: dateNotPast });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.adminGetAllPets().subscribe({
      next: res => { this.pets.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load pets', 'error'); },
    });
  }

  startAdd(petId: string): void {
    this.addingFor.set(petId);
    this.addForm.reset();
    this.addError.set('');
  }

  cancelAdd(): void { this.addingFor.set(null); }

  submitAdd(petId: string): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      if (this.addForm.hasError('datePast')) this.addError.set('Record date cannot be in the past.');
      return;
    }
    this.addLoading.set(true);
    this.addError.set('');
    const v = this.addForm.value;
    const record: MedicalRecord = {
      recordId:  v.recordId,
      type:      v.type,
      title:     v.title,
      diagnosis: v.diagnosis,
      notes:     v.notes,
      date:      { day: +v.day, month: +v.month, year: +v.year },
    };
    this.api.adminAddRecord(petId, record).subscribe({
      next: () => {
        this.addLoading.set(false);
        this.addingFor.set(null);
        this.toast('Record added', 'success');
        this.load();
      },
      error: err => { this.addLoading.set(false); this.addError.set(err.error?.error ?? 'Failed to add record.'); },
    });
  }

  deleteRecord(pet: Pet, recordId: string): void {
    if (!confirm('Delete this medical record?')) return;
    this.api.adminDeleteRecord(pet._id, recordId).subscribe({
      next: () => { this.toast('Record deleted', 'success'); this.load(); },
      error: () => this.toast('Failed to delete record', 'error'),
    });
  }

  formatDate(d: any): string {
    if (!d?.day) return '—';
    return `${d.day}/${d.month}/${d.year}`;
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

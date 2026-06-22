import { Component, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../shared/services/api.service';
import { Pet } from '../../../core/models/user.model';

// DOB must be >= 1990 and not in the future.
function dobRules(group: AbstractControl): ValidationErrors | null {
  const day = +group.get('dobDay')?.value;
  const month = +group.get('dobMonth')?.value;
  const year = +group.get('dobYear')?.value;
  if (!day || !month || !year) return null;
  if (year < 1990) return { dobTooOld: true };
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dob.getTime() > today.getTime()) return { dobFuture: true };
  return null;
}

@Component({
  selector: 'app-pet-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-shell">
      <div class="dialog-header">
        <div class="dialog-title-row">
          <mat-icon class="dialog-icon">pets</mat-icon>
          <h2 mat-dialog-title>Edit Pet</h2>
        </div>
        <button mat-icon-button (click)="cancel()"><mat-icon>close</mat-icon></button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="form" novalidate>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Breed</mat-label>
            <input matInput formControlName="breed" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Gender</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="male">Male</mat-option>
              <mat-option value="female">Female</mat-option>
            </mat-select>
          </mat-form-field>
          <div class="dob-row">
            <mat-form-field appearance="outline">
              <mat-label>Day</mat-label>
              <input matInput type="number" min="1" max="31" formControlName="dobDay" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Month</mat-label>
              <input matInput type="number" min="1" max="12" formControlName="dobMonth" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Year</mat-label>
              <input matInput type="number" min="1990" [max]="currentYear" formControlName="dobYear" />
            </mat-form-field>
          </div>
          @if (form.hasError('dobTooOld')) {
            <div class="dialog-error"><mat-icon>error_outline</mat-icon><span>Year cannot be earlier than 1990.</span></div>
          } @else if (form.hasError('dobFuture')) {
            <div class="dialog-error"><mat-icon>error_outline</mat-icon><span>Date of birth cannot be in the future.</span></div>
          }
          @if (error()) {
            <div class="dialog-error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
          }
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="cancel()" [disabled]="loading()">Cancel</button>
        <button mat-raised-button class="save-btn" (click)="submit()" [disabled]="loading()">
          @if (loading()) {
            <ng-container><mat-spinner diameter="18" /><span>Saving…</span></ng-container>
          } @else {
            <ng-container><mat-icon>save</mat-icon><span>Save Changes</span></ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-shell { display: flex; flex-direction: column; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
    .dialog-title-row { display: flex; align-items: center; gap: 10px;
      .dialog-icon { color: #2563EB; } h2 { font-size: 18px; font-weight: 700; color: #1E293B; margin: 0; } }
    .dialog-body { padding: 16px 24px !important; display: flex; flex-direction: column; gap: 4px; }
    .full { width: 100%; }
    .dob-row { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 10px; }
    .dialog-error { display: flex; align-items: center; gap: 8px; background: #FEE2E2; color: #B91C1C;
      border-radius: 8px; padding: 10px 14px; font-size: 14px; margin-top: 8px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .dialog-actions { padding: 12px 24px 20px !important; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #F1F5F9; }
    .save-btn { background: #FF6B6B !important; color: #fff !important; border-radius: 8px !important; font-weight: 600 !important;
      display: flex; align-items: center; gap: 6px; min-width: 130px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; } }
  `],
})
export class PetEditDialogComponent implements OnInit {
  form!: FormGroup;
  loading = signal(false);
  error = signal('');
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public dialogRef: MatDialogRef<PetEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { pet: Pet },
  ) {}

  ngOnInit(): void {
    const p = this.data.pet;
    this.form = this.fb.group({
      name:     [p.name,                          Validators.required],
      breed:    [p.breed ?? ''],
      gender:   [p.gender ?? 'male'],
      dobDay:   [p.dateOfBirth?.day ?? '',   [Validators.min(1), Validators.max(31)]],
      dobMonth: [p.dateOfBirth?.month ?? '', [Validators.min(1), Validators.max(12)]],
      dobYear:  [p.dateOfBirth?.year ?? '',  [Validators.min(1990), Validators.max(this.currentYear)]],
    }, { validators: dobRules });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;
    const payload: any = {};
    if (v.name !== this.data.pet.name) payload['name'] = v.name;
    if (v.breed !== this.data.pet.breed) payload['breed'] = v.breed;
    if (v.gender !== this.data.pet.gender) payload['gender'] = v.gender;
    const dob = { day: +v.dobDay, month: +v.dobMonth, year: +v.dobYear };
    const origDob = this.data.pet.dateOfBirth;
    if (dob.day !== origDob?.day || dob.month !== origDob?.month || dob.year !== origDob?.year) {
      payload['dateOfBirth'] = dob;
    }
    if (Object.keys(payload).length === 0) { this.dialogRef.close(false); return; }
    this.api.adminUpdatePet(this.data.pet._id, payload).subscribe({
      next: () => { this.loading.set(false); this.dialogRef.close(true); },
      error: err => { this.loading.set(false); this.error.set(err.error?.error ?? 'Failed to update pet.'); },
    });
  }

  cancel(): void { this.dialogRef.close(false); }
}

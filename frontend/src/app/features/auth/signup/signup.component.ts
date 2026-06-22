import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../shared/services/api.service';

function passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('password')?.value;
  const cp = g.get('confirmPass')?.value;
  return pw && cp && pw !== cp ? { mismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal(false);
  hidePassword = signal(true);
  hideConfirm = signal(true);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      username:    ['', [Validators.required, Validators.minLength(3)]],
      email:       ['', [Validators.required, Validators.email]],
      phone:       ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      password:    ['', [Validators.required, Validators.minLength(8)]],
      confirmPass: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    this.api.signUp(this.form.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'Registration failed. Please try again.');
      },
    });
  }
}

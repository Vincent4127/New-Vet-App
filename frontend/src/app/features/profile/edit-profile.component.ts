import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../shared/services/api.service';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('newPassword')?.value;
  const cp = g.get('confirmPass')?.value;
  if (pw && pw !== cp) return { passwordMismatch: true };
  return null;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule,
  ],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss'],
})
export class EditProfileComponent implements OnInit {
  @ViewChild('picInput') picInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  loading = signal(true);
  saving = signal(false);
  uploadingPic = signal(false);
  serverError = signal('');
  private originalPhone = '';

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private api: ApiService,
    private snack: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username:    [this.auth.getUsername() ?? '', Validators.required],
      email:       [this.auth.getEmail()    ?? '', [Validators.required, Validators.email]],
      phone:       [''],
      newPassword: ['', Validators.minLength(8)],
      confirmPass: [''],
    }, { validators: passwordMatch });

    const uid = this.auth.getUserId();
    if (uid) {
      this.api.getUser(uid).subscribe({
        next: user => {
          this.originalPhone = (user as any).phone ?? '';
          this.form.patchValue({ phone: this.originalPhone });
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); },
      });
    } else {
      this.loading.set(false);
    }
  }

  get backRoute(): string {
    return this.auth.isAdmin() ? '/admin/dashboard' : '/app/home';
  }

  profilePicUrl(): string | null {
    const p = this.auth.getProfilePic();
    return p ? this.api.imageUrl(p) : null;
  }

  onPicSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const uid = this.auth.getUserId();
    if (!uid) return;
    const fd = new FormData();
    fd.append('profilePic', file);
    this.uploadingPic.set(true);
    this.api.uploadUserProfilePic(uid, fd).subscribe({
      next: res => {
        this.auth.updateProfilePic(this.api.imageUrl(res.profilePic));
        this.uploadingPic.set(false);
        this.snack.open('Profile picture updated!', 'Close', { duration: 3000 });
      },
      error: () => {
        this.uploadingPic.set(false);
        this.snack.open('Upload failed', 'Close', { duration: 3000 });
      },
    });
    (event.target as HTMLInputElement).value = '';
  }

  save(): void {
    if (this.form.invalid) return;
    const uid = this.auth.getUserId();
    if (!uid) return;

    const v = this.form.value;
    const payload: Record<string, string> = {};
    if (v.username !== this.auth.getUsername())  payload['newUsername'] = v.username;
    if (v.email    !== this.auth.getEmail())     payload['newEmail']    = v.email;
    if (v.phone && v.phone !== this.originalPhone) payload['newPhone']  = v.phone;
    if (v.newPassword) {
      payload['newPassword'] = v.newPassword;
      payload['confirmPass'] = v.confirmPass;
    }

    if (Object.keys(payload).length === 0) {
      this.snack.open('No changes to save', 'OK', { duration: 3000 });
      return;
    }

    this.saving.set(true);
    this.serverError.set('');
    this.api.updateUserInfo(uid, payload).subscribe({
      next: () => {
        const profileUpdates: Partial<{ username: string; email: string }> = {};
        if (payload['newUsername']) profileUpdates['username'] = payload['newUsername'];
        if (payload['newEmail'])    profileUpdates['email']    = payload['newEmail'];
        if (Object.keys(profileUpdates).length) this.auth.updateProfile(profileUpdates);

        this.saving.set(false);
        this.snack.open('Profile updated!', 'Close', { duration: 3000 });
        this.form.patchValue({ newPassword: '', confirmPass: '' });
      },
      error: err => {
        this.saving.set(false);
        this.serverError.set(err.error?.error ?? 'Failed to update profile');
      },
    });
  }

  goBack(): void { this.router.navigate([this.backRoute]); }
}

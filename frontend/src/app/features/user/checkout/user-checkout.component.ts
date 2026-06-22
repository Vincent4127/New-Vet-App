import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-user-checkout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
  ],
  templateUrl: './user-checkout.component.html',
  styleUrls: ['./user-checkout.component.scss'],
})
export class UserCheckoutComponent implements OnInit {
  form!: FormGroup;
  loading = signal(true);
  placing = signal(false);
  serverError = signal('');

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private api: ApiService,
    public cart: CartService,
    private snack: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Redirect away if the cart is empty
    if (this.cart.items().length === 0) {
      this.router.navigate(['/app/cart']);
      return;
    }

    this.form = this.fb.group({
      // Pre-filled from profile, read-only-ish (kept editable display but not persisted to profile)
      username: [{ value: this.auth.getUsername() ?? '', disabled: true }],
      email:    [{ value: this.auth.getEmail() ?? '', disabled: true }],
      phone:    [{ value: '', disabled: true }],
      // The only thing the user enters: delivery address (stored on the order)
      address:  ['', [Validators.required, Validators.minLength(6)]],
    });

    const uid = this.auth.getUserId();
    if (uid) {
      this.api.getUser(uid).subscribe({
        next: user => {
          this.form.patchValue({ phone: (user as any).phone ?? '' });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  itemImage(image: string | null): string {
    return image ? this.api.imageUrl(image) : '';
  }

  placeOrder(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const uid = this.auth.getUserId();
    if (!uid) return;

    this.placing.set(true);
    this.serverError.set('');

    const items = this.cart.items().map(i => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
    }));

    this.api.createOrder({
      userId: uid,
      items,
      total: this.cart.total(),
      address: this.form.getRawValue().address,
    }).subscribe({
      next: res => {
        this.placing.set(false);
        this.cart.clear();
        this.snack.open(`Order ${res.orderNumber} placed!`, 'Close', { duration: 4000 });
        this.router.navigate(['/app/store']);
      },
      error: err => {
        this.placing.set(false);
        this.serverError.set(err.error?.error ?? 'Failed to place order.');
      },
    });
  }
}

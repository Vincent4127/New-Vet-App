import { Component, signal } from '@angular/core';
import { RouterModule, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { CartService } from '../../../core/services/cart.service';

interface NavItem { label: string; route: string; }

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive, MatIconModule, MatButtonModule],
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss'],
})
export class UserLayoutComponent {
  mobileMenuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Home',             route: '/app/home'         },
    { label: 'My Pets',         route: '/app/my-pets'      },
    { label: 'Appointments',    route: '/app/appointments' },
    { label: 'Medical Records', route: '/app/records'      },
    { label: 'Store',           route: '/app/store'        },
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    public cart: CartService,
  ) {}

  logout(): void { this.auth.logout(); }
  toggleMenu(): void { this.mobileMenuOpen.set(!this.mobileMenuOpen()); }
  goToProfile(): void { this.router.navigate(['/app/profile']); }
  goToCart(): void { this.router.navigate(['/app/cart']); }

  profilePicUrl(): string | null {
    const p = this.auth.getProfilePic();
    return p ? this.api.imageUrl(p) : null;
  }
}

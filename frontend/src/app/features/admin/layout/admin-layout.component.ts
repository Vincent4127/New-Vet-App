import { Component, signal } from '@angular/core';
import { RouterModule, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent {
  sidebarOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',        route: '/admin/dashboard'    },
    { label: 'Users & Pets',    icon: 'people',           route: '/admin/users'        },
    { label: 'Pets',            icon: 'pets',             route: '/admin/pets'         },
    { label: 'Medical Records', icon: 'medical_services', route: '/admin/records'      },
    { label: 'Appointments',    icon: 'calendar_today',   route: '/admin/appointments' },
    { label: 'Products',        icon: 'storefront',       route: '/admin/products'     },
    { label: 'Inventory',       icon: 'inventory_2',      route: '/admin/inventory'    },
    { label: 'Orders',          icon: 'receipt_long',     route: '/admin/orders'       },
    { label: 'Orders History',  icon: 'event_note',       route: '/admin/orders-history' },
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
  ) {}

  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }
  closeSidebarOnMobile(): void { if (window.innerWidth <= 768) this.sidebarOpen.set(false); }
  logout(): void { this.auth.logout(); }
  goToProfile(): void { this.router.navigate(['/admin/profile']); }

  profilePicUrl(): string | null {
    const p = this.auth.getProfilePic();
    return p ? this.api.imageUrl(p) : null;
  }
}

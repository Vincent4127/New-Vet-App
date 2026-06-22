import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { userGuard } from './core/guards/user.guard';
import { loginRedirectGuard } from './core/guards/login-redirect.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    canActivate: [loginRedirectGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    canActivate: [loginRedirectGuard],
    loadComponent: () =>
      import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'pets',
        loadComponent: () =>
          import('./features/admin/pets/admin-pets.component').then(m => m.AdminPetsComponent),
      },
      {
        path: 'records',
        loadComponent: () =>
          import('./features/admin/records/admin-records.component').then(m => m.AdminRecordsComponent),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/admin/appointments/admin-appointments.component').then(m => m.AdminAppointmentsComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/admin-products.component').then(m => m.AdminProductsComponent),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/admin/inventory/admin-inventory.component').then(m => m.AdminInventoryComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent),
      },
      {
        path: 'orders-history',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders-history.component').then(m => m.AdminOrdersHistoryComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/edit-profile.component').then(m => m.EditProfileComponent),
      },
    ],
  },

  {
    path: 'app',
    canActivate: [userGuard],
    loadComponent: () =>
      import('./features/user/layout/user-layout.component').then(m => m.UserLayoutComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/user/home/user-home.component').then(m => m.UserHomeComponent),
      },
      {
        path: 'my-pets',
        loadComponent: () =>
          import('./features/user/my-pets/user-my-pets.component').then(m => m.UserMyPetsComponent),
      },
      {
        path: 'records',
        loadComponent: () =>
          import('./features/user/records/user-records.component').then(m => m.UserRecordsComponent),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/user/appointments/user-appointments.component').then(m => m.UserAppointmentsComponent),
      },
      {
        path: 'store',
        loadComponent: () =>
          import('./features/user/store/user-store.component').then(m => m.UserStoreComponent),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/user/cart/user-cart.component').then(m => m.UserCartComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/user/checkout/user-checkout.component').then(m => m.UserCheckoutComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/edit-profile.component').then(m => m.EditProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];

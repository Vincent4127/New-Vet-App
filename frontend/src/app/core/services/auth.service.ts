import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User } from '../models/user.model';

const STORAGE_KEY = 'vet_user';
const API = 'https://new-vet-app.onrender.com';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(this.loadFromStorage());
  readonly user = this._user.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<{ success: boolean; user: User }> {
    return this.http.post<{ success: boolean; user: User }>(`${API}/users/signIn`, { email, password }).pipe(
      tap(res => {
        this._user.set(res.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      })
    );
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean { return this._user() !== null; }

  isAdmin(): boolean {
    return (this._user()?.role ?? '').toLowerCase() === 'admin';
  }

  isNormalUser(): boolean {
    return (this._user()?.role ?? '').toLowerCase() === 'normal';
  }

  getUserId(): string | null { return this._user()?._id ?? null; }
  getUsername(): string | null { return this._user()?.username ?? null; }
  getEmail(): string | null { return this._user()?.email ?? null; }
  getProfilePic(): string | null { return this._user()?.profilePic ?? null; }

  updateProfilePic(url: string): void {
    this.updateProfile({ profilePic: url });
  }

  updateProfile(updates: Partial<{ username: string; email: string; profilePic: string }>): void {
    const current = this._user();
    if (!current) return;
    const updated = { ...current, ...updates };
    this._user.set(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

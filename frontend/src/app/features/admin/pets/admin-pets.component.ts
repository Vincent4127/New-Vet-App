import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../shared/services/api.service';
import { Pet } from '../../../core/models/user.model';
import { PetEditDialogComponent } from './pet-edit-dialog.component';

@Component({
  selector: 'app-admin-pets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './admin-pets.component.html',
  styleUrls: ['./admin-pets.component.scss'],
})
export class AdminPetsComponent implements OnInit {
  pets = signal<Pet[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  deleteLoading = signal<string | null>(null);
  uploadingPic = signal<string | null>(null);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.pets();
    return this.pets().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q) ||
      (p.owner?.username ?? '').toLowerCase().includes(q)
    );
  });

  constructor(private api: ApiService, private dialog: MatDialog, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.adminGetAllPets().subscribe({
      next: res => { this.pets.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('Failed to load pets', 'error'); },
    });
  }

  openEdit(pet: Pet): void {
    const ref = this.dialog.open(PetEditDialogComponent, {
      width: '480px', maxWidth: '95vw', data: { pet },
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  deletePet(pet: Pet): void {
    if (!confirm(`Delete "${pet.name}"? This cannot be undone.`)) return;
    this.deleteLoading.set(pet._id);
    this.api.adminDeletePet(pet._id).subscribe({
      next: () => {
        this.pets.update(list => list.filter(p => p._id !== pet._id));
        this.deleteLoading.set(null);
        this.toast('Pet deleted', 'success');
      },
      error: () => { this.deleteLoading.set(null); this.toast('Failed to delete pet', 'error'); },
    });
  }

  formatDob(dob: any): string {
    if (!dob?.day) return '—';
    return `${dob.day}/${dob.month}/${dob.year}`;
  }

  uploadPetPic(pet: Pet, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const uid = (pet as any).owner?._id ?? (pet as any).userId;
    if (!uid) { this.toast('Cannot determine pet owner', 'error'); return; }
    const fd = new FormData();
    fd.append('petPic', file);
    this.uploadingPic.set(pet._id);
    this.api.uploadPetProfilePic(uid, pet.name, fd).subscribe({
      next: res => {
        this.pets.update(list => list.map(p => p._id === pet._id ? { ...p, profilePic: res.profilePic } : p));
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

  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Close', { duration: 3500, panelClass: type === 'error' ? 'snack-error' : 'snack-success' });
  }
}

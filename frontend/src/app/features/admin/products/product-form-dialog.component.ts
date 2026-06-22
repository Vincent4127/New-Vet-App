import { Component, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../shared/services/api.service';
import { Product } from '../../../core/models/user.model';

export interface ProductTypeOption { label: string; value: string; }

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: Product;
  productTypes: ProductTypeOption[];
}

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule,
  ],
  templateUrl: './product-form-dialog.component.html',
  styleUrls: ['./product-form-dialog.component.scss'],
})
export class ProductFormDialogComponent implements OnInit {
  form!: FormGroup;
  loading = signal(false);
  error = signal('');
  imagePreview = signal<string | null>(null);
  selectedFile: File | null = null;

  get isAdd(): boolean { return this.data.mode === 'add'; }
  get title(): string  { return this.isAdd ? 'Add Product' : 'Edit Product'; }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public dialogRef: MatDialogRef<ProductFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
  ) {}

  ngOnInit(): void {
    const p = this.data.product;
    if (this.isAdd) {
      this.form = this.fb.group({
        productId:   ['', [Validators.required, Validators.minLength(6)]],
        name:        ['', Validators.required],
        price:       [null, [Validators.required, Validators.min(0)]],
        stockQty:    [null, [Validators.required, Validators.min(0)]],
        type:        ['', Validators.required],
        description: ['', Validators.required],
        isActive:    [true],
      });
    } else {
      const rawImg = p?.images;
      const imgUrl = Array.isArray(rawImg) ? rawImg[0] : rawImg;
      if (imgUrl) this.imagePreview.set(this.api.imageUrl(imgUrl));

      this.form = this.fb.group({
        newName:        [p?.name ?? '',        Validators.required],
        newPrice:       [p?.price ?? 0,        [Validators.required, Validators.min(0)]],
        newStockQty:    [p?.stockQty ?? 0,     [Validators.required, Validators.min(0)]],
        newType:        [p?.type ?? ''],
        newDescription: [p?.description ?? '', Validators.required],
        newIsActive:    [p?.isActive === true || p?.isActive === 'true'],
      });
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      this.error.set('Only JPEG, PNG or WebP images are allowed.'); return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.error.set('Image must be under 3 MB.'); return;
    }
    this.selectedFile = file;
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    if (this.isAdd) {
      if (!this.selectedFile) {
        this.error.set('Please select a product image.');
        this.loading.set(false);
        return;
      }
      const fd = new FormData();
      const v = this.form.value;
      fd.append('productId',   v.productId);
      fd.append('name',        v.name);
      fd.append('price',       String(v.price));
      fd.append('description', v.description);
      fd.append('stockQty',    String(v.stockQty));
      fd.append('isActive',    String(v.isActive));
      fd.append('type',        v.type);
      fd.append('image',       this.selectedFile);

      this.api.addProduct(fd).subscribe({
        next: () => { this.loading.set(false); this.dialogRef.close(true); },
        error: err => { this.loading.set(false); this.error.set(err.error?.error ?? 'Failed to add product.'); },
      });
    } else {
      const v = this.form.value;
      const p = this.data.product!;
      const payload: Record<string, unknown> = {};

      if (v.newName !== p.name)               payload['newName']        = v.newName;
      if (+v.newPrice !== +p.price)           payload['newPrice']        = +v.newPrice;
      if (v.newDescription !== p.description) payload['newDescription']  = v.newDescription;
      if (+v.newStockQty !== +p.stockQty)     payload['newStockQty']     = +v.newStockQty;
      const wasActive = p.isActive === true || p.isActive === 'true';
      if (v.newIsActive !== wasActive)         payload['newIsActive']     = v.newIsActive;
      if (v.newType !== (p.type ?? ''))        payload['newType']         = v.newType;

      if (Object.keys(payload).length === 0) { this.dialogRef.close(false); return; }

      this.api.updateProduct(p.productId, payload as any).subscribe({
        next: () => { this.loading.set(false); this.dialogRef.close(true); },
        error: err => { this.loading.set(false); this.error.set(err.error?.error ?? 'Failed to update product.'); },
      });
    }
  }

  cancel(): void { this.dialogRef.close(false); }
}

import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly count = computed(() => this._items().reduce((n, i) => n + i.qty, 0));
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));

  constructor(private auth: AuthService) {
    this._items.set(this.load());
  }

  private storageKey(): string {
    return `vet_cart_${this.auth.getUserId() ?? 'guest'}`;
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this._items()));
  }

  private firstImage(images: string | string[]): string | null {
    const raw = Array.isArray(images) ? images[0] : images;
    return raw ?? null;
  }

  add(product: Product, qty = 1): void {
    const id = product.productId;
    const existing = this._items().find(i => i.productId === id);
    const max = Number(product.stockQty) || 0;
    if (existing) {
      const next = Math.min(existing.qty + qty, max);
      this.setQty(id, next);
      return;
    }
    const item: CartItem = {
      productId: id,
      name: product.name,
      price: Number(product.price),
      image: this.firstImage(product.images),
      qty: Math.min(qty, max || qty),
      stockQty: max,
    };
    this._items.update(list => [...list, item]);
    this.persist();
  }

  setQty(productId: string, qty: number): void {
    this._items.update(list =>
      list.map(i => {
        if (i.productId !== productId) return i;
        const capped = i.stockQty > 0 ? Math.min(qty, i.stockQty) : qty;
        return { ...i, qty: Math.max(1, capped) };
      })
    );
    this.persist();
  }

  increment(productId: string): void {
    const it = this._items().find(i => i.productId === productId);
    if (it) this.setQty(productId, it.qty + 1);
  }

  decrement(productId: string): void {
    const it = this._items().find(i => i.productId === productId);
    if (!it) return;
    if (it.qty <= 1) { this.remove(productId); return; }
    this.setQty(productId, it.qty - 1);
  }

  remove(productId: string): void {
    this._items.update(list => list.filter(i => i.productId !== productId));
    this.persist();
  }

  clear(): void {
    this._items.set([]);
    this.persist();
  }
}

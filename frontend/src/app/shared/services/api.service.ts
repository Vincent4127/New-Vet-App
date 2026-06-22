import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Pet, Product, MedicalRecord, Reminder, Appointment, Order, OrderItem } from '../../core/models/user.model';

const BASE = 'https://new-vet-app.onrender.com';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ── Users ─────────────────────────────────────────────────────────────────
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${BASE}/users`);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${BASE}/users/${id}`);
  }

  signUp(data: { username: string; email: string; password: string; phone: string; confirmPass: string }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${BASE}/users/signUp`, data);
  }

  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/users/delete/${id}`);
  }

  updateUserInfo(id: string, data: Partial<{ newEmail: string; newPassword: string; confirmPass: string; newPhone: string; newUsername: string }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/users/updateInfo/${id}`, data);
  }

  searchUsers(q: string): Observable<{ success: boolean; data: User[] }> {
    return this.http.get<{ success: boolean; data: User[] }>(`${BASE}/admin/users/search?q=${encodeURIComponent(q)}`);
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  scheduleAppointment(userId: string, appt: { hour: number; minutes: number; day: number; month: number; year: number }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/users/scheduleAppointment/${userId}`, appt);
  }

  cancelAppointment(userId: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/users/cancelAppointment/${userId}`, {});
  }

  getUserAppointment(userId: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${BASE}/users/userAppointments/${userId}`);
  }

  getAllAppointments(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${BASE}/admin/appointments`);
  }

  adminCancelAppointment(userId: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/admin/appointments/cancel/${userId}`, {});
  }

  // ── Pets (user routes) ────────────────────────────────────────────────────
  getUserPets(userId: string): Observable<Pet[]> {
    return this.http.get<Pet[]>(`${BASE}/pets/getUserPets/${userId}`);
  }

  addPet(userId: string, data: { name: string; dateOfBirth: { day: number; month: number; year: number }; breed: string; gender: string }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${BASE}/pets/addPet/${userId}`, data);
  }

  deletePet(userId: string, petName: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/pets/deletePet/${userId}/${encodeURIComponent(petName)}`);
  }

  updatePetName(userId: string, currentName: string, newName: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/pets/updatePetName/${userId}/${encodeURIComponent(currentName)}`, { newName });
  }

  addMedicalRecord(userId: string, petName: string, record: Omit<MedicalRecord, '_id'>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/pets/medicalRecord/${userId}/${encodeURIComponent(petName)}`, record);
  }

  deleteMedicalRecord(userId: string, petName: string, recordId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/pets/deleteMedicalRecord/${userId}/${encodeURIComponent(petName)}/${recordId}`);
  }

  addReminder(userId: string, petName: string, reminder: { reminderId: string; title: string; dueDate: { day: number; month: number; year: number; hour: number; minutes: number } }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/pets/addReminder/${userId}/${encodeURIComponent(petName)}`, reminder);
  }

  deleteReminder(userId: string, petName: string, reminderId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/pets/deleteReminder/${userId}/${encodeURIComponent(petName)}/${reminderId}`);
  }

  // ── Pets (admin routes) ───────────────────────────────────────────────────
  adminGetAllPets(): Observable<{ success: boolean; data: Pet[] }> {
    return this.http.get<{ success: boolean; data: Pet[] }>(`${BASE}/admin/pets`);
  }

  adminSearchPets(q: string): Observable<{ success: boolean; data: Pet[] }> {
    return this.http.get<{ success: boolean; data: Pet[] }>(`${BASE}/admin/pets/search?q=${encodeURIComponent(q)}`);
  }

  adminGetPet(petId: string): Observable<{ success: boolean; data: Pet }> {
    return this.http.get<{ success: boolean; data: Pet }>(`${BASE}/admin/pets/${petId}`);
  }

  adminUpdatePet(petId: string, data: Partial<{ name: string; breed: string; gender: string; dateOfBirth: object }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/admin/pets/${petId}`, data);
  }

  adminDeletePet(petId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/admin/pets/${petId}`);
  }

  // ── Medical Records (admin) ───────────────────────────────────────────────
  adminGetRecords(petId: string): Observable<{ success: boolean; data: MedicalRecord[] }> {
    return this.http.get<{ success: boolean; data: MedicalRecord[] }>(`${BASE}/admin/records/pet/${petId}`);
  }

  adminAddRecord(petId: string, record: MedicalRecord): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${BASE}/admin/records/pet/${petId}`, record);
  }

  adminDeleteRecord(petId: string, recordId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/admin/records/pet/${petId}/${recordId}`);
  }

  // ── Reminders (admin) ─────────────────────────────────────────────────────
  adminGetAllReminders(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${BASE}/admin/reminders`);
  }

  adminAddReminder(petId: string, data: { title: string; dueDate: object }): Observable<{ success: boolean; data: Reminder }> {
    return this.http.post<{ success: boolean; data: Reminder }>(`${BASE}/admin/reminders/pet/${petId}`, data);
  }

  adminDeleteReminder(petId: string, reminderId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/admin/reminders/pet/${petId}/${reminderId}`);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${BASE}/products`);
  }

  getProductsByType(type: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${BASE}/products/type/${encodeURIComponent(type)}`);
  }

  getProduct(productId: string): Observable<Product> {
    return this.http.get<Product>(`${BASE}/products/${productId}`);
  }

  addProduct(formData: FormData): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${BASE}/products/newProduct`, formData);
  }

  updateProduct(productId: string, data: Partial<{ newName: string; newPrice: number; newDescription: string; newStockQty: number; newIsActive: boolean }>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${BASE}/products/update/${productId}`, data);
  }

  deleteProduct(productId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${BASE}/products/delete/${productId}`);
  }

  adminSearchProducts(q: string): Observable<{ success: boolean; data: Product[] }> {
    return this.http.get<{ success: boolean; data: Product[] }>(`${BASE}/admin/products/search?q=${encodeURIComponent(q)}`);
  }

  // ── Profile pictures ──────────────────────────────────────────────────────
  uploadUserProfilePic(userId: string, formData: FormData): Observable<{ success: boolean; profilePic: string }> {
    return this.http.post<{ success: boolean; profilePic: string }>(`${BASE}/users/uploadProfilePic/${userId}`, formData);
  }

  uploadPetProfilePic(userId: string, petName: string, formData: FormData): Observable<{ success: boolean; profilePic: string }> {
    return this.http.post<{ success: boolean; profilePic: string }>(`${BASE}/pets/uploadPetPic/${userId}/${encodeURIComponent(petName)}`, formData);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  createOrder(data: { userId: string; items: OrderItem[]; total: number; address: string }): Observable<{ success: boolean; orderId: string; orderNumber: string }> {
    return this.http.post<{ success: boolean; orderId: string; orderNumber: string }>(`${BASE}/orders`, data);
  }

  getCurrentOrders(): Observable<{ success: boolean; data: Order[] }> {
    return this.http.get<{ success: boolean; data: Order[] }>(`${BASE}/orders/current`);
  }

  getOrderHistory(): Observable<{ success: boolean; data: Order[] }> {
    return this.http.get<{ success: boolean; data: Order[] }>(`${BASE}/orders/history`);
  }

  updateOrderStatus(orderId: string, status: 'confirmed' | 'cancelled'): Observable<{ success: boolean; data: Order }> {
    return this.http.put<{ success: boolean; data: Order }>(`${BASE}/orders/${orderId}/status`, { status });
  }

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE}${path}`;
  }
}

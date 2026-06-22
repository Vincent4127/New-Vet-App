export interface Appointment {
  hour: string | number;
  minutes: string | number;
  day: string | number;
  month: string | number;
  year: string | number;
}

export interface MedicalRecord {
  recordId: string;
  type: string;
  title: string;
  diagnosis: string;
  date: { day: number; month: number; year: number };
  notes: string;
}

export interface Reminder {
  reminderId: string;
  title: string;
  dueDate: { day: number; month: number; year: number; hour: number; minutes: number };
  createdAt: string | Date;
}

export interface Pet {
  _id: string;
  name: string;
  breed: string;
  gender: 'male' | 'female';
  dateOfBirth: { day: number; month: number; year: number };
  ownerId?: string;
  medicalRecords: MedicalRecord[];
  reminders: Reminder[];
  owner?: { username: string; email: string; phone: string };
  profilePic?: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: 'admin' | 'normal';
  appointment: Appointment;
  userPets: Pet[];
  fcmToken?: string;
  profilePic?: string;
}

export interface Product {
  _id: string;
  productId: string;
  name: string;
  price: number;
  description: string;
  stockQty: number;
  isActive: boolean | string;
  type?: string;
  images: string | string[];
  createdAt?: string | Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  qty: number;
  stockQty: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string | null;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  customer: { username: string; email: string; phone: string };
  items: OrderItem[];
  total: number;
  address: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string | Date;
  handledAt: string | Date | null;
}

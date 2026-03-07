import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/services';
import { AuthService } from '../../services/auth.service';
import { Vehicle, VehicleBooking, User } from '../../models/models';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Vehicles</h1>
        <p class="page-subtitle">Agricultural vehicle rentals</p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline" (click)="viewMode = viewMode === 'browse' ? 'bookings' : 'browse'">
           {{ viewMode === 'browse' ? 'My Bookings' : 'Browse Vehicles' }}
        </button>
        <button class="btn btn-primary" *ngIf="user?.role === 'vehicle_owner'" (click)="openAddModal()">
          Add Vehicle
        </button>
      </div>
    </div>

    <div class="alert alert-success" *ngIf="success">{{ success }}</div>
    <div class="alert alert-error" *ngIf="error">{{ error }}</div>

    <!-- Browse Vehicles -->
    <ng-container *ngIf="viewMode === 'browse'">
      <!-- Type filter -->
      <div class="type-filters">
        <button *ngFor="let t of vehicleTypes" [class.active]="filterType === t" (click)="setType(t)" class="type-btn">{{ t }}</button>
      </div>

      <div class="vehicles-grid">
        <div *ngFor="let v of vehicles" class="vehicle-card card">
          <div class="vehicle-type-badge">{{ v.type }}</div>
          <h3 class="vehicle-name">{{ v.name }}</h3>
          <div class="vehicle-price">₹{{ v.price }}<span>/day</span></div>
          <div class="vehicle-details">
            <span *ngIf="v.numberPlate"> {{ v.numberPlate }}</span>
            <span *ngIf="v.capacity"> {{ v.capacity }}</span>
            <span> {{ v.location || v.ownerLocation }}</span>
            <span> {{ v.ownerName }}</span>
          </div>
          <p class="vehicle-desc" *ngIf="v.description">{{ v.description | slice:0:80 }}...</p>
          <div class="vehicle-footer">
            <span class="badge badge-success" *ngIf="v.status === 'available'">✅ Available</span>
            <span class="badge badge-warning" *ngIf="v.status === 'booked'">❌ Not Available</span>
            <span class="badge badge-muted" *ngIf="v.status !== 'available' && v.status !== 'booked'">{{ v.status }}</span>
            <button class="btn btn-primary btn-sm" *ngIf="user?.role !== 'vehicle_owner' && v.status === 'available'" (click)="openBookModal(v)">
              Book
            </button>
            <button class="btn btn-danger btn-sm" *ngIf="user?.role === 'vehicle_owner' && v.ownerId === user?.id" (click)="deleteVehicle(v.id)">
               </button>
          </div>
        </div>
        <div class="empty-state" *ngIf="vehicles.length === 0">
          <i class="fas fa-tractor"></i><h3>No vehicles available</h3>
        </div>
      </div>
    </ng-container>

    <!-- My Bookings -->
    <ng-container *ngIf="viewMode === 'bookings'">
      <div class="card">
        <div *ngFor="let b of bookings" class="booking-card">
          <div class="booking-header">
            <div>
              <strong>{{ b.vehicleName }}</strong> ({{ b.vehicleType }})
              <div class="booking-meta">{{ b.hireDate | date }} • {{ b.days }} day(s) • ₹{{ b.totalPrice }}</div>
            </div>
            <span [class]="'badge badge-' + statusColor(b.status)">{{ b.status }}</span>
          </div>
          <div class="booking-meta">
            <span *ngIf="user?.role === 'vehicle_owner'">
              Booker: {{ b.bookerName }} {{ b.bookerPhone }}
            </span>
            <span *ngIf="user?.role !== 'vehicle_owner'">
              Owner: {{ b.ownerName }} {{ b.ownerPhone }}
            </span>
          </div>
          <div *ngIf="b.status === 'pending' && user?.role === 'vehicle_owner'" class="booking-actions">
            <button class="btn btn-primary btn-sm" (click)="updateBooking(b.id, 'accepted')">Accept</button>
            <button class="btn btn-danger btn-sm" (click)="updateBooking(b.id, 'rejected')">Reject</button>
          </div>
          <div *ngIf="b.status === 'accepted' && user?.role === 'vehicle_owner'" class="booking-actions">
            <button class="btn btn-primary btn-sm" (click)="updateBooking(b.id, 'completed')">Mark Completed</button>
          </div>
        </div>
        <div class="empty-state" *ngIf="bookings.length === 0">
          <i class="fas fa-calendar"></i><h3>No bookings yet</h3>
        </div>
      </div>
    </ng-container>

    <!-- Add Vehicle Modal -->
    <div class="modal-overlay" *ngIf="showAddModal" (click)="showAddModal=false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Add Vehicle</h3>
          <button class="modal-close" (click)="showAddModal=false"><i class="fas fa-times"></i></button>
        </div>
        <form (ngSubmit)="addVehicle()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Vehicle Name *</label>
              <input class="form-control" [(ngModel)]="addForm.name" name="name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Number Plate</label>
              <input class="form-control" [(ngModel)]="addForm.numberPlate" name="numberPlate">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-control" [(ngModel)]="addForm.type" name="type">
                <option>Tractor</option><option>Mini_Truck</option><option>Heavy_Truck</option>
                <option>Harvester</option><option>Trailer</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Price/Day (₹) *</label>
              <input class="form-control" type="number" [(ngModel)]="addForm.price" name="price" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Capacity</label>
              <input class="form-control" [(ngModel)]="addForm.capacity" name="capacity" placeholder="e.g. 5 ton">
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input class="form-control" [(ngModel)]="addForm.location" name="location">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" [(ngModel)]="addForm.description" name="description" rows="2"></textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end">
            <button type="button" class="btn btn-outline" (click)="showAddModal=false">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span class="spinner" *ngIf="saving"></span> Add Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Book Modal -->
    <div class="modal-overlay" *ngIf="selectedVehicle" (click)="selectedVehicle=null">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Book: {{ selectedVehicle.name }}</h3>
          <button class="modal-close" (click)="selectedVehicle=null"><i class="fas fa-times"></i></button>
        </div>
        <div class="form-group">
          <label class="form-label">Hire Date *</label>
          <input class="form-control" type="date" [(ngModel)]="bookForm.hireDate" name="hireDate">
        </div>
        <div class="form-group">
          <label class="form-label">Number of Days</label>
          <input class="form-control" type="number" min="1" [(ngModel)]="bookForm.days" name="days">
        </div>
        <div class="form-group">
          <label class="form-label">Total: ₹{{ selectedVehicle.price * bookForm.days }}</label>
        </div>
        <div class="form-group">
          <label class="form-label">Message</label>
          <textarea class="form-control" [(ngModel)]="bookForm.message" rows="2"></textarea>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn btn-outline" (click)="selectedVehicle=null">Cancel</button>
          <button class="btn btn-primary" (click)="bookVehicle()" [disabled]="saving">
            <span class="spinner" *ngIf="saving"></span> Confirm Booking
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .type-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .type-btn { padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(30,138,44,0.2); background: #fff; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #6b8f70; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
    .type-btn:hover { border-color: #27a836; color: #1e8a2c; background: #f0faf2; }
    .type-btn.active { background: #27a836; border-color: #27a836; color: #fff; }
    .vehicles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .vehicle-card { position: relative; display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid rgba(30,138,44,0.12); border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); transition: all 0.2s; }
    .vehicle-card:hover { border-color: rgba(30,138,44,0.3); box-shadow: 0 4px 16px rgba(30,138,44,0.1); transform: translateY(-2px); }
    .vehicle-type-badge { display: inline-flex; align-items: center; padding: 3px 10px; background: #fef3c7; color: #d97706; font-size: 0.72rem; font-weight: 700; border-radius: 20px; margin-bottom: 8px; width: fit-content; }
    .vehicle-name { font-size: 1.05rem; font-weight: 700; color: #1a2e1c; }
    .vehicle-price { font-size: 1.4rem; font-weight: 800; color: #1a5e2a; font-family: 'JetBrains Mono', monospace; }
    .vehicle-price span { font-size: 0.8rem; font-weight: 400; color: #6b8f70; font-family: 'Poppins', sans-serif; }
    .vehicle-details { display: flex; flex-direction: column; gap: 5px; font-size: 0.82rem; color: #6b8f70; }
    .vehicle-details span { display: flex; align-items: center; gap: 7px; }
    .vehicle-details i { color: #27a836; width: 14px; }
    .vehicle-desc { font-size: 0.8rem; color: #6b8f70; line-height: 1.5; }
    .vehicle-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(30,138,44,0.1); }
    .booking-card { border: 1px solid rgba(30,138,44,0.12); border-radius: 12px; padding: 16px; margin-bottom: 12px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
    .booking-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .booking-meta { font-size: 0.82rem; color: #6b8f70; margin-bottom: 10px; line-height: 1.5; }
    .booking-actions { display: flex; gap: 8px; }
  `]
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  bookings: VehicleBooking[] = [];
  viewMode = 'browse';
  filterType = 'All';
  vehicleTypes = ['All', 'Tractor', 'Mini_Truck', 'Heavy_Truck', 'Harvester', 'Trailer'];
  user: User | null = null;
  success = ''; error = ''; saving = false;
  showAddModal = false;
  selectedVehicle: Vehicle | null = null;
  addForm: any = { name: '', numberPlate: '', type: 'Tractor', price: 0, capacity: '', location: '', description: '' };
  bookForm: any = { hireDate: '', days: 1, message: '' };

  constructor(private vehicleService: VehicleService, private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.currentUser;
    this.loadVehicles();
    this.loadBookings();
  }

  loadVehicles() { this.vehicleService.getAll(this.filterType !== 'All' ? this.filterType : undefined).subscribe(v => this.vehicles = v); }
  loadBookings() { this.vehicleService.getBookings().subscribe(b => this.bookings = b); }
  setType(t: string) { this.filterType = t; this.loadVehicles(); }
  openAddModal() { this.addForm = { name: '', numberPlate: '', type: 'Tractor', price: 0, capacity: '', location: '', description: '' }; this.showAddModal = true; }
  openBookModal(v: Vehicle) { this.selectedVehicle = v; this.bookForm = { hireDate: '', days: 1, message: '' }; }

  addVehicle() {
    this.saving = true;
    this.vehicleService.create(this.addForm).subscribe({
      next: () => { this.success = 'Vehicle added!'; this.saving = false; this.showAddModal = false; this.loadVehicles(); setTimeout(() => this.success = '', 3000); },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.saving = false; }
    });
  }

  bookVehicle() {
    if (!this.selectedVehicle || !this.bookForm.hireDate) return;
    this.saving = true;
    this.vehicleService.book({ vehicleId: this.selectedVehicle.id, ...this.bookForm }).subscribe({
      next: () => { this.success = 'Booking sent!'; this.saving = false; this.selectedVehicle = null; this.loadVehicles(); this.loadBookings(); setTimeout(() => this.success = '', 3000); },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.saving = false; }
    });
  }

  updateBooking(id: number, status: string) {
    this.vehicleService.updateBooking(id, status).subscribe(() => { this.success = `Booking ${status}!`; this.loadBookings(); this.loadVehicles(); setTimeout(() => this.success = '', 3000); });
  }

  deleteVehicle(id: number) {
    if (!confirm('Delete vehicle?')) return;
    this.vehicleService.delete(id).subscribe(() => { this.success = 'Deleted!'; this.loadVehicles(); setTimeout(() => this.success = '', 3000); });
  }

  statusColor(s: string): string { const m: any = { pending: 'warning', accepted: 'info', rejected: 'danger', completed: 'success' }; return m[s] || 'muted'; }
}

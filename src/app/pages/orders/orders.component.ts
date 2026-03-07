import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, VehicleService } from '../../services/services';
import { AuthService } from '../../services/auth.service';
import { Order, User } from '../../models/models';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">&#x1F4CB; My Orders</h1>
        <p class="page-subtitle">{{ user?.role === 'buyer' ? 'Your purchase history and active orders' : 'Incoming orders for your crops' }}</p>
      </div>
    </div>

    <div class="alert alert-success" *ngIf="success"><i class="fas fa-check-circle"></i> {{ success }}</div>
    <div class="alert alert-error"   *ngIf="error"><i class="fas fa-times-circle"></i> {{ error }}</div>

    <div class="loading-wrap" *ngIf="loading">
      <span class="spinner spinner-primary"></span><span>Loading orders...</span>
    </div>

    <div class="empty-state card" *ngIf="!loading && orders.length === 0">
      <i class="fas fa-clipboard-list"></i>
      <h3>No orders yet</h3>
      <p>{{ user?.role === 'buyer' ? 'Visit the marketplace to place your first order' : 'Orders from buyers will appear here' }}</p>
      <a routerLink="/marketplace" class="btn btn-primary btn-sm"><i class="fas fa-store"></i> Go to Marketplace</a>
    </div>

    <div class="orders-list" *ngIf="!loading && orders.length > 0">
      <div class="order-card" *ngFor="let o of orders; let i = index" [style.animation-delay]="i*0.05+'s'">

        <!-- Header -->
        <div class="oc-header">
          <div class="oc-left">
            <div class="oc-emoji">&#x1F331;</div>
            <div>
              <div class="oc-title">{{ o.cropName }}</div>
              <div class="oc-id">#{{ o.id }}</div>
            </div>
          </div>
          <span class="status-pill" [class]="getStatusColor(o.status)">
            <i [class]="getStatusIcon(o.status)"></i> {{ o.status }}
          </span>
        </div>

        <!-- Body -->
        <div class="oc-body">
          <!-- Price section -->
          <div class="oc-price-section">
            <div class="oc-detail-row">
              <span class="od-label"><i class="fas fa-box"></i> Quantity</span>
              <span class="od-value">{{ o.quantity }} {{ o.unit }}</span>
            </div>
            <div class="oc-detail-row">
              <span class="od-label"><i class="fas fa-seedling"></i> Crop Amount</span>
              <span class="od-value mono">&#x20B9;{{ getProductAmount(o) | number:'1.2-2' }}</span>
            </div>
            <div class="oc-detail-row vehicle-row" *ngIf="o.vehicleId || o.vehicleAmount">
              <span class="od-label"><i class="fas fa-tractor"></i> Vehicle ({{ o.vehicleName || 'Transport' }})</span>
              <span class="od-value mono vehicle-amt">&#x20B9;{{ (o.vehicleAmount || 0) | number:'1.2-2' }}</span>
            </div>
            <div class="oc-price-divider" *ngIf="o.vehicleId || o.vehicleAmount"></div>
            <div class="oc-detail-row oc-total-row">
              <span class="od-label total-label">
                <i class="fas fa-indian-rupee-sign"></i>
                {{ (o.vehicleId || o.vehicleAmount) ? 'Grand Total' : 'Total Amount' }}
              </span>
              <span class="od-value total-val mono">&#x20B9;{{ o.totalPrice | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Farmer details (buyer sees) -->
          <div class="oc-person-card buyer-side" *ngIf="user?.role === 'buyer'">
            <div class="opc-header"><i class="fas fa-tractor"></i><span>Farmer Details</span></div>
            <div class="opc-name">{{ o.farmerName }}</div>
            <div class="opc-info" *ngIf="o.farmerPhone"><i class="fas fa-phone"></i> {{ o.farmerPhone }}</div>
            <div class="opc-info" *ngIf="o.farmerLocation"><i class="fas fa-map-pin"></i> {{ o.farmerLocation }}</div>
          </div>

          <!-- Buyer details (farmer sees) -->
          <div class="oc-person-card farmer-side" *ngIf="user?.role === 'farmer'">
            <div class="opc-header"><i class="fas fa-user"></i><span>Buyer Details</span></div>
            <div class="opc-name">{{ o.buyerName }}</div>
            <div class="opc-info" *ngIf="o.buyerPhone"><i class="fas fa-phone"></i> {{ o.buyerPhone }}</div>
          </div>

          <!-- Vehicle booking strip (buyer only, order accepted/pending, no vehicle yet) -->
          <div class="vehicle-strip" *ngIf="user?.role==='buyer' && !o.vehicleId && (o.status==='pending' || o.status==='accepted')">
            <div class="vs-left">
              <div class="vs-icon">&#x1F69A;</div>
              <div>
                <div class="vs-title">Need transport for this order?</div>
                <div class="vs-sub">Book a vehicle now and add it to this order</div>
              </div>
            </div>
            <button class="rapido-btn" (click)="startVehicleBook(o)">
              <i class="fas fa-bolt"></i> Book Vehicle
            </button>
          </div>

          <!-- Vehicle already booked badge -->
          <div class="vehicle-booked-strip" *ngIf="o.vehicleId || o.vehicleAmount">
            <i class="fas fa-check-circle"></i>
            Vehicle booked: <strong>{{ o.vehicleName }}</strong> &mdash; &#x20B9;{{ o.vehicleAmount | number:'1.2-2' }}
          </div>

          <div class="oc-msg" *ngIf="o.message"><i class="fas fa-comment-alt"></i> {{ o.message }}</div>

          <div class="oc-payment" *ngIf="o.paymentMethod">
            <span class="pay-badge">
              <i class="fas fa-credit-card"></i>
              Paid via {{ o.paymentMethod === 'cod' ? 'Cash on Delivery' : (o.paymentMethod || '').toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="oc-footer">
          <div class="oc-date"><i class="fas fa-calendar-alt"></i> {{ o.createdAt | date:'dd MMM yyyy, hh:mm a' }}</div>
          <div class="oc-actions">
            <ng-container *ngIf="o.status === 'pending' && user?.role === 'farmer'">
              <button class="btn btn-success btn-sm" (click)="updateStatus(o,'accepted')"><i class="fas fa-check"></i> Accept</button>
              <button class="btn btn-danger btn-sm"  (click)="updateStatus(o,'rejected')"><i class="fas fa-times"></i> Reject</button>
            </ng-container>
            <ng-container *ngIf="o.status === 'pending' && user?.role === 'buyer'">
              <button class="btn btn-danger btn-sm" (click)="updateStatus(o,'cancelled')"><i class="fas fa-ban"></i> Cancel</button>
            </ng-container>
            <ng-container *ngIf="o.status === 'accepted' && user?.role === 'farmer'">
              <button class="btn btn-primary btn-sm" (click)="updateStatus(o,'completed')"><i class="fas fa-check-double"></i> Mark Completed</button>
            </ng-container>
          </div>
        </div>

      </div>
    </div>

    <!-- ===== RAPIDO VEHICLE BOOKING MODAL ===== -->
    <div class="modal-overlay" *ngIf="bookStep > 0" (click)="closeBook()">
      <div class="rapido-modal" (click)="$event.stopPropagation()">

        <!-- Progress -->
        <div class="rp-progress"><div class="rp-bar" [style.width]="(bookStep/3*100)+'%'"></div></div>

        <!-- STEP 1: Choose ride type -->
        <div *ngIf="bookStep===1" class="rp-step">
          <div class="rp-header">
            <button class="rp-back" (click)="closeBook()"><i class="fas fa-arrow-left"></i></button>
            <div>
              <div class="rp-title">Choose Booking Type</div>
              <div class="rp-sub">Order #{{ activeOrder?.id }} &mdash; {{ activeOrder?.cropName }}</div>
            </div>
          </div>

          <!-- Filter vehicles by location hint -->
          <div class="rp-location-hint" *ngIf="activeOrder?.farmerLocation">
            <i class="fas fa-map-pin"></i> Showing vehicles near <strong>{{ activeOrder?.farmerLocation }}</strong>
          </div>

          <!-- Vehicle list -->
          <div class="rp-vehicle-list">
            <div *ngIf="loadingVehicles" class="rp-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading vehicles...</div>
            <div *ngIf="!loadingVehicles && availableVehicles.length === 0" class="rp-no-vehicles">
              <i class="fas fa-tractor"></i><p>No vehicles available right now</p>
            </div>
            <div *ngFor="let v of availableVehicles"
                 class="rp-vehicle-item"
                 [class.rp-vehicle-selected]="selectedVehicle?.id === v.id"
                 (click)="selectVehicle(v)">
              <div class="rvi-left">
                <div class="rvi-icon">&#x1F69C;</div>
                <div>
                  <div class="rvi-name">{{ v.name }}</div>
                  <div class="rvi-meta">{{ v.type }} &bull; {{ v.capacity }} &bull; {{ v.location }}</div>
                  <div class="rvi-owner"><i class="fas fa-user"></i> {{ v.ownerName }}</div>
                </div>
              </div>
              <div class="rvi-right">
                <div class="rvi-price">&#x20B9;{{ v.price }}<span>/day</span></div>
                <div class="rvi-hour" *ngIf="v.pricePerHour">&#x20B9;{{ v.pricePerHour }}/hr</div>
                <div class="rvi-check" *ngIf="selectedVehicle?.id === v.id"><i class="fas fa-check-circle"></i></div>
              </div>
            </div>
          </div>

          <!-- Mode tabs -->
          <div class="rp-mode-tabs" *ngIf="selectedVehicle">
            <div class="rp-mode-tab" [class.active]="bookForm.mode==='daily'" (click)="bookForm.mode='daily'">
              <span>&#x1F4C5;</span> Daily &mdash; &#x20B9;{{ selectedVehicle?.price }}/day
            </div>
            <div class="rp-mode-tab" [class.active]="bookForm.mode==='hourly'" (click)="bookForm.mode='hourly'">
              <span>&#x23F0;</span> Hourly &mdash; &#x20B9;{{ effectiveHourlyRate() }}/hr
            </div>
          </div>

          <button class="rp-next-btn" [disabled]="!selectedVehicle" (click)="goStep(2)">
            Continue <i class="fas fa-arrow-right"></i>
          </button>
        </div>

        <!-- STEP 2: Date & time -->
        <div *ngIf="bookStep===2" class="rp-step">
          <div class="rp-header">
            <button class="rp-back" (click)="goStep(1)"><i class="fas fa-arrow-left"></i></button>
            <div>
              <div class="rp-title">{{ bookForm.mode==='daily' ? 'Pick Date & Days' : 'Pick Date & Slot' }}</div>
              <div class="rp-sub">{{ selectedVehicle?.name }}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label"><i class="fas fa-calendar-alt"></i> Date *</label>
            <input class="form-control" type="date" [(ngModel)]="bookForm.hireDate" [min]="todayStr" (change)="onDateChange()">
          </div>

          <!-- DAILY -->
          <ng-container *ngIf="bookForm.mode==='daily'">
            <div class="rp-days-row">
              <label class="form-label"><i class="fas fa-sun"></i> Number of Days</label>
              <div class="rp-counter">
                <button class="rp-ctr-btn" (click)="bookForm.days=bookForm.days>1?bookForm.days-1:1">-</button>
                <span class="rp-ctr-val">{{ bookForm.days }}</span>
                <button class="rp-ctr-btn" (click)="bookForm.days=bookForm.days+1">+</button>
              </div>
            </div>
            <div *ngIf="!loadingAvail && availability">
              <div class="avail-blocked" *ngIf="availability.fullyBooked"><i class="fas fa-lock"></i> Fully booked on this date.</div>
              <div class="avail-free"    *ngIf="!availability.fullyBooked"><i class="fas fa-check-circle"></i> Available on {{ bookForm.hireDate | date:'dd MMM yyyy' }}</div>
            </div>
          </ng-container>

          <!-- HOURLY -->
          <ng-container *ngIf="bookForm.mode==='hourly'">
            <div class="slot-section">
              <div class="slot-header">
                <span><i class="fas fa-clock"></i> Select Start Hour</span>
                <span class="slot-legend">
                  <span class="sl-dot sl-free"></span>Free
                  <span class="sl-dot sl-taken"></span>Booked
                  <span class="sl-dot sl-sel"></span>Selected
                </span>
              </div>
              <div *ngIf="loadingAvail" class="avail-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>
              <div class="hour-grid" *ngIf="!loadingAvail && availability && !availability.fullyBooked">
                <button *ngFor="let h of hours" class="hour-slot"
                        [class.hour-taken]="isHourTaken(h)"
                        [class.hour-selected]="isHourInRange(h)"
                        [class.hour-start]="h===bookForm.startHour"
                        [disabled]="isHourTaken(h)"
                        (click)="selectStartHour(h)">{{ h }}:00</button>
              </div>
              <div class="rp-days-row" style="margin-top:14px" *ngIf="bookForm.startHour!==null">
                <label class="form-label"><i class="fas fa-hourglass-half"></i> Hours</label>
                <div class="rp-counter">
                  <button class="rp-ctr-btn" (click)="bookForm.numHours=bookForm.numHours>1?bookForm.numHours-1:1;checkHourConflict()">-</button>
                  <span class="rp-ctr-val">{{ bookForm.numHours }}</span>
                  <button class="rp-ctr-btn" (click)="bookForm.numHours=bookForm.numHours<12?bookForm.numHours+1:12;checkHourConflict()">+</button>
                </div>
              </div>
              <div class="slot-time-display" *ngIf="bookForm.startHour!==null">
                <i class="fas fa-clock"></i> {{ bookForm.startHour }}:00 &rarr; {{ bookForm.startHour+bookForm.numHours }}:00 &bull; {{ bookForm.numHours }} hour(s)
              </div>
              <div class="avail-blocked" *ngIf="hourConflict"><i class="fas fa-exclamation-triangle"></i> {{ hourConflict }}</div>
            </div>
          </ng-container>

          <button class="rp-next-btn" style="margin-top:18px"
                  (click)="goStep(3)"
                  [disabled]="availability?.fullyBooked || !!hourConflict || (bookForm.mode==='hourly' && bookForm.startHour===null)">
            Review <i class="fas fa-arrow-right"></i>
          </button>
        </div>

        <!-- STEP 3: Confirm -->
        <div *ngIf="bookStep===3" class="rp-step">
          <div class="rp-header">
            <button class="rp-back" (click)="goStep(2)"><i class="fas fa-arrow-left"></i></button>
            <div>
              <div class="rp-title">Confirm Booking</div>
              <div class="rp-sub">Added to Order #{{ activeOrder?.id }}</div>
            </div>
          </div>

          <div class="rp-confirm-card">
            <!-- Order reference -->
            <div class="rp-confirm-row rp-order-ref">
              <span><i class="fas fa-shopping-basket"></i> Order</span>
              <span>#{{ activeOrder?.id }} &mdash; {{ activeOrder?.cropName }}</span>
            </div>
            <div class="rp-divider"></div>
            <!-- Vehicle details -->
            <div class="rp-confirm-row rp-confirm-main">
              <div class="rp-confirm-icon">&#x1F69C;</div>
              <div>
                <div class="rp-confirm-vehicle">{{ selectedVehicle?.name }}</div>
                <div class="rp-confirm-type">{{ selectedVehicle?.type }} &bull; {{ selectedVehicle?.capacity }}</div>
                <div class="rp-confirm-owner"><i class="fas fa-user"></i> {{ selectedVehicle?.ownerName }}</div>
              </div>
            </div>
            <div class="rp-divider"></div>
            <div class="rp-confirm-row"><span><i class="fas fa-calendar"></i> Date</span><span>{{ bookForm.hireDate | date:'dd MMM yyyy' }}</span></div>
            <div class="rp-confirm-row" *ngIf="bookForm.mode==='daily'"><span><i class="fas fa-sun"></i> Days</span><span>{{ bookForm.days }} day(s)</span></div>
            <div class="rp-confirm-row" *ngIf="bookForm.mode==='hourly'"><span><i class="fas fa-clock"></i> Slot</span><span>{{ bookForm.startHour }}:00 - {{ bookForm.startHour+bookForm.numHours }}:00</span></div>
            <div class="rp-divider"></div>
            <!-- Price breakdown -->
            <div class="rp-confirm-row rp-price-row">
              <span>Crop Amount</span><span>&#x20B9;{{ getProductAmount(activeOrder!) | number:'1.2-2' }}</span>
            </div>
            <div class="rp-confirm-row rp-price-row">
              <span>Vehicle Charge</span>
              <span>&#x20B9;{{ bookForm.mode==='daily' ? (selectedVehicle?.price||0)*bookForm.days : calcHourlyPrice() | number:'1.2-2' }}</span>
            </div>
            <div class="rp-confirm-row rp-total-row">
              <span><strong>New Grand Total</strong></span>
              <span class="rp-total-price">&#x20B9;{{ grandTotal() | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="rp-note"><i class="fas fa-info-circle"></i> Vehicle booking request will be sent to the owner. Vehicle cost will be added to your order total.</div>

          <button class="rp-confirm-btn" (click)="confirmVehicleBook()" [disabled]="saving">
            <span class="spinner" *ngIf="saving"></span>
            <i class="fas fa-bolt" *ngIf="!saving"></i>
            {{ saving ? 'Booking...' : 'Confirm & Book Vehicle' }}
          </button>
        </div>

        <!-- STEP 4: Success -->
        <div *ngIf="bookStep===4" class="rp-step rp-success-step">
          <div class="rp-success-circle"><i class="fas fa-check"></i></div>
          <h2 class="rp-success-title">Vehicle Booked!</h2>
          <p class="rp-success-sub">{{ selectedVehicle?.name }} has been booked and added to Order #{{ activeOrder?.id }}</p>
          <div class="rp-success-detail">
            <div class="rp-confirm-row"><span>Vehicle</span><span>{{ selectedVehicle?.name }}</span></div>
            <div class="rp-confirm-row"><span>Date</span><span>{{ bookForm.hireDate | date:'dd MMM yyyy' }}</span></div>
            <div class="rp-confirm-row"><span>New Total</span><span class="rp-total-price">&#x20B9;{{ grandTotal() | number:'1.2-2' }}</span></div>
          </div>
          <button class="rp-confirm-btn" (click)="closeBook()">
            <i class="fas fa-list"></i> Back to Orders
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .orders-list { display:flex; flex-direction:column; gap:16px; }
    .order-card { background:#fff; border-radius:14px; border:1px solid rgba(30,138,44,0.12); overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.4s ease both; transition:box-shadow 0.2s; }
    .order-card:hover { box-shadow:0 4px 16px rgba(30,138,44,0.1); }
    .oc-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(30,138,44,0.08); }
    .oc-left { display:flex; align-items:center; gap:12px; }
    .oc-emoji { font-size:1.5rem; }
    .oc-title { font-size:1rem; font-weight:700; color:#1a2e1c; }
    .oc-id { font-size:0.75rem; color:#6b8f70; }
    .oc-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
    .oc-price-section { background:#f7fdf8; border-radius:10px; padding:14px; border:1px solid rgba(30,138,44,0.1); }
    .oc-detail-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; }
    .od-label { font-size:0.82rem; color:#6b8f70; display:flex; align-items:center; gap:7px; }
    .od-label i { color:#27a836; }
    .od-value { font-size:0.875rem; color:#1a2e1c; font-weight:600; }
    .vehicle-row .od-label,.vehicle-row .od-label i { color:#d97706; }
    .vehicle-amt { color:#d97706; }
    .oc-price-divider { height:1px; background:rgba(30,138,44,0.15); margin:8px 0; }
    .total-label { font-size:0.9rem; font-weight:700; color:#1a2e1c; }
    .total-val { font-size:1.1rem; font-weight:800; color:#1a5e2a; }
    .oc-person-card { border-radius:10px; padding:12px 14px; border:1.5px solid; }
    .buyer-side  { background:#f0fdf4; border-color:rgba(30,138,44,0.2); }
    .farmer-side { background:#eff6ff; border-color:rgba(59,130,246,0.2); }
    .opc-header { display:flex; align-items:center; gap:7px; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
    .buyer-side .opc-header { color:#16a34a; } .farmer-side .opc-header { color:#2563eb; }
    .opc-name { font-size:0.95rem; font-weight:700; color:#1a2e1c; margin-bottom:4px; }
    .opc-info { font-size:0.8rem; color:#6b8f70; display:flex; align-items:center; gap:6px; margin-top:3px; }

    /* Vehicle strip */
    .vehicle-strip { display:flex; align-items:center; justify-content:space-between; gap:12px; background:linear-gradient(135deg,#f0faf2,#e6f7ea); border:1.5px dashed rgba(30,138,44,0.3); border-radius:12px; padding:14px 16px; }
    .vs-left { display:flex; align-items:center; gap:12px; }
    .vs-icon { font-size:1.8rem; }
    .vs-title { font-size:0.88rem; font-weight:700; color:#1a2e1c; }
    .vs-sub { font-size:0.75rem; color:#6b8f70; margin-top:2px; }
    .rapido-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; background:linear-gradient(135deg,#27a836,#1a8a2a); color:#fff; border:none; border-radius:10px; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s; font-family:inherit; white-space:nowrap; }
    .rapido-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(30,138,44,0.35); }

    .vehicle-booked-strip { background:#dcfce7; border:1px solid #86efac; border-radius:10px; padding:10px 14px; font-size:0.82rem; color:#16a34a; display:flex; align-items:center; gap:8px; }
    .vehicle-booked-strip i { font-size:1rem; }

    .oc-msg { font-size:0.82rem; color:#6b8f70; background:#f7fdf8; border-radius:7px; padding:8px 12px; }
    .oc-msg i { margin-right:6px; color:#27a836; }
    .oc-payment { display:flex; }
    .pay-badge { display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:600; color:#6b8f70; background:#f3f4f6; border-radius:20px; padding:4px 12px; border:1px solid rgba(0,0,0,0.07); }
    .oc-footer { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background:#f7fdf8; border-top:1px solid rgba(30,138,44,0.07); }
    .oc-date { display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#6b8f70; }
    .oc-date i { color:#27a836; }
    .oc-actions { display:flex; gap:8px; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    /* ===== RAPIDO MODAL ===== */
    .rapido-modal { background:#fff; border-radius:20px; width:100%; max-width:500px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.18); animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both; max-height:90vh; overflow-y:auto; }
    @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    .rp-progress { height:4px; background:#e9ecef; position:sticky; top:0; z-index:1; }
    .rp-bar { height:100%; background:linear-gradient(90deg,#27a836,#4ac85a); border-radius:0 2px 2px 0; transition:width 0.4s ease; }
    .rp-step { padding:22px; }
    .rp-header { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
    .rp-back { background:none; border:1.5px solid rgba(30,138,44,0.2); border-radius:50%; width:36px; height:36px; cursor:pointer; color:#1a5e2a; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
    .rp-back:hover { background:#f0faf2; }
    .rp-title { font-size:1.05rem; font-weight:800; color:#1a2e1c; }
    .rp-sub { font-size:0.75rem; color:#6b8f70; margin-top:2px; }

    .rp-location-hint { background:#fffbeb; border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:8px 12px; font-size:0.78rem; color:#92400e; margin-bottom:14px; }
    .rp-location-hint i { margin-right:6px; }

    /* Vehicle list */
    .rp-vehicle-list { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; max-height:260px; overflow-y:auto; }
    .rp-loading,.rp-no-vehicles { text-align:center; padding:20px; color:#6b8f70; font-size:0.85rem; }
    .rp-no-vehicles i { font-size:2rem; display:block; margin-bottom:8px; opacity:0.3; }
    .rp-vehicle-item { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border:2px solid rgba(30,138,44,0.12); border-radius:12px; cursor:pointer; transition:all 0.15s; gap:12px; }
    .rp-vehicle-item:hover { border-color:rgba(30,138,44,0.3); background:#f7fdf8; }
    .rp-vehicle-selected { border-color:#27a836 !important; background:#f0faf2 !important; }
    .rvi-left { display:flex; align-items:center; gap:12px; }
    .rvi-icon { font-size:1.8rem; }
    .rvi-name { font-size:0.9rem; font-weight:700; color:#1a2e1c; }
    .rvi-meta { font-size:0.75rem; color:#6b8f70; margin-top:2px; }
    .rvi-owner { font-size:0.75rem; color:#4a9050; margin-top:2px; }
    .rvi-owner i { margin-right:4px; }
    .rvi-right { text-align:right; flex-shrink:0; }
    .rvi-price { font-size:1rem; font-weight:800; color:#1a5e2a; }
    .rvi-price span { font-size:0.72rem; font-weight:400; color:#6b8f70; }
    .rvi-hour { font-size:0.72rem; background:#f0faf2; color:#4a9050; padding:2px 7px; border-radius:6px; margin-top:3px; }
    .rvi-check { color:#27a836; font-size:1.2rem; margin-top:4px; }

    /* Mode tabs */
    .rp-mode-tabs { display:flex; gap:0; border:1.5px solid rgba(30,138,44,0.2); border-radius:10px; overflow:hidden; margin-bottom:4px; }
    .rp-mode-tab { flex:1; padding:10px; border:none; background:#fff; cursor:pointer; font-family:inherit; font-size:0.82rem; font-weight:600; color:#6b8f70; transition:all 0.15s; text-align:center; }
    .rp-mode-tab:first-child { border-right:1.5px solid rgba(30,138,44,0.2); }
    .rp-mode-tab.active { background:#f0faf2; color:#1a5e2a; }

    /* Date & counter */
    .rp-days-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .rp-counter { display:flex; align-items:center; gap:12px; }
    .rp-ctr-btn { width:32px; height:32px; border-radius:50%; border:1.5px solid rgba(30,138,44,0.3); background:#fff; color:#1a5e2a; font-size:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
    .rp-ctr-btn:hover { background:#27a836; color:#fff; border-color:#27a836; }
    .rp-ctr-val { font-size:1.1rem; font-weight:800; color:#1a2e1c; min-width:24px; text-align:center; }

    /* Availability */
    .avail-loading { font-size:0.8rem; color:#6b8f70; padding:8px 0; }
    .avail-blocked { background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:10px 14px; border-radius:10px; font-size:0.8rem; margin:8px 0; }
    .avail-blocked i { margin-right:6px; }
    .avail-free { background:#dcfce7; color:#16a34a; border:1px solid #86efac; padding:10px 14px; border-radius:10px; font-size:0.8rem; margin:8px 0; }
    .avail-free i { margin-right:6px; }

    /* Hour slots */
    .slot-section { background:#f8fdf9; border:1px solid rgba(30,138,44,0.15); border-radius:12px; padding:14px; }
    .slot-header { display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; font-weight:700; color:#1a5e2a; margin-bottom:10px; flex-wrap:wrap; gap:6px; }
    .slot-legend { display:flex; align-items:center; gap:8px; font-size:0.7rem; font-weight:500; color:#6b8f70; }
    .sl-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:2px; }
    .sl-free { background:#dcfce7; border:1.5px solid #86efac; } .sl-taken { background:#fee2e2; border:1.5px solid #fca5a5; } .sl-sel { background:#4a9050; border:1.5px solid #357540; }
    .hour-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
    .hour-slot { padding:8px 4px; border-radius:8px; border:1.5px solid rgba(30,138,44,0.2); background:#fff; color:#1a5e2a; font-size:0.73rem; font-weight:700; cursor:pointer; transition:all 0.12s; text-align:center; }
    .hour-slot:hover:not(:disabled) { background:#f0faf2; border-color:#4a9050; transform:scale(1.05); }
    .hour-taken  { background:#fee2e2 !important; border-color:#fca5a5 !important; color:#dc2626 !important; cursor:not-allowed !important; opacity:0.7; }
    .hour-selected { background:#dcfce7 !important; border-color:#4a9050 !important; }
    .hour-start  { background:#4a9050 !important; border-color:#357540 !important; color:#fff !important; }
    .slot-time-display { background:#f0faf2; border:1px solid rgba(30,138,44,0.2); border-radius:8px; padding:8px 12px; font-size:0.8rem; color:#1a5e2a; font-weight:600; margin-top:8px; }

    /* Buttons */
    .rp-next-btn { width:100%; padding:13px; border:none; border-radius:12px; background:linear-gradient(135deg,#27a836,#1a8a2a); color:#fff; font-size:0.9rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; font-family:inherit; }
    .rp-next-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 16px rgba(30,138,44,0.3); }
    .rp-next-btn:disabled { opacity:0.45; cursor:not-allowed; }
    .rp-confirm-btn { width:100%; padding:13px; border:none; border-radius:12px; background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; font-size:0.9rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; font-family:inherit; margin-top:14px; }
    .rp-confirm-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 16px rgba(234,88,12,0.3); }
    .rp-confirm-btn:disabled { opacity:0.45; cursor:not-allowed; }

    /* Confirm card */
    .rp-confirm-card { background:#f8fdf9; border:1px solid rgba(30,138,44,0.15); border-radius:14px; padding:16px; }
    .rp-confirm-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; font-size:0.83rem; color:#3a5a3e; border-bottom:1px solid rgba(30,138,44,0.07); }
    .rp-confirm-row:last-child { border-bottom:none; }
    .rp-confirm-row i { margin-right:6px; color:#27a836; }
    .rp-order-ref { background:#fffbeb; border-radius:8px; padding:8px 10px; margin-bottom:2px; font-size:0.8rem; color:#92400e; }
    .rp-order-ref i { color:#d97706; }
    .rp-confirm-main { align-items:flex-start; padding:10px 0; }
    .rp-confirm-icon { font-size:2.2rem; margin-right:12px; }
    .rp-confirm-vehicle { font-size:0.95rem; font-weight:700; color:#1a2e1c; }
    .rp-confirm-type { font-size:0.75rem; color:#6b8f70; margin-top:2px; }
    .rp-confirm-owner { font-size:0.75rem; color:#4a9050; margin-top:2px; }
    .rp-divider { height:1px; background:rgba(30,138,44,0.12); margin:4px 0; }
    .rp-price-row { color:#4a9050; }
    .rp-total-row { font-weight:700; }
    .rp-total-price { font-size:1.15rem; font-weight:900; color:#1a5e2a; }
    .rp-note { background:#fffbeb; border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:10px 14px; font-size:0.76rem; color:#92400e; margin-top:12px; }
    .rp-note i { margin-right:6px; }

    /* Success */
    .rp-success-step { text-align:center; padding:32px 22px; }
    .rp-success-circle { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#27a836,#1a8a2a); color:#fff; font-size:2.2rem; display:flex; align-items:center; justify-content:center; margin:0 auto 18px; animation:bounceIn 0.5s ease; box-shadow:0 8px 24px rgba(30,138,44,0.3); }
    @keyframes bounceIn { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
    .rp-success-title { font-size:1.4rem; font-weight:900; color:#1a2e1c; margin-bottom:8px; }
    .rp-success-sub { font-size:0.82rem; color:#6b8f70; margin-bottom:18px; line-height:1.6; }
    .rp-success-detail { background:#f0faf2; border-radius:12px; padding:14px; margin-bottom:4px; text-align:left; }
  `]
})
export class OrdersComponent implements OnInit {
  user: User | null = null;
  orders: Order[] = [];
  loading = true;
  success = '';
  error = '';

  // Rapido booking state
  bookStep = 0;
  activeOrder: Order | null = null;
  selectedVehicle: any = null;
  availableVehicles: any[] = [];
  loadingVehicles = false;
  loadingAvail = false;
  availability: any = null;
  hourConflict = '';
  hours = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  todayStr = new Date().toISOString().split('T')[0];
  saving = false;
  bookForm: any = { hireDate: this.todayStr, days:1, mode:'daily', startHour:null, numHours:2 };

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private vehicleService: VehicleService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.user = this.authService.currentUser;
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.orderService.getMyOrders().subscribe({
      next: (data) => { this.orders = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  updateStatus(order: Order, status: string) {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: () => {
        (order as any).status = status;
        this.success = `Order ${status} successfully.`;
        setTimeout(() => this.success = '', 3000);
      },
      error: () => {}
    });
  }

  // ---- RAPIDO BOOKING FLOW ----

  startVehicleBook(order: Order) {
    this.activeOrder = order;
    this.selectedVehicle = null;
    this.bookForm = { hireDate: this.todayStr, days:1, mode:'daily', startHour:null, numHours:2 };
    this.availability = null;
    this.hourConflict = '';
    this.bookStep = 1;
    this.loadAvailableVehicles();
  }

  loadAvailableVehicles() {
    this.loadingVehicles = true;
    this.vehicleService.getAll().subscribe({
      next: (v: any[]) => {
        this.availableVehicles = v.filter((x: any) => x.status === 'available');
        this.loadingVehicles = false;
      },
      error: () => { this.loadingVehicles = false; }
    });
  }

  selectVehicle(v: any) {
    this.selectedVehicle = v;
  }

  goStep(step: number) {
    if (step === 2) { this.loadAvailability(); }
    this.bookStep = step;
  }

  closeBook() {
    this.bookStep = 0;
    this.activeOrder = null;
    this.selectedVehicle = null;
  }

  onDateChange() {
    this.availability = null;
    this.bookForm.startHour = null;
    this.hourConflict = '';
    this.loadAvailability();
  }

  loadAvailability() {
    if (!this.selectedVehicle || !this.bookForm.hireDate) { return; }
    this.loadingAvail = true;
    this.http.get<any>(`${environment.apiUrl}/vehicles/${this.selectedVehicle.id}/availability?date=${this.bookForm.hireDate}`)
      .subscribe({
        next: (res) => { this.availability = res; this.loadingAvail = false; },
        error: () => { this.loadingAvail = false; }
      });
  }

  selectStartHour(h: number) {
    if (this.isHourTaken(h)) { return; }
    this.bookForm.startHour = h;
    this.checkHourConflict();
  }

  isHourTaken(h: number): boolean { return this.availability?.bookedHours?.includes(h) ?? false; }

  isHourInRange(h: number): boolean {
    if (this.bookForm.startHour === null) { return false; }
    return h > this.bookForm.startHour && h < this.bookForm.startHour + this.bookForm.numHours;
  }

  checkHourConflict() {
    this.hourConflict = '';
    if (this.bookForm.startHour === null || !this.availability) { return; }
    for (let h = this.bookForm.startHour; h < this.bookForm.startHour + this.bookForm.numHours; h++) {
      if (this.isHourTaken(h)) { this.hourConflict = `Hour ${h}:00 is already booked.`; return; }
    }
  }

  effectiveHourlyRate(): number {
    if (!this.selectedVehicle) { return 0; }
    return this.selectedVehicle.pricePerHour ? +this.selectedVehicle.pricePerHour : +(+this.selectedVehicle.price / 8).toFixed(0);
  }

  calcHourlyPrice(): number { return this.effectiveHourlyRate() * this.bookForm.numHours; }

  vehicleCharge(): number {
    if (!this.selectedVehicle) { return 0; }
    return this.bookForm.mode === 'daily' ? +this.selectedVehicle.price * this.bookForm.days : this.calcHourlyPrice();
  }

  grandTotal(): number {
    if (!this.activeOrder) { return 0; }
    return +this.getProductAmount(this.activeOrder) + this.vehicleCharge();
  }

  confirmVehicleBook() {
    if (!this.selectedVehicle || !this.activeOrder) { return; }
    this.saving = true;
    this.error = '';

    // Step 1: Book the vehicle
    const vehiclePayload: any = {
      vehicleId:   this.selectedVehicle.id,
      hireDate:    this.bookForm.hireDate,
      bookingMode: this.bookForm.mode,
      message:     `For Order #${this.activeOrder.id} - ${this.activeOrder.cropName}`
    };
    if (this.bookForm.mode === 'daily') { vehiclePayload.days = this.bookForm.days; }
    else { vehiclePayload.startHour = this.bookForm.startHour; vehiclePayload.numHours = this.bookForm.numHours; }

    this.vehicleService.book(vehiclePayload).subscribe({
      next: () => {
        // Step 2: Attach vehicle cost to the order
        const attachPayload = {
          vehicleId:     this.selectedVehicle.id,
          vehicleName:   this.selectedVehicle.name,
          vehicleAmount: this.vehicleCharge()
        };
        this.http.patch(`${environment.apiUrl}/orders/${this.activeOrder!.id}/attach-vehicle`, attachPayload)
          .subscribe({
            next: () => {
              this.saving = false;
              this.bookStep = 4;
              this.loadOrders(); // refresh order totals
            },
            error: (err: any) => {
              this.saving = false;
              this.error = err.error?.error || 'Vehicle booked but failed to update order.';
            }
          });
      },
      error: (err: any) => { this.saving = false; this.error = err.error?.error || 'Failed to book vehicle.'; }
    });
  }

  getProductAmount(o: Order): number {
    if ((o as any).productAmount != null) { return (o as any).productAmount; }
    if ((o as any).vehicleAmount) { return o.totalPrice - (o as any).vehicleAmount; }
    return o.totalPrice;
  }

  getStatusColor(s: string): string {
    const m: Record<string,string> = { pending:'amber', accepted:'green', completed:'blue', rejected:'red', cancelled:'red' };
    return m[s] || 'default';
  }

  getStatusIcon(s: string): string {
    const m: Record<string,string> = { pending:'fas fa-clock', accepted:'fas fa-check', completed:'fas fa-check-double', rejected:'fas fa-times', cancelled:'fas fa-ban' };
    return m[s] || 'fas fa-circle';
  }
}

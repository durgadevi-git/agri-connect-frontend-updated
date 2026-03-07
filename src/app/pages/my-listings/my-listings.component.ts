import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CropService } from '../../services/services';
import { CropListing } from '../../models/models';

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">🌾 My Listings</h1>
        <p class="page-subtitle">Manage your crop listings</p>
      </div>
      <button class="btn btn-primary" (click)="openModal()">
        Add Listing
      </button>
    </div>

    <div class="alert alert-error" *ngIf="error">{{ error }}</div>
    <div class="alert alert-success" *ngIf="success">{{ success }}</div>

    <!-- Table -->
    <div class="card">
      <div class="empty-state" *ngIf="listings.length === 0 && !loading">
         <h3>No listings yet</h3>
        <p>Start by adding your first crop listing</p>
      </div>
      <div class="table-responsive" *ngIf="listings.length > 0">
        <table class="table">
          <thead>
            <tr>
              <th>Crop</th><th>Category</th><th>Qty</th><th>Price</th><th>Location</th><th>Status</th><th>Views</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of listings">
              <td><strong>{{ l.cropName }}</strong></td>
              <td>{{ l.category || '-' }}</td>
              <td>{{ l.quantity }} {{ l.unit }}</td>
              <td><strong>₹{{ l.pricePerUnit }}</strong></td>
              <td>{{ l.location || '-' }}</td>
              <td><span [class]="'badge badge-' + statusColor(l.status)">{{ l.status }}</span></td>
              <td>{{ l.views }}</td>
              <td>
                <button class="btn btn-outline btn-sm" (click)="edit(l)" style="margin-right:6px">
                   </button>
                <button class="btn btn-danger btn-sm" (click)="delete(l.id)">
                   </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">{{ editId ? 'Edit' : 'Add' }} Listing</h3>
          <button class="modal-close" (click)="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <form (ngSubmit)="save()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Crop Name *</label>
              <input class="form-control" [(ngModel)]="form.cropName" name="cropName" required>
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" [(ngModel)]="form.category" name="category">
                <option value="">Select</option>
                <option *ngFor="let c of categories">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Quantity *</label>
              <input class="form-control" type="number" [(ngModel)]="form.quantity" name="quantity" required>
            </div>
            <div class="form-group">
              <label class="form-label">Unit</label>
              <select class="form-control" [(ngModel)]="form.unit" name="unit">
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
                <option value="ton">ton</option>
                <option value="dozen">dozen</option>
                <option value="piece">piece</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price per {{ form.unit === 'ton' ? 'ton' : form.unit === 'quintal' ? 'quintal' : form.unit === 'kg' ? 'kg' : 'unit' }} (₹) *</label>
              <input class="form-control" type="number" [(ngModel)]="form.pricePerUnit" name="pricePerUnit" required min="0">
              <div *ngIf="form.unit === 'ton' && form.pricePerUnit > 0" style="font-size:0.76rem;color:#16a34a;margin-top:4px">
                💡 ₹{{ form.pricePerUnit }}/ton = ₹{{ (form.pricePerUnit / 1000).toFixed(2) }}/kg
                | Total: ₹{{ (form.pricePerUnit * form.quantity) | number }}
              </div>
              <div *ngIf="form.unit === 'quintal' && form.pricePerUnit > 0" style="font-size:0.76rem;color:#16a34a;margin-top:4px">
                💡 ₹{{ form.pricePerUnit }}/quintal = ₹{{ (form.pricePerUnit / 100).toFixed(2) }}/kg
                | Total: ₹{{ (form.pricePerUnit * form.quantity) | number }}
              </div>
              <div *ngIf="form.unit === 'kg' && form.pricePerUnit > 0" style="font-size:0.76rem;color:#16a34a;margin-top:4px">
                💡 Total value: ₹{{ (form.pricePerUnit * form.quantity) | number }}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input class="form-control" [(ngModel)]="form.location" name="location" placeholder="City, State">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Harvest Date <span style="color:#16a34a;font-size:0.75rem">(Today or past dates only)</span></label>
            <input class="form-control" type="date" [(ngModel)]="form.harvestDate" name="harvestDate" [max]="todayDate">
            <div *ngIf="form.harvestDate && form.harvestDate > todayDate" style="color:#dc2626;font-size:0.78rem;margin-top:4px">
              ⚠️ Future dates are not allowed for harvest date.
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" [(ngModel)]="form.description" name="description" rows="3"></textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end">
            <button type="button" class="btn btn-outline" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span class="spinner" *ngIf="saving"></span>
              {{ saving ? 'Saving...' : (editId ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; }
    .listings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    .listing-card { background: #fff; border: 1px solid rgba(30,138,44,0.12); border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); transition: all 0.2s; }
    .listing-card:hover { border-color: rgba(30,138,44,0.3); box-shadow: 0 4px 16px rgba(30,138,44,0.1); transform: translateY(-2px); }
    .listing-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .listing-name { font-size: 1.05rem; font-weight: 700; color: #1a2e1c; }
    .listing-cat  { font-size: 0.72rem; font-weight: 700; background: #e8faea; color: #16a34a; padding: 3px 10px; border-radius: 20px; }
    .listing-price { font-size: 1.4rem; font-weight: 800; color: #1a5e2a; font-family: 'JetBrains Mono', monospace; margin-bottom: 8px; }
    .listing-price span { font-size: 0.8rem; font-weight: 400; color: #6b8f70; font-family: 'Poppins', sans-serif; }
    .listing-details { font-size: 0.82rem; color: #6b8f70; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .listing-details span { display: flex; align-items: center; gap: 7px; }
    .listing-details i { color: #27a836; width: 14px; }
    .listing-footer { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(30,138,44,0.1); }
    .form-section-title { font-size: 1.1rem; font-weight: 700; color: #1a2e1c; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(30,138,44,0.12); }
  `]
})
export class MyListingsComponent implements OnInit {
  listings: CropListing[] = [];
  loading = true;
  showModal = false;
  editId: number | null = null;
  saving = false;
  error = ''; success = '';
  categories = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Oilseeds', 'Others'];
  todayDate = new Date().toISOString().split('T')[0];
  form: any = { cropName: '', category: '', quantity: 0, unit: 'kg', pricePerUnit: 0, location: '', harvestDate: '', description: '' };

  constructor(private cropService: CropService) {}
  ngOnInit() { this.load(); }

  load() {
    this.cropService.getMyListings().subscribe({ next: l => { this.listings = l; this.loading = false; }, error: () => this.loading = false });
  }

  openModal() { this.form = { cropName: '', category: '', quantity: 0, unit: 'kg', pricePerUnit: 0, location: '', harvestDate: '', description: '' }; this.editId = null; this.showModal = true; }
  edit(l: CropListing) { this.form = { cropName: l.cropName, category: l.category, quantity: l.quantity, unit: l.unit, pricePerUnit: l.pricePerUnit, location: l.location, harvestDate: l.harvestDate, description: l.description }; this.editId = l.id; this.showModal = true; }
  closeModal() { this.showModal = false; }

  save() {
    // Validate harvest date
    if (this.form.harvestDate && this.form.harvestDate > this.todayDate) {
      this.error = 'Harvest date cannot be a future date. Please select today or a past date.';
      return;
    }
    this.saving = true; this.error = '';
    const obs = this.editId ? this.cropService.update(this.editId, this.form) : this.cropService.create(this.form);
    obs.subscribe({
      next: () => { this.success = this.editId ? 'Updated!' : 'Created!'; this.saving = false; this.closeModal(); this.load(); setTimeout(() => this.success = '', 3000); },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.saving = false; }
    });
  }

  delete(id: number) {
    if (!confirm('Delete this listing?')) return;
    this.cropService.delete(id).subscribe({ next: () => { this.success = 'Deleted!'; this.load(); setTimeout(() => this.success = '', 3000); } });
  }

  statusColor(s: string) { const m: any = { available: 'success', sold: 'muted', reserved: 'warning' }; return m[s] || 'muted'; }
}

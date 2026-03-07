import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManpowerService, OrderService } from '../../services/services';
import { AuthService } from '../../services/auth.service';
import { ManpowerListing, User, Notification } from '../../models/models';

@Component({
  selector: 'app-manpower',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Manpower</h1>
        <p class="page-subtitle">Find skilled agricultural workers</p>
      </div>
      <div class="ph-btns">
        <!-- Manpower worker sees: Hire Requests + My Profile + Add -->
        <ng-container *ngIf="user?.role === 'manpower'">
          <button class="btn btn-outline btn-notif" (click)="switchView('requests')" *ngIf="viewMode !== 'requests'">
            <i class="fas fa-bell"></i> Hire Requests
            <span class="notif-dot" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          </button>
          <button class="btn btn-outline" (click)="switchView('my')" *ngIf="viewMode !== 'my'">
            <i class="fas fa-id-card"></i> My Profiles
          </button>
          <button class="btn btn-outline" (click)="switchView('browse')" *ngIf="viewMode !== 'browse'">
            <i class="fas fa-search"></i> Browse
          </button>
          <button class="btn btn-primary" (click)="openModal()" *ngIf="viewMode === 'browse' || viewMode === 'my'">
            <i class="fas fa-plus"></i> Add Profile
          </button>
        </ng-container>
      </div>
    </div>

    <div class="flash flash-success" *ngIf="success">
      <i class="fas fa-check-circle"></i> {{ success }}
    </div>
    <div class="flash flash-error" *ngIf="error">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <!-- ══ BROWSE VIEW ══ -->
    <ng-container *ngIf="viewMode === 'browse'">
      <div class="card filter-bar">
        <div class="filter-row">
          <div class="search-field">
            <i class="fas fa-search sf-icon"></i>
            <input class="form-control sf-input" [(ngModel)]="filterSkill"
              placeholder="Search skill..." (ngModelChange)="load()">
          </div>
          <div class="search-field">
            <i class="fas fa-map-marker-alt sf-icon"></i>
            <input class="form-control sf-input" [(ngModel)]="filterLocation"
              placeholder="Location..." (ngModelChange)="load()">
          </div>
          <button class="btn btn-outline btn-sm clear-btn" *ngIf="filterSkill || filterLocation" (click)="clearFilters()">
            <i class="fas fa-times"></i> Clear
          </button>
        </div>
      </div>

      <div class="workers-grid">
        <div *ngFor="let w of listings; let i = index"
          class="worker-card"
          [style.animation-delay]="(i * 55) + 'ms'">
          <!-- Top accent bar -->
          <div class="wc-accent"></div>

          <div class="wc-header">
            <div class="wc-avatar" [style.background]="avatarColor(w.workerName)">
              {{ w.workerName[0].toUpperCase() }}
              <span class="wc-online" *ngIf="w.workerOnline"></span>
            </div>
            <div class="wc-meta">
              <div class="wc-name">{{ w.workerName }}</div>
              <div class="wc-title">{{ w.title }}</div>
            </div>
            <div class="wc-avail" [class.avail-yes]="w.availability === 'available'">
              <span class="avail-ring"></span>
              {{ w.availability === 'available' ? '✅ Available' : '❌ Not Available' }}
            </div>
          </div>

          <div class="wc-rate">
            <span class="rate-num">₹{{ w.dailyRate }}</span>
            <span class="rate-per">/day</span>
          </div>

          <div class="wc-tags" *ngIf="w.skills">
            <span class="skill-tag" *ngFor="let s of skillList(w.skills)">{{ s }}</span>
          </div>

          <div class="wc-details">
            <div class="wc-detail" *ngIf="w.experience">
              <i class="fas fa-briefcase"></i> {{ w.experience }}
            </div>
            <div class="wc-detail" *ngIf="w.location || w.workerLocation">
              <i class="fas fa-map-marker-alt"></i> {{ w.location || w.workerLocation }}
            </div>
          </div>

          <div class="wc-footer">
            <div></div>
            <button class="btn btn-primary btn-sm hire-btn"
              *ngIf="user?.role !== 'manpower'"
              (click)="openHireModal(w)">
              <i class="fas fa-handshake"></i> Hire Now
            </button>
          </div>
        </div>
      </div>

      <div class="empty-block" *ngIf="listings.length === 0 && !loading">
        <div class="empty-ico"><i class="fas fa-users"></i></div>
        <h3>No workers found</h3>
        <p>Adjust filters or check back later</p>
      </div>
    </ng-container>

    <!-- ══ HIRE REQUESTS VIEW (manpower worker inbox) ══ -->
    <ng-container *ngIf="viewMode === 'requests'">
      <div class="requests-panel">
        <div class="rp-header">
          <div class="rp-title"><i class="fas fa-inbox"></i> Incoming Hire Requests</div>
          <span class="rp-badge" *ngIf="unreadCount > 0">{{ unreadCount }} new</span>
        </div>

        <div *ngIf="loadingRequests" class="rp-loading">
          <span class="spinner"></span> Loading requests...
        </div>

        <div *ngFor="let n of hireRequests" class="hire-req-row" [class.req-unread]="!n.isRead">
          <div class="req-unread-bar" *ngIf="!n.isRead"></div>
          <div class="req-icon-wrap">
            <i class="fas fa-user-tie"></i>
          </div>
          <div class="req-body">
            <div class="req-title">{{ n.title }}</div>
            <div class="req-msg">{{ n.message }}</div>
            <div class="req-time"><i class="fas fa-clock"></i> {{ timeAgo(n.createdAt) }}</div>
          </div>
          <div class="req-actions">
            <button class="btn btn-primary btn-sm" *ngIf="!n.isRead" (click)="markRead(n)">
              <i class="fas fa-check"></i> Mark Read
            </button>
            <div class="req-seen" *ngIf="n.isRead">
              <i class="fas fa-check-double"></i> Seen
            </div>
          </div>
        </div>

        <div class="empty-block" *ngIf="!loadingRequests && hireRequests.length === 0">
          <div class="empty-ico"><i class="fas fa-inbox"></i></div>
          <h3>No hire requests yet</h3>
          <p>When farmers book you, their requests appear here</p>
        </div>
      </div>
    </ng-container>

    <!-- ══ MY PROFILES VIEW ══ -->
    <ng-container *ngIf="viewMode === 'my'">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-id-card"></i> My Work Profiles</h3>
        </div>
        <div *ngFor="let w of myListings" class="my-listing-row">
          <div class="ml-avatar">{{ w.title[0].toUpperCase() }}</div>
          <div class="ml-body">
            <div class="ml-name">{{ w.title }}</div>
            <div class="ml-sub">₹{{ w.dailyRate }}/day
              <span *ngIf="w.skills"> · {{ w.skills | slice:0:50 }}</span>
            </div>
          </div>
          <div class="ml-right">
            <div class="wc-avail" [class.avail-yes]="w.availability === 'available'" style="font-size:0.72rem">
              <span class="avail-ring"></span>{{ w.availability }}
            </div>
            <button class="btn btn-danger btn-sm icon-btn" (click)="delete(w.id)">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="empty-block" *ngIf="myListings.length === 0">
          <div class="empty-ico"><i class="fas fa-user-slash"></i></div>
          <h3>No profiles yet</h3>
          <p>Add a work profile to get discovered by farmers</p>
        </div>
      </div>
    </ng-container>

    <!-- ══ ADD PROFILE MODAL ══ -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal=false">
      <div class="modal anim-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-hard-hat"></i> Add Work Profile</h3>
          <button class="modal-close" (click)="showModal=false"><i class="fas fa-times"></i></button>
        </div>
        <form (ngSubmit)="saveProfile()">
          <div class="form-group">
            <label class="form-label">Job Title *</label>
            <input class="form-control" [(ngModel)]="form.title" name="title"
              placeholder="e.g. Farm Worker, Harvesting Expert" required>
          </div>
          <div class="two-col">
            <div class="form-group">
              <label class="form-label">Daily Rate (₹) *</label>
              <input class="form-control" type="number" [(ngModel)]="form.dailyRate" name="rate" required>
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input class="form-control" [(ngModel)]="form.location" name="location" placeholder="City, District">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Skills <span class="form-hint">(comma separated)</span></label>
            <input class="form-control" [(ngModel)]="form.skills" name="skills"
              placeholder="e.g. Plowing, Harvesting, Irrigation">
          </div>
          <div class="form-group">
            <label class="form-label">Experience</label>
            <input class="form-control" [(ngModel)]="form.experience" name="exp" placeholder="e.g. 5 years">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" [(ngModel)]="form.description" name="desc" rows="2"></textarea>
          </div>
          <div class="modal-footer-row">
            <button type="button" class="btn btn-outline" (click)="showModal=false">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              <span class="spinner" *ngIf="saving"></span>
              <i class="fas fa-save" *ngIf="!saving"></i>
              {{ saving ? 'Saving...' : 'Save Profile' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══ HIRE MODAL ══ -->
    <div class="modal-overlay" *ngIf="selectedWorker" (click)="selectedWorker=null">
      <div class="modal anim-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-handshake"></i> Send Hire Request</h3>
          <button class="modal-close" (click)="selectedWorker=null"><i class="fas fa-times"></i></button>
        </div>

        <!-- Worker summary card inside modal -->
        <div class="hire-worker-card">
          <div class="hwc-avatar" [style.background]="avatarColor(selectedWorker.workerName)">
            {{ selectedWorker.workerName[0].toUpperCase() }}
          </div>
          <div class="hwc-info">
            <div class="hwc-name">{{ selectedWorker.workerName }}</div>
            <div class="hwc-title">{{ selectedWorker.title }}</div>
          </div>
          <div class="hwc-rate">₹{{ selectedWorker.dailyRate }}<span>/day</span></div>
        </div>

        <div class="two-col">
          <div class="form-group">
            <label class="form-label">Work Start Date</label>
            <input class="form-control" type="date" [(ngModel)]="hireForm.workDate" [min]="todayStr">
          </div>
          <div class="form-group">
            <label class="form-label">Number of Days</label>
            <input class="form-control" type="number" min="1" [(ngModel)]="hireForm.days">
          </div>
        </div>

        <div class="total-pill">
          <span>Total Cost</span>
          <span class="total-num">₹{{ (selectedWorker.dailyRate || 0) * (hireForm.days || 1) }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">Message <span class="form-hint">(optional)</span></label>
          <textarea class="form-control" [(ngModel)]="hireForm.message" rows="2"
            placeholder="Describe the work, location, any requirements..."></textarea>
        </div>

        <div class="modal-footer-row">
          <button class="btn btn-outline" (click)="selectedWorker=null">Cancel</button>
          <button class="btn btn-primary" (click)="hire()" [disabled]="saving">
            <span class="spinner" *ngIf="saving"></span>
            <i class="fas fa-paper-plane" *ngIf="!saving"></i>
            {{ saving ? 'Sending...' : 'Send Hire Request' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page header buttons ── */
    .ph-btns { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

    /* ── Notification button badge ── */
    .btn-notif { position:relative; }
    .notif-dot {
      position:absolute; top:-6px; right:-6px;
      background:#dc2626; color:#fff; border-radius:99px;
      padding:1px 6px; font-size:0.65rem; font-weight:800;
      min-width:18px; text-align:center;
      animation:pop 0.35s ease both;
    }
    @keyframes pop { 0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }

    /* ── Flash messages ── */
    .flash {
      display:flex; align-items:center; gap:10px;
      padding:12px 18px; border-radius:10px; margin-bottom:18px;
      font-size:0.875rem; font-weight:500;
      animation:slideDown 0.3s ease both;
    }
    .flash-success { background:#dcfce7; color:#16a34a; border:1px solid rgba(22,163,74,0.25); }
    .flash-error   { background:#fee2e2; color:#dc2626; border:1px solid rgba(220,38,38,0.25); }
    @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }

    /* ── Filter bar ── */
    .filter-bar { margin-bottom:22px; padding:16px 20px; }
    .filter-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .search-field { position:relative; flex:1; min-width:150px; }
    .sf-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6b8f70; font-size:0.8rem; pointer-events:none; }
    .sf-input { padding-left:36px !important; }
    .clear-btn { flex-shrink:0; }

    /* ── Workers Grid ── */
    .workers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(295px,1fr)); gap:20px; }

    /* ── Worker Card ── */
    .worker-card {
      background:#fff; border-radius:16px; border:1px solid rgba(30,138,44,0.12);
      padding:0; overflow:hidden; position:relative;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      display:flex; flex-direction:column;
      transition:transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
      animation:fadeUp 0.45s ease both;
    }
    .worker-card:hover {
      transform:translateY(-4px);
      box-shadow:0 10px 32px rgba(30,138,44,0.15);
      border-color:rgba(30,138,44,0.35);
    }
    /* green accent stripe that grows on hover */
    .wc-accent {
      height:4px;
      background:linear-gradient(90deg,#27a836,#3ec951,#27a836);
      background-size:200% 100%;
      transform:scaleX(0); transform-origin:left;
      transition:transform 0.3s ease;
    }
    .worker-card:hover .wc-accent { transform:scaleX(1); }

    .wc-header { display:flex; align-items:center; gap:12px; padding:16px 18px 0; }
    .wc-avatar {
      width:50px; height:50px; border-radius:50%; color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:1.2rem; flex-shrink:0;
      position:relative; box-shadow:0 3px 10px rgba(0,0,0,0.18);
      transition:transform 0.2s;
    }
    .worker-card:hover .wc-avatar { transform:scale(1.08); }
    .wc-online {
      position:absolute; bottom:1px; right:1px;
      width:11px; height:11px; border-radius:50%;
      background:#22c55e; border:2px solid #fff;
      animation:pulse 1.8s infinite;
    }
    .wc-meta { flex:1; min-width:0; }
    .wc-name { font-weight:700; color:#1a2e1c; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .wc-title { font-size:0.78rem; color:#6b8f70; margin-top:1px; }

    /* availability chip */
    .wc-avail { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:0.72rem; font-weight:700; background:#f3f4f6; color:#9ca3af; flex-shrink:0; }
    .avail-yes { background:#dcfce7; color:#16a34a; }
    .avail-ring { width:7px; height:7px; border-radius:50%; background:currentColor; flex-shrink:0; }
    .avail-yes .avail-ring { animation:pulse 1.6s infinite; }

    .wc-rate { padding:12px 18px 0; }
    .rate-num { font-size:1.5rem; font-weight:900; color:#1a5e2a; }
    .rate-per { font-size:0.8rem; color:#6b8f70; margin-left:2px; }

    /* skill tags */
    .wc-tags { display:flex; flex-wrap:wrap; gap:5px; padding:10px 18px 0; }
    .skill-tag {
      padding:3px 10px; background:#e8faea; color:#166a21;
      border-radius:99px; font-size:0.7rem; font-weight:700;
      border:1px solid rgba(22,106,33,0.18);
      transition:background 0.15s;
    }
    .worker-card:hover .skill-tag { background:#d1fae5; }

    .wc-details { display:flex; flex-direction:column; gap:5px; padding:10px 18px 0; }
    .wc-detail { display:flex; align-items:center; gap:7px; font-size:0.8rem; color:#6b8f70; }
    .wc-detail i { color:#27a836; width:14px; text-align:center; }

    .wc-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-top:auto; border-top:1px solid rgba(30,138,44,0.08); }
    .hire-btn { display:inline-flex; align-items:center; gap:7px; transition:all 0.2s; }
    .hire-btn:hover { gap:10px; }

    /* ── Hire Requests Panel ── */
    .requests-panel {
      background:#fff; border-radius:16px; border:1px solid rgba(30,138,44,0.15);
      overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06);
    }
    .rp-header {
      display:flex; align-items:center; gap:12px;
      padding:18px 24px; background:#f7fdf8;
      border-bottom:1px solid rgba(30,138,44,0.12);
    }
    .rp-title { font-size:1rem; font-weight:700; color:#1a2e1c; display:flex; align-items:center; gap:9px; }
    .rp-title i { color:#27a836; }
    .rp-badge { background:#dc2626; color:#fff; border-radius:99px; padding:3px 10px; font-size:0.72rem; font-weight:800; }

    .rp-loading { display:flex; align-items:center; gap:12px; padding:40px; justify-content:center; color:#6b8f70; }

    .hire-req-row {
      display:flex; align-items:flex-start; gap:16px; padding:18px 24px;
      border-bottom:1px solid rgba(30,138,44,0.07);
      position:relative; transition:background 0.15s;
    }
    .hire-req-row:last-child { border-bottom:none; }
    .hire-req-row:hover { background:#f7fdf8; }
    .req-unread { background:#f0fdf4; }
    .req-unread-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:#27a836; border-radius:0 2px 2px 0; }

    .req-icon-wrap {
      width:44px; height:44px; border-radius:12px;
      background:linear-gradient(135deg,#fce7f3,#fbcfe8); color:#db2777;
      display:flex; align-items:center; justify-content:center;
      font-size:1.05rem; flex-shrink:0;
    }
    .req-body { flex:1; }
    .req-title { font-weight:700; color:#1a2e1c; font-size:0.9rem; margin-bottom:4px; }
    .req-msg { font-size:0.82rem; color:#3a5a3e; line-height:1.55; margin-bottom:6px; }
    .req-time { font-size:0.74rem; color:#9ca3af; display:flex; align-items:center; gap:5px; }
    .req-actions { flex-shrink:0; }
    .req-seen { font-size:0.75rem; color:#16a34a; font-weight:700; display:flex; align-items:center; gap:5px; }

    /* ── My Listings ── */
    .my-listing-row {
      display:flex; align-items:center; gap:14px;
      padding:14px 0; border-bottom:1px solid rgba(30,138,44,0.08);
      transition:background 0.15s;
    }
    .my-listing-row:last-child { border-bottom:none; }
    .my-listing-row:hover { background:#f7fdf8; border-radius:8px; padding-left:8px; padding-right:8px; }
    .ml-avatar {
      width:40px; height:40px; border-radius:12px;
      background:linear-gradient(135deg,#27a836,#166a21); color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:1rem; flex-shrink:0;
    }
    .ml-body { flex:1; min-width:0; }
    .ml-name { font-weight:700; color:#1a2e1c; }
    .ml-sub { font-size:0.8rem; color:#6b8f70; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ml-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
    .icon-btn { width:34px; height:34px; padding:0 !important; display:flex; align-items:center; justify-content:center; }

    /* ── Hire Worker Card (inside modal) ── */
    .hire-worker-card {
      display:flex; align-items:center; gap:14px;
      background:linear-gradient(135deg,#f0fdf4,#dcfce7);
      border:1px solid rgba(30,138,44,0.2); border-radius:12px;
      padding:14px 18px; margin-bottom:20px;
    }
    .hwc-avatar {
      width:52px; height:52px; border-radius:50%; color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-weight:900; font-size:1.3rem; flex-shrink:0;
      box-shadow:0 3px 10px rgba(0,0,0,0.2);
    }
    .hwc-info { flex:1; }
    .hwc-name { font-weight:700; color:#1a2e1c; font-size:1rem; }
    .hwc-title { font-size:0.8rem; color:#3a5a3e; }
    .hwc-rate { font-size:1.3rem; font-weight:900; color:#1a5e2a; flex-shrink:0; }
    .hwc-rate span { font-size:0.8rem; font-weight:400; color:#6b8f70; }

    /* total pill */
    .total-pill {
      display:flex; justify-content:space-between; align-items:center;
      background:#e8faea; border:1px solid rgba(30,138,44,0.22);
      border-radius:10px; padding:11px 16px; margin-bottom:16px;
      font-size:0.85rem; color:#3a5a3e; font-weight:600;
    }
    .total-num { font-size:1.25rem; font-weight:900; color:#166a21; }

    /* ── Modal extras ── */
    .anim-modal { animation:scaleIn 0.22s ease both; }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .modal-footer-row { display:flex; gap:12px; justify-content:flex-end; margin-top:4px; }
    .form-hint { font-weight:400; color:#9ca3af; font-size:0.78rem; }

    /* ── Empty block ── */
    .empty-block { text-align:center; padding:52px 20px; color:#6b8f70; }
    .empty-ico {
      width:68px; height:68px; border-radius:50%;
      background:linear-gradient(135deg,#e8faea,#d1fae5);
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 16px; font-size:1.6rem; color:#27a836;
    }
    .empty-block h3 { font-size:1.05rem; color:#3a5a3e; margin-bottom:6px; }
    .empty-block p { font-size:0.85rem; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  `]
})
export class ManpowerComponent implements OnInit {
  listings: ManpowerListing[] = [];
  myListings: ManpowerListing[] = [];
  hireRequests: Notification[] = [];
  user: User | null = null;
  viewMode = 'browse';
  filterSkill = '';
  filterLocation = '';
  showModal = false;
  selectedWorker: ManpowerListing | null = null;
  saving = false;
  loading = false;
  loadingRequests = false;
  success = '';
  error = '';
  form: any = { title: '', skills: '', dailyRate: 0, location: '', experience: '', description: '' };
  hireForm: any = { workDate: '', days: 1, message: '' };
  todayStr = new Date().toISOString().split('T')[0];

  get unreadCount(): number {
    return this.hireRequests.filter(n => !n.isRead).length;
  }

  constructor(
    private manpowerService: ManpowerService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.user = this.authService.currentUser;
    this.load();
    if (this.user?.role === 'manpower') {
      this.loadMy();
      this.loadRequests();
    }
  }

  load() {
    this.loading = true;
    const loc = this.filterLocation.trim() || undefined;
    const sk  = this.filterSkill.trim()  || undefined;
    this.manpowerService.getAll(loc, sk).subscribe({
      next: l => { this.listings = l; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadMy() {
    this.manpowerService.getMyListings().subscribe(l => this.myListings = l);
  }

  loadRequests() {
    this.loadingRequests = true;
    this.orderService.getNotifications().subscribe({
      next: (notifs: any[]) => {
        this.hireRequests = notifs.filter(n => n.type === 'manpower');
        this.loadingRequests = false;
      },
      error: () => { this.loadingRequests = false; }
    });
  }

  switchView(v: string) {
    this.viewMode = v;
    if (v === 'requests') this.loadRequests();
    if (v === 'my') this.loadMy();
  }

  clearFilters() {
    this.filterSkill = '';
    this.filterLocation = '';
    this.load();
  }

  openModal() {
    this.form = { title: '', skills: '', dailyRate: 0, location: '', experience: '', description: '' };
    this.showModal = true;
  }

  openHireModal(w: ManpowerListing) {
    this.selectedWorker = w;
    this.hireForm = { workDate: this.todayStr, days: 1, message: '' };
  }

  saveProfile() {
    this.saving = true;
    this.manpowerService.create(this.form).subscribe({
      next: () => {
        this.success = 'Work profile added!';
        this.saving = false;
        this.showModal = false;
        this.loadMy();
        this.autoHide('success');
      },
      error: (e) => { this.error = e.error?.error || 'Failed to save'; this.saving = false; }
    });
  }

  hire() {
    if (!this.selectedWorker) return;
    this.saving = true;
    this.manpowerService.hire({ workerId: this.selectedWorker.workerId, ...this.hireForm }).subscribe({
      next: () => {
        this.success = 'Hire request sent! The worker has been notified.';
        this.saving = false;
        this.selectedWorker = null;
        this.autoHide('success');
      },
      error: (e) => { this.error = e.error?.error || 'Failed to send'; this.saving = false; }
    });
  }

  markRead(n: Notification) {
    this.orderService.markNotifRead(n.id).subscribe(() => { n.isRead = true; });
  }

  delete(id: number) {
    if (!confirm('Delete this listing?')) return;
    this.manpowerService.delete(id).subscribe(() => {
      this.success = 'Listing deleted.';
      this.loadMy();
      this.autoHide('success');
    });
  }

  skillList(skills: string): string[] {
    return (skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
  }

  avatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg,#27a836,#166a21)',
      'linear-gradient(135deg,#2563eb,#1e40af)',
      'linear-gradient(135deg,#d97706,#92400e)',
      'linear-gradient(135deg,#7c3aed,#5b21b6)',
      'linear-gradient(135deg,#db2777,#9d174d)',
      'linear-gradient(135deg,#0891b2,#0e7490)',
    ];
    return colors[(name || 'A').charCodeAt(0) % colors.length];
  }

  timeAgo(dt: any): string {
    if (!dt) return 'Recently';
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return 'Just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(dt).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  private autoHide(type: 'success' | 'error') {
    setTimeout(() => { this[type] = ''; }, 4000);
  }
}

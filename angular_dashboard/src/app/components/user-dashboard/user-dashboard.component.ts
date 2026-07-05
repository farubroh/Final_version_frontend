import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getStatusColor } from '../utils/get-status-color';
import { IssueViewModalUserComponent } from "../issue-view-modal-user/issue-view-modal-user.component";
import { trigger, transition, style, animate } from '@angular/animations';
import { CreateIssueComponent } from "../create-issue/create-issue.component";
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IssueViewModalUserComponent, CreateIssueComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnChanges {

  /** Status filter now driven by the homepage sidebar instead of an internal tab bar */
  @Input() filterStatus: string = 'ALL';
  @Output() filterCleared = new EventEmitter<void>();

  user: any;
  issues: any[] = [];
  selectedIssue: any = null;
  loading: boolean = true;

  private activeTab: string = 'ALL'; // internal mirror of filterStatus

  showCreateModal: boolean = false;
  allIssuesCombined: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit() {
    this.activeTab = this.filterStatus;

    this.user = this.authService.getUser();
    if (this.user) {
      this.loadIssues();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filterStatus'] && !changes['filterStatus'].firstChange) {
      this.activeTab = this.filterStatus;
      this.loadIssues();
    }
  }

  private loadIssues() {
    if (this.activeTab === 'ALL') {
      this.fetchAllIssuesForHome();
    } else {
      this.fetchIssues();
    }
  }

  clearFilter() {
    this.filterCleared.emit();
  }

  /** Grouped view for the "All" status, ordered and skipping empty groups */
  get groupedSections() {
    const order: { key: string; label: string }[] = [
      { key: 'PENDING',    label: 'Pending' },
      { key: 'INPROGRESS', label: 'In Progress' },
      { key: 'COMPLETED',  label: 'Completed' },
      { key: 'REJECTED',   label: 'Rejected' },
    ];
    return order
      .map(o => ({
        key: o.key,
        label: o.label,
        items: this.issues.filter(i => i.status?.toUpperCase() === o.key)
      }))
      .filter(g => g.items.length > 0);
  }

  private sortByCreatedAtAsc(list: any[]): any[] {
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  private sortByCreatedAtDesc(list: any[]): any[] {
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  fetchIssues() {
    const uid = this.getUserIdFromToken();
    if (!uid) return;
    this.loading = true;

    const url = `http://localhost:8085/api/issues/user/${uid}?status=${this.activeTab}`;
    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        this.issues = this.sortByCreatedAtDesc(Array.isArray(res) ? res : []);
      },
      error: (err) => {
        console.error('Error fetching issues:', err);
        this.issues = [];
      },
      complete: () => {
        setTimeout(() => { this.loading = false; }, 300);
      }
    });
  }

  fetchAllIssuesForHome() {
    const uid = this.getUserIdFromToken();
    if (!uid) return;
    this.loading = true;

    const statuses = ['PENDING', 'INPROGRESS', 'COMPLETED', 'REJECTED'];
    let combinedIssues: any[] = [];
    let completedCalls = 0;

    statuses.forEach(status => {
      const url = `http://localhost:8085/api/issues/user/${uid}?status=${status}`;
      this.http.get<any[]>(url).subscribe({
        next: (res) => {
          if (res) {
            combinedIssues = combinedIssues.concat(
              res.map(issue => ({ ...issue, status }))
            );
          }
        },
        error: (err) => {
          console.error(`Error fetching ${status} issues`, err);
        },
        complete: () => {
          completedCalls++;
          if (completedCalls === statuses.length) {
            this.issues = this.sortByCreatedAtDesc(combinedIssues);
            this.allIssuesCombined = combinedIssues;
            this.loading = false;
          }
        }
      });
    });
  }

  getFileName(filePath: string): string {
    const fileName = filePath.split('/').pop();
    return fileName ? fileName : 'Unknown file';
  }

  getStatusColor = getStatusColor;

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'success';
    if (s === 'pending')   return 'pending';
    if (s === 'rejected')  return 'rejected';
    return 'inprogress';
  }

  handleView(issue: any)  { this.selectedIssue = issue; }
  handleClose()           { this.selectedIssue = null; }

  toggleCreateModal()      { this.showCreateModal = !this.showCreateModal; }
  navigateToCreateIssue()  { this.router.navigate(['/create-issue']); }

  createIssue()       { this.showCreateModal = true; }
  closeCreateModal()  {
    this.showCreateModal = false;
    this.loadIssues(); // refresh after creating issue
  }

  deleteIssue(issue: any, event: Event) {
    event.stopPropagation();
    const token = this.authService.getToken();
    this.http.delete(`http://localhost:8085/api/issues/${issue.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.issues = this.issues.filter(i => i.id !== issue.id);
        (window as any).showSimpuiToast('Issue deleted successfully', (window as any).getFormattedDateTime());
      },
      error: (err) => {
        console.error('Error deleting issue:', err);
        (window as any).showSimpuiToast('Failed to delete issue', 'Please try again.');
      }
    });
  }

  private getUserIdFromToken(): string | null {
    try {
      const stored = this.authService.getUser();
      if (stored?.userId) return stored.userId;
      const token = stored?.token ?? stored?.accessToken ?? localStorage.getItem('accessToken');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  }
  editIssue(issue: any) {
    // TODO: wire this up once an edit form/endpoint exists.
    // For now it can reuse app-issue-form in an "edit mode" the same way createIssue() opens it.
    console.log('Edit requested for issue', issue.id);
  }
  // getAssignedLabel(issue: any): string {
  //   if (issue.status === 'PENDING') return 'Unassigned';
  //   return issue.deptShortName ? issue.deptShortName : 'ICT Department';
  // }
  getAssignedLabel(issue: any): string {
    return issue.deptShortName ? issue.deptShortName : 'ICT Department';
  }

}

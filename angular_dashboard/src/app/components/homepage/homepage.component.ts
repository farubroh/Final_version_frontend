import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ConfigurationComponent } from '../configuration/configuration.component';
import { DashboardComponent } from '../user-dashboard/user-dashboard.component';
import { CreateIssueComponent } from '../create-issue/create-issue.component';
import { OpenPoolComponent } from '../open-pool/open-pool.component';
import { MyQueueComponent } from '../my-queue/my-queue.component';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ConfigurationComponent, DashboardComponent, CreateIssueComponent, OpenPoolComponent, MyQueueComponent],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit {
  sidebarOpen = true;
  expandedMenu: 'product' | null = 'product';
  showConfiguration = false;

  activeView: 'configuration' | 'issueStatus' | 'createIssue'
    | 'openPool' | 'myQueue' | null = null;

  // Issue Queue subsection toggle
  issueQueueExpanded = false;

  // API counts
  openPoolCount = 0;
  myQueueCount = 0;

  private readonly BASE_URL = 'http://localhost:8085/api';

  showNotifications = false;
  showProfileMenu = false;
  activeDeptId: string = '';

  notifications = [
    { id: 1, text: 'Your ticket #1042 has been resolved.', time: '2 min ago', read: false },
    { id: 2, text: 'New announcement from ICT Center.', time: '1 hr ago', read: false },
    { id: 3, text: 'System maintenance scheduled tonight.', time: '3 hrs ago', read: true },
  ];

  user = {
    id: '', name: '', designation: '', email: '',
    personalEmail: '', deptLongName: '', deptShortName: '',
    programLongName: '', programShortName: '', university: 'AUST',
  };

  isStudent = false;
  isHead = false;
  isEmployee = false;
  isDeveloper = false;

  roleInfo: any[] = [];
  activeRoleIndex = 0;
  activeIssueStatus: string = 'PENDING';
  issueStatusExpanded = false;
  issueStatusCounts = { PENDING: 0, INPROGRESS: 0, COMPLETED: 0, REJECTED: 0 };

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    const name      = localStorage.getItem('name')      ?? '';
    const email     = localStorage.getItem('eduEmail')  ?? '';
    const isStudent = localStorage.getItem('isStudent') === 'true';

    this.isStudent = isStudent;

    if (isStudent) {
      this.user = {
        id:               localStorage.getItem('userId')           ?? '',
        name,
        email,
        personalEmail:    localStorage.getItem('personalEmail')    ?? '',
        deptLongName:     localStorage.getItem('deptLongName')     ?? '',
        deptShortName:    localStorage.getItem('deptShortName')    ?? '',
        programLongName:  localStorage.getItem('programLongName')  ?? '',
        programShortName: localStorage.getItem('programShortName') ?? '',
        designation:      'Student',
        university:       'AUST',
      };
      this.isHead     = false;
      this.isEmployee = false;
    } else {
      const raw = localStorage.getItem('roleInfo');
      this.roleInfo = raw ? JSON.parse(raw) : [];
      this.applyRole(0);

      const supportRole   = localStorage.getItem('supportSystemRole') ?? '';
      const supportActive = localStorage.getItem('supportSystemRoleActive') === 'true';
      this.isDeveloper = supportRole === 'DEVELOPER' && supportActive;
    }
  }

  applyRole(index: number) {
    this.activeRoleIndex = index;
    const r = this.roleInfo[index];
    if (!r) return;

    this.isHead     = r.isHead === true;
    this.isEmployee = !this.isHead;
    this.isDeveloper = r.supportSystemRole === 'DEVELOPER' && r.isActive === true;
    this.activeDeptId = r.deptId ?? '';

    this.user = {
      id:               localStorage.getItem('userId')        ?? '',
      name:             localStorage.getItem('name')          ?? '',
      email:            localStorage.getItem('eduEmail')      ?? '',
      personalEmail:    localStorage.getItem('personalEmail') ?? '',
      designation:      r.designationName,
      deptLongName:     r.deptLongName,
      deptShortName:    r.deptShortName,
      programLongName:  '',
      programShortName: '',
      university:       'AUST',
    };

    this.showProfileMenu = false;
    this.activeView = null;
    this.issueQueueExpanded = false; // collapse on role switch
    this.issueStatusExpanded = false;
    this.activeIssueStatus = 'ALL';
  }

  setView(view: 'configuration' | 'issueStatus' | 'createIssue' | 'openPool' | 'myQueue') {
    this.activeView = view;

    if (view === 'openPool' || view === 'myQueue') {
      if (!this.issueQueueExpanded) {
        this.fetchOpenPoolCount();
        this.fetchMyQueueCount();
      }
      this.issueQueueExpanded = true;
    }
  }

  /**
   * Fetch pending issues count from API
   */
  private fetchOpenPoolCount(): void {
    this.http.get<any[]>(`${this.BASE_URL}/issues/pending`).subscribe({
      next: (data) => {
        this.openPoolCount = data ? data.length : 0;
      },
      error: (err) => {
        console.error('Error fetching open pool count:', err);
        this.openPoolCount = 0;
      }
    });
  }

  /**
   * Fetch my queue (assigned issues) count from API
   */
  private fetchMyQueueCount(): void {
    const userId = localStorage.getItem('userId') ?? '';
    if (!userId) { this.myQueueCount = 0; return; }

    this.http.get<any[]>(`${this.BASE_URL}/issues/assigned/${userId}?status=INPROGRESS`).subscribe({
      next: (data) => { this.myQueueCount = data ? data.length : 0; },
      error: () => { this.myQueueCount = 0; }
    });
  }

  /**
   * Toggle the Issue Queue accordion
   * Fetch API counts when expanding
   */
  toggleIssueQueue() {
    const isSubViewActive = this.activeView === 'openPool' || this.activeView === 'myQueue';

    // If expanding, fetch fresh counts from API
    if (!this.issueQueueExpanded) {
      this.fetchOpenPoolCount();
      this.fetchMyQueueCount();
    }

    // Prevent collapse while in sub-view
    if (isSubViewActive && this.issueQueueExpanded) return;

    this.issueQueueExpanded = !this.issueQueueExpanded;
  }

  navigateToUserDashboard() { this.setIssueStatusView(this.activeIssueStatus || 'PENDING'); }
  navigateToAdminDashboard() { this.router.navigate(['/admin']); }
  navigateToConfiguration()  { this.setView('configuration'); }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleMenu(menu: 'product') {
    this.expandedMenu = this.expandedMenu === menu ? null : menu;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  get unreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  get totalIssueStatusCount(): number {
    return this.issueStatusCounts.PENDING + this.issueStatusCounts.INPROGRESS
      + this.issueStatusCounts.COMPLETED + this.issueStatusCounts.REJECTED;
  }

  toggleIssueStatusMenu() {
    const isSubViewActive = this.activeView === 'issueStatus';

    if (!this.issueStatusExpanded) {
      this.fetchIssueStatusCounts();
    }

    if (isSubViewActive && this.issueStatusExpanded) return; // keep open while in use
    this.issueStatusExpanded = !this.issueStatusExpanded;
  }

  setIssueStatusView(status: string) {
    this.activeIssueStatus = status;
    this.activeView = 'issueStatus';
    if (!this.issueStatusExpanded) {
      this.fetchIssueStatusCounts();
    }
    this.issueStatusExpanded = true;
  }

  private fetchIssueStatusCounts(): void {
    const userId = localStorage.getItem('userId') ?? '';
    if (!userId) return;

    (['PENDING', 'INPROGRESS', 'COMPLETED', 'REJECTED'] as const).forEach(status => {
      this.http.get<any[]>(`${this.BASE_URL}/issues/user/${userId}?status=${status}`).subscribe({
        next: (data) => { this.issueStatusCounts[status] = data ? data.length : 0; },
        error: () => { this.issueStatusCounts[status] = 0; }
      });
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getStatusColor } from '../utils/get-status-color';
import { IssueViewModalUserComponent } from "../issue-view-modal-user/issue-view-modal-user.component";
import { trigger, transition, style, animate } from '@angular/animations';
import { CreateIssueComponent } from "../create-issue/create-issue.component";
import { AuthenticationService } from '../../authentication.service';

type CategoryDto = { categoryId: number; categoryName: string };

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
export class DashboardComponent implements OnInit {
  user: any;
  issues: any[] = [];
  selectedIssue: any = null;
  loading: boolean = true;

  /**
   * 🔹 Initial tab is now ALL so nothing specific (like Pending) looks selected on first load.
   * We add an "ALL" tab in statusTabs.
   */
  activeTab: string = 'ALL';

  showPlusMessage = true;
  showCreateModal: boolean = false;

  totalUsers: number = 0;
  totalIssues: number = 0;

  // NEW: controls desktop filter menu open/close state
  isFilterOpen: boolean = false;
  categoryColorMap: { [key: string]: string } = {};

  statusTabs = [
    { key: 'ALL',        label: 'All' },
    { key: 'PENDING',    label: 'Pending' },
    { key: 'INPROGRESS', label: 'In Progress' },
    { key: 'COMPLETED',  label: 'Completed' },
    { key: 'REJECTED',   label: 'Rejected' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
    this.startPlusMessageLoop();
    this.loadCategories(); 
    this.user = this.authService.getUser();  // ✅ get from localStorage via service
    if (this.user) {
      // Initial load: show ALL issues combined, sorted DESC
      this.fetchAllIssuesForHome();

      // Optional: lightweight KPI refresh loop you had
      setInterval(() => {
        this.fetchNoteData();
      }, 1000);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadCategories() {
    this.http.get<CategoryDto[]>('http://localhost:8085/api/categories')
      .subscribe({
        next: (list) => {
          const categoryColors = [
            '#7321D7', '#B10F99', '#0E9591', '#2E0D3C', '#9575cd',
            '#4CAF50', '#FF9800', '#9C27B0', '#3F51B5', '#FF5722',
            '#8BC34A', '#2196F3', '#00BCD4', '#FFEB3B', '#607D8B',
            '#FFC107'
          ];

          // Precompute category colors once category list is loaded
          this.categoryColorMap = list.reduce((map: { [key: string]: string }, category, index) => {
            map[category.categoryName.toLowerCase()] = categoryColors[index % categoryColors.length];
            return map;
          }, {});
        },
        error: (err) => {
          console.error('Failed to load categories', err);
        }
      });
  }

  /** Get category color */
  getCategoryColor(category: string): string {
    const normalizedCategory = (category || '').toLowerCase();
    return this.categoryColorMap[normalizedCategory] || '#cfd8dc';  // Fallback to default color
  }

  getIssueStatusColor(status: string): string {
    const normalizedCategory = (status || '').toLowerCase();
    if(normalizedCategory === 'pending') return '#0000FF'
    if(normalizedCategory === 'inprogress') return '#FFA500'
    if(normalizedCategory === 'completed') return '#008000'
    if(normalizedCategory === 'rejected') return '#FF0000'
        
    return '#0000000f';  // Fallback to default color
  }

  // ========= Sorting helpers =========
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

  // ========= Screen / layout =========
  isMobileView: boolean = false;
  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }

  // ========= Tab click behavior =========
  onTabClick(tabKey: string) {
    this.activeTab = tabKey;

    // Sorting rule:
    // - ALL => DESC (newest first)
    // - specific status => ASC (oldest first)
    if (tabKey === 'ALL') {
      this.fetchAllIssuesForHome();   // will set DESC inside
    } else {
      this.fetchIssues();             // will set ASC inside
    }

    this.isFilterOpen = false;

    if (this.isMobileView) {
      this.showIssuesBelowSidebar(tabKey);
    }
  }

  showIssuesBelowSidebar(_tabKey: string) {
    // In current implementation, fetch methods already updated the list.
    // Kept for compatibility with your previous structure.
  }

  // ========= Fetchers =========
  fetchIssues() {
    if (!this.user?.id) return;
    this.loading = true;

    const url = `http://localhost:8085/api/issues/user/${this.user.id}?status=${this.activeTab}`;
    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        // ✅ Specific status → ascending
        this.issues = this.sortByCreatedAtAsc(Array.isArray(res) ? res : []);
        
      },
      error: (err) => {
        console.error("Error fetching issues:", err);
        this.issues = [];
      },
      complete: () => {
        setTimeout(() => { this.loading = false; }, 300);
      }
    });
  }

  /**
   * Loads all statuses (PENDING/INPROGRESS/COMPLETED/REJECTED) for the user,
   * combines them, and sorts DESC for the ALL view.
   */
  fetchAllIssuesForHome() {
    if (!this.user?.id) return;
    this.loading = true;

    const statuses = ['PENDING', 'INPROGRESS', 'COMPLETED', 'REJECTED'];
    let combinedIssues: any[] = [];
    let completedCalls = 0;

    statuses.forEach(status => {
      const url = `http://localhost:8085/api/issues/user/${this.user.id}?status=${status}`;
      this.http.get<any[]>(url).subscribe({
        next: (res) => {
          console.log("Issues: ",res);
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
            // ✅ ALL view → descending
            this.issues = this.sortByCreatedAtDesc(combinedIssues);
            this.loading = false;
          }
        }
      });
    });
  }

  // ========= Misc existing helpers =========
  getFileName(filePath: string): string {
    const fileName = filePath.split('/').pop();
    return fileName ? fileName : 'Unknown file';
  }

  isSidebarOpen = false;
  toggleSidebar() { this.isSidebarOpen = !this.isSidebarOpen; }

  // Not used for selection now, but keep for styling if needed
  toggleFilterMenu() { this.isFilterOpen = !this.isFilterOpen; }

  getStatusColor = getStatusColor;

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'success';
    if (s === 'pending') return 'pending';
    if (s === 'rejected') return 'rejected';
    return 'inprogress';
  }

  handleView(issue: any) { this.selectedIssue = issue; }
  handleClose() { this.selectedIssue = null; }

  getCategoryIcon(category: string | null | undefined): string {
    if (!category) return 'fa-solid fa-circle-question';
    const cat = category.toLowerCase();
    if (cat.includes('edu mail problem')) return 'fa-solid fa-envelope-circle-check';
    if (cat.includes('payment problem')) return 'fa-solid fa-bangladeshi-taka-sign';
    if (cat.includes('result problem')) return 'fa-solid fa-graduation-cap';
    if (cat.includes('quota problem')) return 'bi bi-shield-check text-success fs-4';
    if (cat.includes('upload')) return 'fa-solid fa-upload';
    if (cat.includes('profile')) return 'fa-solid fa-user-gear';
    if (cat.includes('result')) return 'fa-solid fa-chart-line';
    return 'fa-solid fa-circle-question';
  }

  toggleCreateModal() { this.showCreateModal = !this.showCreateModal; }
  navigateToCreateIssue(): void { this.router.navigate(['/create-issue']); }

  startPlusMessageLoop(): void {
    setInterval(() => {
      this.showPlusMessage = true;
      setTimeout(() => { this.showPlusMessage = false; }, 100000);
    }, 100000);
  }

  currentView: string = 'HOME';

  totalPendingIssuesUser: number = 0;
  totalIssuesDate: string = '';
  latestIssueDate: string = '';

  fetchPendingIssuesForUser() {
    if (!this.user?.id) return;
    const url = `http://localhost:8085/api/issues/user/${this.user.id}?status=PENDING`;
    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        this.totalPendingIssuesUser = res.length;
        if (res.length > 0) {
          const latestIssue = res[0];
          this.latestIssueDate = new Date(latestIssue.createdDate).toLocaleDateString();
        } else {
          this.latestIssueDate = 'No Pending Issues';
        }
      },
      error: (err) => {
        console.error("Error fetching pending issues for user:", err);
      }
    });
  }

  todayIssueCount: number = 0;
  userIssueRank: number = -1;
  userRankString: string = '';

  getOrdinalSuffix(n: number): string {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
  }



  allIssues: any[] = [];
  totalPendingIssuesAllUsers: number = 0;

  createIssue() { this.showCreateModal = true; }
  closeCreateModal() { this.showCreateModal = false; }

  // KPI helper you call in a timer
  fetchNoteData() {
    if (!this.user || !this.user.id || !this.allIssues.length) return;

    const pendingAll = this.allIssues.filter(
      issue => issue.status?.toUpperCase() === 'PENDING'
    );

    const userPending = pendingAll.filter(
      issue => issue.user?.id === this.user.id
    );

    this.totalPendingIssues = userPending.length;

    if (userPending.length > 0) {
      const userLatest = userPending.reduce((max, curr) => curr.id > max.id ? curr : max);
      this.latestUserPendingIssueId = userLatest.id;

      const sortedAll = pendingAll.sort((a, b) => a.id - b.id);
      const position = sortedAll.findIndex(i => i.id === userLatest.id) + 1;

      this.latestUserPendingIssueId = position;
    } else {
      this.latestUserPendingIssueId = null;
    }
  }

  totalPendingIssues: number = 0;
  latestUserPendingIssueId: number | null = null;
  currentDate: string = new Date().toDateString();


deleteIssue(issue: any, event: Event) {
  const token = this.authService.getToken(); // from localStorage
  this.http.delete(`http://localhost:8085/api/issues/${issue.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).subscribe({
    next: () => {
      this.issues = this.issues.filter(i => i.id !== issue.id);
      alert('Issue deleted successfully.');
    },
    error: (err) => {
      console.error('Error deleting issue:', err);
      alert('Failed to delete issue. Please try again.');
    }
  });
}

onComment(issue: any, event: Event){
  
}


}

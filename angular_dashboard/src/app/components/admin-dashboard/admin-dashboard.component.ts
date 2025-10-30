import {
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { getStatusColor } from '../utils/get-status-color';
import { IssueViewModalAdminComponent } from '../issue-view-modal-admin/issue-view-modal-admin.component';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { DomSanitizer } from '@angular/platform-browser';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { forkJoin } from 'rxjs';

type CategoryDto = { categoryId: number; categoryName: string };

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [
    IssueViewModalAdminComponent,
    CommonModule,
    NgCircleProgressModule,
    SafeHtmlPipe,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminDashboardComponent implements OnInit {
  // Data
  issues: any[] = [];           // current list for the active server status
  allIssuesCache: any[] = [];   // global cache across all statuses (for counts & ALL view)

  // UI state
  activeTab: string = 'ALL';     // default to ALL on load
  loading: boolean = true;
  selectedIssue: any = null;
  isDarkMode = false;
  isDesktopView = true;

  // Status counts (sidebar)
  pendingCount: number = 0;
  inProgressCount: number = 0;
  completedCount: number = 0;
  rejectedCount: number = 0;

  // Filters
  filterStatus: string = '';       // client-side status highlight
  categoryList: string[] = [];     // dynamic categories from API
  selectedCategory: string = '';
  selectedDeveloperName: string = ''; // developer filter
  searchQuery: string = '';
  searchConflictMessage: string = '';

  // Sidebar toggles
  showingAllIssues: boolean = true;
  showingCategories: boolean = true;
  showingGraph: boolean = false;
  showingDevelopers: boolean = false;

  // Developers (sidebar list)
  developerList: string[] = [];

  // State helpers
  hasLoadedCache = false; // used to avoid early "No issues found" flash on ALL

  // Unused but kept for compatibility with your template
  user = { username: 'Admin', role: 'Admin' };
  pendingPercent = 0;
  completedPercent = 0;
  rejectedPercent = 0;
  totalUsersIssued = 0;
  totalIssuesCount = 0;

  statusTabs = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'INPROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'REJECTED', label: 'Rejected' }
  ];

  // ===== User popover state =====
  userPopoverVisible = false;
  userPopoverX = 0;
  userPopoverY = 0;
  userPopoverData: any = null;

  // Category Color Mapping
  categoryColorMap: { [key: string]: string } = {};  // Explicit type definition

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initial loads
    this.fetchIssues();            // will early-return for ALL
    this.loadCategories();
    this.fetchAllIssuesCache();    // builds the ALL cache
    this.updateCountsFromCache();  // first pass (empty)

    this.filterStatus = ''; // no client-side status filter initially

    this.isDesktopView = window.innerWidth >= 768;
    window.addEventListener('resize', () => {
      this.isDesktopView = window.innerWidth >= 768;
    });

    // Periodic refresh (optional)
    setInterval(() => {
      this.fetchIssues();
      this.loadCategories();
      this.fetchAllIssuesCache();
    }, 10000);
  }

  get searchActive(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  /** Load issues by current server-side tab (activeTab) */
  fetchIssues() {
    this.loading = true;

    // If "ALL", we rely on the global cache and skip a request here.
    if (this.activeTab === 'ALL') {
      this.loading = false;
      return;
    }

    // Single-status fetch
    this.http
      .get<any[]>(`http://localhost:8085/api/issues/status/${this.activeTab}`)
      .subscribe({
        next: (res) => {
          this.issues = res || [];
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.issues = [];
          this.loading = false;
        }
      });
  }

  /** Load all statuses once into cache for global counts & ALL view */
  fetchAllIssuesCache() {
    const base = 'http://localhost:8085/api/issues/status';
    // If user is on ALL view, show loading while we refresh
    if (this.activeTab === 'ALL') this.loading = true;

    forkJoin([
      this.http.get<any[]>(`${base}/PENDING`),
      this.http.get<any[]>(`${base}/INPROGRESS`),
      this.http.get<any[]>(`${base}/COMPLETED`),
      this.http.get<any[]>(`${base}/REJECTED`)
    ]).subscribe({
      next: (lists) => {
        this.allIssuesCache = (lists || []).flat().filter(Boolean);
        this.updateCountsFromCache();
        this.rebuildDeveloperListFromCache();
        this.hasLoadedCache = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load all issues cache', err);
        this.hasLoadedCache = true;
        this.loading = false;
      }
    });
  }

  /** Compute sidebar counts from the global cache (no extra requests) */
  updateCountsFromCache() {
    const norm = (s: string) => (s || '').trim().toUpperCase();
    const list = this.allIssuesCache;
    this.pendingCount    = list.filter(i => norm(i.status) === 'PENDING').length;
    this.inProgressCount = list.filter(i => norm(i.status) === 'INPROGRESS').length;
    this.completedCount  = list.filter(i => norm(i.status) === 'COMPLETED').length;
    this.rejectedCount   = list.filter(i => norm(i.status) === 'REJECTED').length;
  }

  /** Build developer list from the cache (names with at least one issue) */
  private rebuildDeveloperListFromCache() {
    const names = new Set<string>();
    for (const i of this.allIssuesCache) {
      if (i?.developerName && String(i.developerName).trim().length > 0) {
        names.add(String(i.developerName).trim());
      }
    }
    this.developerList = Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  /** Load categories from backend (public GET in your SecurityConfig) */
  loadCategories() {
    this.http.get<CategoryDto[]>(`http://localhost:8085/api/categories`)
      .subscribe({
        next: (list) => {
          this.categoryList = (list || []).map(c => c.categoryName);
          
          // Precompute category colors once category list is loaded
          this.precomputeCategoryColors();
        },
        error: (err) => {
          console.error('Failed to load categories', err);
        }
      });
  }

  /** Precompute colors for categories */
  precomputeCategoryColors() {
    const categoryColors = [
      '#7321D7', '#B10F99', '#0E9591', '#2E0D3C', '#9575cd',
      '#4CAF50', '#FF9800', '#9C27B0', '#3F51B5', '#FF5722',
      '#8BC34A', '#2196F3', '#00BCD4', '#FFEB3B', '#607D8B',
      '#FFC107'
    ];

    // Cache the color mapping based on the category list
    this.categoryColorMap = this.categoryList.reduce((map: { [key: string]: string }, category, index) => {
      map[category.toLowerCase()] = categoryColors[index % categoryColors.length];
      return map;
    }, {} as { [key: string]: string });
  }

  /** Add new category via prompt() then POST and refresh list */
  onAddCategory(ev: MouseEvent) {
    ev.stopPropagation(); // don’t toggle the list
    const name = (prompt('Enter new category name:') || '').trim();
    if (!name) return;

    const body: CategoryDto = { categoryId: 0, categoryName: name };
    this.http.post<CategoryDto>(`http://localhost:8085/api/categories`, body)
      .subscribe({
        next: (created) => {
          if (created?.categoryName && !this.categoryList.includes(created.categoryName)) {
            this.categoryList = [...this.categoryList, created.categoryName];
            // Recompute category colors with the new category added
            this.precomputeCategoryColors();
          }
        },
        error: () => alert('Failed to create category')
      });
  }

  /** For the sidebar header row only */
  toggleCategories(_ev: MouseEvent) {
    this.showingCategories = !this.showingCategories;
  }

  /** Table source + filtering pipeline */
  get filteredIssues(): any[] {
  // Base list depends on activeTab
  const baseList = this.activeTab === 'ALL' ? this.allIssuesCache : this.issues;
  let results = [...baseList];

  // Search filter
  if (this.searchActive) {
    const q = this.searchQuery.toLowerCase();
    results = results.filter(issue =>
      (issue.title && issue.title.toLowerCase().includes(q)) ||
      (issue.category && issue.category.toLowerCase().includes(q)) ||
      (issue.status && (issue.status + '').toLowerCase().includes(q))
    );
  }

  // Category filter
  if (this.selectedCategory) {
    results = results.filter(i => i.category === this.selectedCategory);
  }

  // Developer filter
  if (this.selectedDeveloperName) {
    if (this.selectedDeveloperName === '__UNASSIGNED__') {
      results = results.filter(i => !i?.developerName || !String(i.developerName).trim());
    } else {
      const target = String(this.selectedDeveloperName).trim();
      results = results.filter(i => String(i?.developerName).trim() === target);
    }
  }

  // Optional: client-side status filter (useful only for ALL view)
  if (this.activeTab === 'ALL' && this.filterStatus) {
    results = results.filter(i => (i.status || '').toUpperCase() === this.filterStatus);
  }

  // ✅ Sort: unassigned first, then ascending by createdAt (older first)
  results.sort((a, b) => {
    const aUnassigned = !a?.developerName || !String(a.developerName).trim();
    const bUnassigned = !b?.developerName || !String(b.developerName).trim();
    if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;

    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime; // ascending (older first)
  });

  // Add reason to the results for completed/rejected issues
  results = results.map(issue => {
    if (issue.status === 'COMPLETED' || issue.status === 'REJECTED') {
      issue.reason = issue.status === 'COMPLETED' ? issue.completedReason : issue.rejectionReason;
    }
    return issue;
  });

  return results;
}

  /** Count issues per category — based on global cache for always-correct numbers */
  getCategoryCount(category: string): number {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const target = norm(category);
    return this.allIssuesCache.filter(i => norm(i.category) === target).length;
  }

  /** Sidebar: Problem Status clicks — load that status from the server */
  setFilterStatus(status: string) {
    // optional: clear search so results aren't hidden
    this.searchQuery = '';
    this.searchConflictMessage = '';

    // don’t mix with category/developer filters
    this.selectedCategory = '';
    this.selectedDeveloperName = '';

    this.filterStatus = status;   // for highlight
    this.activeTab = status;      // fetch from server for this status
    this.fetchIssues();
  }

  selectCategory(category: string) {
    if (this.searchActive) {
      this.searchQuery = '';
      this.selectedDeveloperName = '';
      
      this.filterStatus = '';
      this.searchConflictMessage = 'Clear search to view category results.';
    } else {
      this.searchConflictMessage = '';
      this.selectedCategory = category;
      this.selectedDeveloperName = '';
      this.filterStatus = '';
      // Ensure visibility across statuses by using ALL
      this.activeTab = 'ALL';
    }
  }

  getDeveloperCount(name: string): number {
    const norm = (s: string) => (s || '').trim();
    if (name === '__UNASSIGNED__') {
      return this.allIssuesCache.filter(i => !norm(i?.developerName)).length;
    }
    const target = norm(name);
    return this.allIssuesCache.filter(i => norm(i?.developerName) === target).length;
  }

  selectDeveloper(name: string) {
    this.selectedDeveloperName = name;
    this.selectedCategory = ''; // don’t mix filters
    this.searchQuery = '';
    this.searchConflictMessage = '';
    this.filterStatus = '';

    this.activeTab = 'ALL'; // ensure visibility across statuses
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchConflictMessage = '';
  }

  /** Top tabs → switch server status and fetch (if you enable tabs in HTML) */
  onTabClick(status: string) {
    this.activeTab = status;
    this.filterStatus = status === 'ALL' ? '' : status; // highlight current tab (or none on ALL)
    this.selectedCategory = '';
    this.selectedDeveloperName = '';
    this.fetchIssues();
  }

  /** Assign developer (modal action) */
  assignDeveloper(developerId: number) {
    this.http.post(`http://localhost:8085/api/issues/${this.selectedIssue.id}/assign`, {
      developerId: developerId
    })
    .subscribe({
      next: (res: any) => {
        // Server returns { developerName, currentlyTotalTaskInHand }
        this.selectedIssue.developerName = res?.developerName || this.selectedIssue?.developerName;
        this.cdr.detectChanges();

        // Refresh current list and global cache so counts/rows are correct
        this.refreshIssueList();
        this.fetchAllIssuesCache();

        this.selectedIssue = null;
      },
      error: () => alert('Failed to assign developer')
    });
  }

  refreshIssueList() {
    this.fetchIssues();
  }

  // ===== Row-click to open issue details =====
  openIssue(issue: any) {
    this.selectedIssue = issue;
  }

  // ===== User popover controls =====
  showUserDetails(ev: MouseEvent, user: any) {
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Place the popover just below the clicked element (with small gap)
    this.userPopoverX = rect.left + window.scrollX;
    this.userPopoverY = rect.bottom + window.scrollY + 6;
    this.userPopoverData = user;
    this.userPopoverVisible = true;
  }

  closeUserDetails() {
    this.userPopoverVisible = false;
    this.userPopoverData = null;
  }

  @HostListener('document:click')
  handleDocClick() {
    if (this.userPopoverVisible) this.closeUserDetails();
  }

  getStatusColor = getStatusColor;

  getCategoryColor(category: string): string {
    const normalizedCategory = (category || '').toLowerCase();
    
    // Retrieve color from the precomputed mapping
    return this.categoryColorMap[normalizedCategory] || '#cfd8dc';  // Fallback to default color
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
  }

  // Sidebar toggles
  showCategories() { this.showingCategories = !this.showingCategories; }
  showAllIssues() { this.showingAllIssues = !this.showingAllIssues; }
  showGraph() { this.showingGraph = !this.showingGraph; }
  showDevelopers() {
    this.showingDevelopers = !this.showingDevelopers;
    if (this.showingDevelopers && !this.hasLoadedCache) {
      this.fetchAllIssuesCache();
    }
  }
}
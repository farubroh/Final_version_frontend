import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';

type StatusKey = 'PENDING' | 'INPROGRESS' | 'COMPLETED' | 'REJECTED';

interface IssueDto {
  issueId: number;
  title: string;
  description?: string;
  status: StatusKey;
  serialId?: string;
  createdAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  completedReason?: string;
  rejectionReason?: string;
   category?: string; 
}

interface UserDto {
  id?: number;
  username: string;
  role?: string;
  department?: string;
  designation?: string;
}

interface DeveloperSpecificIssueDto {
  createdBy: UserDto;
  issue: IssueDto;
}

interface IssuesOfDeveloperDto {
  PENDING: DeveloperSpecificIssueDto[];
  INPROGRESS: DeveloperSpecificIssueDto[];
  COMPLETED: DeveloperSpecificIssueDto[];
  REJECTED: DeveloperSpecificIssueDto[];
}

interface Card {
  id: number;
  title: string;
  subtitle?: string | null;
  meta?: { views?: number; comments?: number; attachments?: number };
  description?: string;
  done?: boolean;
  status: StatusKey;
  createdBy?: UserDto; // reporter
  raw?: DeveloperSpecificIssueDto;
}

interface List {
  title: string;
  key: StatusKey;
  cards: Card[];
}
interface CategoryDto {
  categoryId: number; // ID of the category
  categoryName: string; // Name of the category
}


@Component({
  selector: 'app-developer-dashboard',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './developer-dashboard.component.html',
  styleUrls: ['./developer-dashboard.component.css']
})
export class DeveloperDashboardComponent implements OnInit {
  constructor(private http: HttpClient, private auth: AuthenticationService) {}

     categoryColorMap: { [key: string]: string } = {};
  categoryList: string[] = [];
  
  // search + details pane
  query = signal<string>('');
  selected = signal<Card | null>(null);
  description = signal<string>('');

  // extra details for selected card
  loadingDetails = false;
  selectedFiles: string[] = [];
  selectedIssuerUserId: number | null = null; // needed to build file URLs
  completeReason = '';
  rejectReason = '';

  // lists
  lists = signal<List[]>([]);



  issues: any[] = [];
  selectedIssue: any = null;
  newComment: string = '';
  comments: { author: string; message: string; time: string }[] = [];


  // derive filtered view
  private readonly filtered = computed<List[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.lists();
    return this.lists().map(list => ({
      ...list,
      cards: list.cards.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.subtitle ?? '').toLowerCase().includes(q)
      )
    }));
  });

  ngOnInit() {
  const userId = this.getUserId();
  if (!userId) {
    console.error('[DeveloperBoard] No userId found in auth payload.');
    return;
  }
  this.fetchIssues();
  // load categories first
  this.loadCategories();

  // then load issues for this developer
  this.http.get<IssuesOfDeveloperDto>(`http://localhost:8085/api/developers/${userId}/issues`)
    .subscribe({
      next: (dto) => this.inflate(dto),
      
      error: (e) => console.error('Failed to load developer issues', e)
    });

  // Set an interval to auto-refresh pending issues every 10 seconds (or as needed)
  setInterval(() => {
    this.http.get<IssuesOfDeveloperDto>(`http://localhost:8085/api/developers/${userId}/issues`)
      .subscribe({
        next: (dto) => this.inflate(dto),
        error: (e) => console.error('Failed to load developer issues', e)
      });
  }, 100000); // Refresh every 10 seconds
}
fetchIssues() {
  const userId = this.getUserId();
  if (!userId) return;
  this.http.get<any[]>(`http://localhost:8085/api/developers/${userId}/issues`)
    .subscribe(issues => { this.issues = issues; });
}

 // Load comments for selected card
// -------------------------
// Comments (Load + Add)
// -------------------------

// Load comments for selected issue
fetchComments(issueId: number) {
  this.http.get<{ id: number; comment: string; createdByDto: any; developerDto: any; createdAt: string }[]>(
    `http://localhost:8085/api/comments/issue/${issueId}`
  ).subscribe({
    next: (res) => {
      console.log('Comments loaded:', res); // Inspect the response data
      this.comments = res.map((comment) => {
        const date = new Date(comment.createdAt);
        return {
          author: comment.createdByDto?.username ?? 'Unknown',
          message: comment.comment,
          time: date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        };
      });
    },
    error: (err) => console.error('[comments/load] failed:', err),
  });
}

// Post a new comment
submitComment() {
  const content = this.newComment.trim();
  if (!content) return;

  const card = this.selected();
  if (!card?.raw?.issue) return;

  const currentUser = this.auth.getUser();
  const issueId = card.raw.issue.issueId;
  const userId = currentUser?.id;

  // developerId = current logged in developer
  const developerId = this.getUserId();

  // Use HttpParams like in issue-view-modal-user
  const params = new URLSearchParams();
  params.set('issueId', issueId.toString());
  params.set('userId', userId?.toString() ?? '');
  params.set('developerId', developerId ? developerId.toString() : '');
  params.set('comment', content);

  this.http.post<any>(
    'http://localhost:8085/api/comments/add',
    params.toString(), // send as form-encoded
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  ).subscribe({
    next: (res) => {
      const date = new Date();
      this.comments.unshift({
        author: res?.userDto?.username ?? currentUser?.username ?? 'You',
        message: res?.content ?? content,
        time: date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).toLowerCase(),
      });
      this.newComment = '';
    },
    error: (err) => console.error('[comments/add] failed:', err),
  });
}



  loadCategories() {
  this.http.get<CategoryDto[]>(`http://localhost:8085/api/categories`)
    .subscribe({
      next: (list) => {
        this.categoryList = (list || []).map(c => c.categoryName);
        this.precomputeCategoryColors();
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
}

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

getCategoryColor(category: string): string {
  const normalizedCategory = (category || '').toLowerCase();
  // Retrieve color from the precomputed mapping
  return this.categoryColorMap[normalizedCategory] || '#cfd8dc';  // Fallback to default color
}



  /** Supports several login payload shapes */
  private getUserId(): number | null {
    const u: any = this.auth.getUser();
    if (!u) return null;
    return u.id ?? u?.user?.id ?? u?.usrId ?? null;
  }

  /** Builds board lists from backend dto. */
  private inflate(dto: IssuesOfDeveloperDto) {
  const mapCards = (arr: DeveloperSpecificIssueDto[], key: StatusKey): Card[] =>
    (arr || []).map(d => ({
      id: d.issue.issueId,
      title: d.issue.title,
      subtitle: d.createdBy?.username ?? null,
      meta: { views: 0, comments: 0, attachments: 0 },
      description: d.issue.description ?? '',
      done: key === 'COMPLETED',
      status: key,
      createdBy: d.createdBy,
      raw: d
    }));

  this.lists.set([
    { title: 'Pending',     key: 'PENDING',    cards: mapCards(dto.PENDING, 'PENDING') },
    { title: 'In Progress', key: 'INPROGRESS', cards: mapCards(dto.INPROGRESS, 'INPROGRESS') },
    { title: 'Completed',   key: 'COMPLETED',  cards: mapCards(dto.COMPLETED, 'COMPLETED') },
    { title: 'Rejected',    key: 'REJECTED',   cards: mapCards(dto.REJECTED, 'REJECTED') }
  ]);
}


  trackById = (_: number, item: Card) => item.id;

  connectedTo(i: number): string[] {
    const ids = this.lists().map((_, idx) => `list-${idx}`);
    ids.splice(i, 1);
    return ids;
  }

  /** Drag & drop across lists:
   *  - No prompts, no alerts.
   *  - Reasons are optional; dev can fill in from the drawer later.
   */
drop(e: CdkDragDrop<Card[]>) {
  if (e.previousContainer === e.container) {
    moveItemInArray(e.container.data, e.previousIndex, e.currentIndex);
    return;
  }

  const fromIdx = this.indexFromListId(e.previousContainer.id);
  const toIdx = this.indexFromListId(e.container.id);
  if (fromIdx === -1 || toIdx === -1) return;

  const fromKey = this.lists()[fromIdx].key;
  const toKey = this.lists()[toIdx].key;

  // Prevent moving a card out of "REJECTED" status
  if (fromKey === 'REJECTED' && toKey !== 'REJECTED') {
    return; // Do nothing if trying to move from REJECTED to another status
  }

  // optimistic UI
  transferArrayItem(e.previousContainer.data, e.container.data, e.previousIndex, e.currentIndex);

  const moved = e.container.data[e.currentIndex];
  const prevStatus = moved.status;
  moved.status = toKey;

  if (toKey === 'REJECTED') {
    this.openCard(moved); // Show details for rejection reason
  }

  // send update with no forced reasons
  const payload = {
    workedBy: this.getUserId(),
    fromStatus: fromKey,
    toStatus: toKey,
    rejectionReason: null,
    completedAnalysis: null
  };

  this.http.post(`http://localhost:8085/api/issues/${moved.id}/status`, payload).subscribe({
    next: () => {},
    error: () => {
      // revert on failure
      transferArrayItem(e.container.data, e.previousContainer.data, e.currentIndex, e.previousIndex);
      moved.status = prevStatus;
      console.warn('Failed to update status.');
    }
  });
}

  private indexFromListId(id: string): number {
    const idx = Number((id || '').split('-')[1]);
    return Number.isFinite(idx) ? idx : -1;
  }

  filteredLists(): List[] {
    return this.filtered();
  }

  // -------------------------
  // Details Drawer
  // -------------------------
openCard(card: Card) {
  this.selected.set(card);
  this.description.set(card.description ?? '');
  this.completeReason = card.raw?.issue.completedReason || '';
  this.rejectReason = card.raw?.issue.rejectionReason || '';
  this.selectedFiles = [];
  this.selectedIssuerUserId = null;

  // Load attachments
  this.loadingDetails = true;
  this.http.get<any[]>(`http://localhost:8085/api/issues/status/${card.status}`).subscribe({
    next: (rows) => {
      const row = (rows || []).find((r: any) => r.id === card.id);
      if (row) {
        this.selectedFiles = row.files || [];
        this.selectedIssuerUserId = row.user?.id ?? null;
      }
      this.loadingDetails = false;
    },
    error: () => { this.loadingDetails = false; }
  });

  // 🔥 Load comments for this issue
  this.fetchComments(card.id);
}


 
  
  /** Mark (or re-save) as Completed with optional reason. */
  completeFromDetails() {
    const s = this.selected();
    if (!s) return;

    const payload = {
      workedBy: this.getUserId(),
      fromStatus: s.status,
      toStatus: 'COMPLETED' as StatusKey,
      rejectionReason: null,
      completedAnalysis: (this.completeReason || '').trim() || null
    };

    if (s.status !== 'COMPLETED') this.moveCard(s, s.status, 'COMPLETED');

    this.http.post(`http://localhost:8085/api/issues/${s.id}/status`, payload).subscribe({
      next: () => { this.closeDetails(); },
      error: () => {
        if (s.status !== 'COMPLETED') this.moveCard(s, 'COMPLETED', s.status);
        console.warn('Failed to complete/update reason.');
      }
    });
  }

  /** Mark (or re-save) as Rejected with optional reason. */
  rejectFromDetails() {
    const s = this.selected();
    if (!s) return;

    const payload = {
      workedBy: this.getUserId(),
      fromStatus: s.status,
      toStatus: 'REJECTED' as StatusKey,
      rejectionReason: (this.rejectReason || '').trim() || null,
      completedAnalysis: null
    };

    if (s.status !== 'REJECTED') this.moveCard(s, s.status, 'REJECTED');

    this.http.post(`http://localhost:8085/api/issues/${s.id}/status`, payload).subscribe({
      next: () => { this.closeDetails(); },
      error: () => {
        if (s.status !== 'REJECTED') this.moveCard(s, 'REJECTED', s.status);
        console.warn('Failed to reject/update reason.');
      }
    });
  }

  /** Utility to move a card between lists in local state. */
  private moveCard(card: Card, from: StatusKey, to: StatusKey) {
    const lists = this.lists();

    const fromList = lists.find(l => l.key === from);
    const toList   = lists.find(l => l.key === to);
    if (!fromList || !toList) return;

    fromList.cards = fromList.cards.filter(c => c.id !== card.id);
    const clone: Card = { ...card, status: to, done: to === 'COMPLETED' };
    toList.cards = [clone, ...toList.cards];

    this.lists.set(lists.map(l => {
      if (l.key === from) return { ...l, cards: fromList.cards };
      if (l.key === to)   return { ...l, cards: toList.cards };
      return l;
    }));
  }

  // UI helpers
  markDone(card: Card) {
    // visual only (real status change should be via drag or drawer buttons)
    card.done = !card.done;
  }

  deleteCard(list: List, card: Card) {
    list.cards = list.cards.filter(c => c.id !== card.id);
    this.lists.set(this.lists().map(l => (l.key === list.key ? list : l)));
  }

  addCard(list: List) {
    const id = Date.now();
    list.cards.unshift({
      id,
      title: 'New task',
      subtitle: null,
      meta: { views: 0, comments: 0, attachments: 0 },
      description: '',
      done: false,
      status: list.key
    });
    this.lists.set(this.lists().map(l => (l.key === list.key ? list : l)));
  }

  addList() {
    const idx = this.lists().length + 1;
    this.lists.update(arr => arr.concat([{
      title: `Custom ${idx}`,
      key: 'PENDING',
      cards: []
    }]));
  }

  updateSubtitle(card: Card, value: string) {
    card.subtitle = value;
  }

  userInfoVisible = false;
userInfo: UserDto | null = null;
showUserInfo(user: UserDto | null) {
  this.userInfo = user;
  this.userInfoVisible = true;
}

hideUserInfo() {
  this.userInfoVisible = false;
  this.userInfo = null;
}


openIssue(issue: any) {
    this.selectedIssue = issue;
    this.fetchComments(issue.id);
  }

  closeDetails() {
  this.selected.set(null);   // deselect issue -> modal closes
}
  // close modal after success

}
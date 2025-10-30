import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';

type UiDeveloper = { id: number; username: string };
type Issue = {
  id: number;
  title: string;
  description: string;
  status: 'PENDING'|'INPROGRESS'|'COMPLETED'|'REJECTED';
  user: { id: number; username?: string };
  category?: string;
  developerId?: number;
  developerName?: string;
  files?: string[];
  deadline?: string;
  completedReason?: string;
  rejectionReason?: string; 
};

@Component({
  selector: 'app-issue-view-modal-admin',
  standalone: true,
  imports: [CommonModule, FormsModule], // ❌ removed HttpClientModule
  templateUrl: './issue-view-modal-admin.component.html',
  styleUrls: ['./issue-view-modal-admin.component.css']
})
export class IssueViewModalAdminComponent implements OnInit {
  @Input() issue!: Issue;
  @Output() close = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  

  apiBase = 'http://localhost:8085';

  developers: UiDeveloper[] = [];
  selectedDeveloper: UiDeveloper | null = null;

  categoryList: string[] = [];
  newCategory = '';

  showAssignBox = false;
  showCategoryBox = false;
  showCommentSidebar = false;

  newComment = '';
  comments: { author: string; message: string }[] = [
    { author: 'Md. Younus Hossain Ahsan', message: 'Please check the mail address recovery issue with registrar.' },
    { author: 'Omar Faruk', message: 'Added this card to PENDING.' }
  ];

  searchQuery = '';

  constructor(private http: HttpClient, private auth: AuthenticationService) {}

 
  ngOnInit() { 
    console.log('Issue Data:', this.issue); 
     console.log('Rejected Reason:', this.issue?.rejectionReason);
    this.getCategories(); 
    this.getDevelopers();
    console.log('Issue data:', this.issue);
    if (this.issue.status === 'REJECTED') {
    console.log('Rejection Reason:', this.issue.rejectionReason);
  }
  }
  
  private getDevelopers() {
    this.http.get<any[]>(`${this.apiBase}/api/developers`).subscribe({
      next: (res: any[]) => {
        this.developers = (res || []).map((d: any) => ({
          id: d?.id,
          username: d?.user?.username ?? d?.username ?? `Developer #${d?.id}`
        }));
      },
      error: (err) => {
        console.error(err);
        alert('Failed to load developers (are you logged in as ADMIN/DEVELOPER?)');
        console.error('Error fetching issue data', err)
      }
    });
    
  

  }

  private getCategories() {
    this.http.get<any[]>(`${this.apiBase}/api/categories`).subscribe({
      next: (res: any[]) => {
        this.categoryList = (res || []).map(c => c?.categoryName).filter(Boolean);
      },
      error: () => alert('Failed to load categories')
    });
  }

  toggleAssignBox() {
    this.showAssignBox = !this.showAssignBox;
    this.selectedDeveloper = null;
    this.searchQuery = '';
    if (this.showAssignBox) this.getDevelopers();
  }

  toggleCategoryBox() {
    this.showCategoryBox = !this.showCategoryBox;
    if (this.showCategoryBox) this.getCategories();
  }

  toggleCommentSidebar() { this.showCommentSidebar = !this.showCommentSidebar; }
  toggleAllOff() { this.showAssignBox = this.showCategoryBox = this.showCommentSidebar = false; }

  selectDeveloper(dev: UiDeveloper) { this.selectedDeveloper = dev; }

  filteredDevelopers(): UiDeveloper[] {
    const q = (this.searchQuery || '').toLowerCase().trim();
    const assignedId = this.issue?.developerId;
    const assignedName = (this.issue?.developerName || '').toLowerCase();

    return this.developers.filter(dev => {
      const name = (dev.username || '').toLowerCase();
      const matches = !q || name.includes(q);
      const notAssigned = (assignedId ? dev.id !== assignedId : true) &&
                          (assignedName ? name !== assignedName : true);
      return matches && notAssigned;
    });
  }

  submitAssignment() {
    if (!this.selectedDeveloper) return;
    const payload = { developerId: this.selectedDeveloper.id };

    this.http.post(`${this.apiBase}/api/issues/${this.issue.id}/assign`, payload)
      .subscribe({
        next: (res: any) => {
          this.issue.status = 'INPROGRESS';
          this.issue.developerId = this.selectedDeveloper!.id;
          this.issue.developerName = res?.developerName ?? this.selectedDeveloper!.username;
          this.selectedDeveloper = null;
          this.showAssignBox = false;
          this.refresh.emit();
          this.close.emit();
        },
        error: (e) => {
          console.error(e);
          alert('Failed to assign developer (admin/dev token required).');
        }
      });
  }

  getDeveloperName(devId?: number): string {
    if (!devId) return '';
    const dev = this.developers.find(d => d.id === devId);
    return dev ? dev.username : '';
  }

  setCategoryForIssue(categoryName: string) {
    const name = (categoryName || '').trim();
    if (!name) return;

    const prev = this.issue.category;
    this.issue.category = name;

    this.http.put(
      `${this.apiBase}/api/issues/${this.issue.id}/category/by-name`,
      { categoryName: name }
    ).subscribe({
      next: (updated: any) => {
        const fromServer = updated?.categoryDtoList?.[0]?.categoryName;
        this.issue.category = fromServer ?? name;
        this.showCategoryBox = false;
        this.refresh.emit();
      },
      error: (e) => {
        console.error(e);
        this.issue.category = prev;
        alert('Failed to update category (check login/token).');
      }
    });
  }

  addCategory() {
    const name = this.newCategory.trim();
    if (!name) return;

    this.http.post(`${this.apiBase}/api/categories`, { categoryName: name })
      .subscribe({
        next: (res: any) => {
          const savedName = res?.categoryName?.trim() || name;
          if (!this.categoryList.includes(savedName)) this.categoryList.push(savedName);
          this.newCategory = '';
          this.setCategoryForIssue(savedName);
        },
        error: (e) => {
          console.error(e);
          alert('Failed to add category (requires admin token).');
        }
      });
  }

  markComplete() {
    const user = this.auth.getUser();
    const workedBy = user?.id ?? user?.user?.id;

    const payload = {
      workedBy,
      fromStatus: this.issue.status,
      toStatus: 'COMPLETED',
      rejectionReason: null,
      completedAnalysis: 'Marked manually by admin'
    };

    this.http.post(`${this.apiBase}/api/issues/${this.issue.id}/status`, payload)
      .subscribe({
        next: (serverIssue: any) => {
          this.issue.status = serverIssue?.status ?? 'COMPLETED';
          this.issue.completedReason = serverIssue?.completedReason ?? this.issue.completedReason;
          this.refresh.emit();
          this.close.emit();
        },
        error: (e) => {
          console.error(e);
          alert('Failed to mark as completed (check token/role).');
        }
      });
      
  }

  submitComment() {
    const msg = (this.newComment || '').trim();
    if (!msg) return;
    this.comments.unshift({ author: 'Admin', message: msg });
    this.newComment = '';
  }

  onCloseModal() { this.close.emit(); }
  // Add this in your component where the issue's rejection reason is accessed
get rejectedReason() {
  if (this.issue?.status === 'REJECTED') {
    console.log('Rejection reason:', this.issue?.rejectionReason);
    return this.issue?.rejectionReason || 'No reason provided';
  }
  return null;
}


}
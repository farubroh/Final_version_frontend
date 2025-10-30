// create-issue.component.ts (your file is named create-issue.ts in the message — using Angular’s standard name here)
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-issue-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-issue.component.html',
  styleUrls: ['./create-issue.component.css']
})
export class CreateIssueComponent implements OnInit {
  @Output() issueCreated = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onCancel() {
    this.cancel.emit();
  }

  user: any;
  days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  form = { title: '', description: '', category: '' };

  // Use strongly typed Category from backend shape
  categories: { categoryId: number; categoryName: string }[] = [];

  files: File[] = [];
  filePreviews: any[] = [];
  uploadProgress = 0;
  isUploading = false;
  uploadSummary = '';

  constructor(
    private http: HttpClient,
    public router: Router,
    private authService: AuthenticationService
  ) {
    this.user = this.authService.getUser();
    if (!this.user) {
      console.error('No logged-in user found');
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
  this.http
  .get<{ categoryId: number; categoryName: string }[]>(
    'http://localhost:8085/api/categories'
  )
  .subscribe({
    next: (data) => {
      console.log('Fetched categories:', data);
      this.categories = data;
    },
    error: (err) => {
      console.error('Failed to load categories', err);
      alert('❌ Failed to load categories');
    }
  });

}


  onFileSelected(event: any) {
    const maxFileCount = 5;
    const maxFileSize = 5 * 1024 * 1024;
    const newFiles: FileList = event.target.files;
    if (!newFiles || newFiles.length === 0) return;

    const total = this.files.length + newFiles.length;
    if (total > maxFileCount) {
      alert(`❌ Max ${maxFileCount} files allowed.`);
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadSummary = '';

    let completed = 0;
    const newTotal = newFiles.length;

    Array.from(newFiles).forEach((file) => {
      if (file.size > maxFileSize) {
        alert(`❌ ${file.name} exceeds 5MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreviews.push({ name: file.name, type: file.type, url: e.target.result });
        completed++;
        this.uploadProgress = Math.round((completed / newTotal) * 100);
        if (completed === newTotal) {
          this.isUploading = false;
          this.uploadSummary = `${this.filePreviews.length} file(s) selected.`;
        }
      };
      reader.readAsDataURL(file);
      this.files.push(file);
    });

    event.target.value = null;
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.filePreviews.splice(index, 1);
    this.uploadSummary = this.filePreviews.length > 0 ? `${this.filePreviews.length} file(s) selected.` : '';
  }


handleSubmit() {
  const formData = new FormData();
  formData.append('title', this.form.title);
  formData.append('description', this.form.description);
  formData.append('userId', this.user.id.toString());

  // send as IDs; backend expects @RequestParam List<Long> categoryIds
  if (this.form.category) {
    formData.append('categoryIds', String(this.form.category));
  }

  this.files.forEach((file) => formData.append('files', file));

  this.http.post('http://localhost:8085/api/issues/with-files', formData, {
    reportProgress: true,
    observe: 'events'
  })
  .subscribe({
    next: (event: any) => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.uploadProgress = Math.round((event.loaded / event.total) * 100);
      } else if (event.type === HttpEventType.Response) {
        // event.body is IssueWithFilesResponse { issue, files }
        this.issueCreated.emit();
        alert('✅ Ticket submitted successfully!');
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err) => {
      alert('❌ Submission failed. Check logs.');
      console.error(err);
    }
  });
}


  showSupportDetails = false;
  toggleSupportDetails() {
    this.showSupportDetails = !this.showSupportDetails;
  }

  adjustTextareaHeight(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}

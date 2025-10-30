import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-developer-issue-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './developer-issue-modal.component.html',
  styleUrls: ['./developer-issue-modal.component.css']
})
export class DeveloperIssueModalComponent implements OnInit {
  @Input() issue: any;
  @Input() currentDeveloperId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  developers: any[] = [];
  selectedDeveloperId: number | null = null;

  completionReason: string = '';
  rejectionReason: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchDevelopers();
  }

  fetchDevelopers() {
    this.http.get<any[]>('http://localhost:8085/api/developers').subscribe({
      next: (res: any[]) => {
        this.developers = res;
      },
      error: () => alert('Failed to load developers')
    });
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  reassign() {
    if (!this.selectedDeveloperId || this.selectedDeveloperId === this.currentDeveloperId) {
      alert('Please select a valid developer (not yourself)');
      return;
    }

    const issueId = this.issue.issueId ?? this.issue.id;
    const payload = { developerId: this.selectedDeveloperId };

    this.http.post(`http://localhost:8085/api/issues/${issueId}/assign`, payload).subscribe({
      next: () => {
        alert('Reassigned successfully');
        this.refresh.emit();
        this.close.emit();
      },
      error: () => alert('Reassignment failed')
    });
  }

  markCompleted() {
    if (!this.completionReason.trim()) {
      alert('Please provide a resolution note.');
      return;
    }

    const issueId = this.issue.issueId ?? this.issue.id;
    const payload = {
      toStatus: 'COMPLETED',
      workedBy: this.currentDeveloperId,
      completedAnalysis: this.completionReason,
      fromStatus: this.issue.status
    };

    this.http.put(`http://localhost:8085/api/issues/${issueId}/status`, payload).subscribe({
      next: () => {
        alert('Marked as Completed');
        this.refresh.emit();
        this.close.emit();
      },
      error: () => alert('Failed to mark as completed')
    });
  }

  reject() {
    if (!this.rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    const issueId = this.issue.issueId ?? this.issue.id;
    const payload = {
      toStatus: 'REJECTED',
      workedBy: this.currentDeveloperId,
      rejectionReason: this.rejectionReason,
      fromStatus: this.issue.status
    };

    this.http.put(`http://localhost:8085/api/issues/${issueId}/status`, payload).subscribe({
      next: () => {
        alert('Issue Rejected');
        this.refresh.emit();
        this.close.emit();
      },
      error: () => alert('Failed to reject issue')
    });
  }
}

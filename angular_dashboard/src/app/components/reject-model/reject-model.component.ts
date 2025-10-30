import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reject-modal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './reject-model.component.html',
  styleUrls: ['./reject-model.component.css']
})
export class RejectModalComponent {
  @Input() issue: any;
  @Input() user: any;
  @Output() close = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  reason = '';

  constructor(private http: HttpClient) {}

  rejectIssue() {
    if (!this.reason.trim()) return alert('Please enter a reason.');
    const payload = {
      rejectedByRole: this.user.role,
      rejectedById: this.user.id,
      rejectionReason: this.reason
    };
    this.http.post(`http://localhost:8085/api/issues/${this.issue.id}/reject`, payload)
      .subscribe({
        next: () => this.rejected.emit(),
        error: err => alert('Failed to reject issue')
      });
  }
}
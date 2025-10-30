import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AssignModalComponent } from "../assign-model/assign-model.component";
import { RejectModalComponent } from "../reject-model/reject-model.component";

@Component({
  selector: 'app-issue-table',
  standalone: true,
  imports: [CommonModule, HttpClientModule, AssignModalComponent, RejectModalComponent],
  templateUrl: './issue-table.component.html',
  styleUrls: ['./issue-table.component.css']
})
export class IssueTableComponent {
  @Input() issues: any[] = [];
  @Input() status: string = 'PENDING';
  @Input() refresh: () => void = () => {};

  selectedIssue: any = null;
  selectedRejectIssue: any = null;
  user = JSON.parse(sessionStorage.getItem('helpdeskUser') || '{"id":1,"role":"Admin"}');

  openAssignModal(issue: any) {
    this.selectedIssue = issue;
  }

  closeAssignModal() {
    this.selectedIssue = null;
  }

  openRejectModal(issue: any) {
    this.selectedRejectIssue = issue;
  }

  closeRejectModal() {
    this.selectedRejectIssue = null;
  }
}
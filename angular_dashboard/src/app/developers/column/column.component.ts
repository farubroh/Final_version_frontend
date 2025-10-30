import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { IssueCardComponent } from '../issue-card/issue-card.component';
import { CreateIssueComponent } from "../../components/create-issue/create-issue.component";
import { IssueViewModalUserComponent } from "../../components/issue-view-modal-user/issue-view-modal-user.component";

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, IssueCardComponent, CreateIssueComponent, IssueViewModalUserComponent],
  templateUrl: './column.component.html',
  styleUrls: ['./column.component.css']
})
export class ColumnComponent {
  @Input() status!: string;
  @Input() issues: any[] = [];
  @Input() connectedTo: string[] = [];
  @Output() issueDropped = new EventEmitter<{ event: CdkDragDrop<any[]>, targetStatus: string }>();
  @Output() issueClicked = new EventEmitter<any>();
  @Output() addCard = new EventEmitter<string>();

  showCreateModal = false;
  selectedIssue: any;

  statusTitle: Record<string, string> = {
    PENDING: 'Pending',
    INPROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected'
  };



 onDropWrapper(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // reorder inside the same column
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // move between columns
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  onIssueClick(issue: any) {
    this.issueClicked.emit(issue);
  }

  trackById(index: number, issue: any) {
    return issue.issueId; // Use unique identifier
  }
  openCreateModal() {
  this.showCreateModal = true;
  this.addCard.emit(this.status); // optional, emit if parent needs to know
}


  closeCreateModal() {
    this.showCreateModal = false;
  }

  handleClose() {
    this.selectedIssue = null;
  }
}

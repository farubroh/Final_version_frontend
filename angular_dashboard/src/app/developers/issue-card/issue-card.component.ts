import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';


@Component({
  selector: 'app-issue-card',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './issue-card.component.html',
  styleUrls: ['./issue-card.component.css']
})
export class IssueCardComponent {
  @Input() issue: any;

  ngOnInit() {
    console.log('🧪 Issue status:', this.issue?.status);
  }

  getCategoryClass(category: string): string {
    switch ((category || '').toLowerCase()) {
      case 'bug': return 'category-bug';
      case 'feature': return 'category-feature';
      case 'task': return 'category-task';
      default: return 'category-default';
    }
  }

  getCategoryColor(category: string): string {
    switch ((category || '').toLowerCase()) {
      case 'edu mail problem':
        return '#f48fb1';
      case 'payment problem':
        return '#ffb74d';
      case 'quota problem':
        return '#81c784';
      case 'result problem':
        return '#64b5f6';
      case 'login issue':
        return '#9575cd';
      default:
        return '#cfd8dc';
    }
  }
}

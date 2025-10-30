import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assign-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assign-model.component.html',
  styleUrls: ['./assign-model.component.css']
})
export class AssignModalComponent {
  @Input() issue: any;
  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();

  developers: any[] = [];
  assigning = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchDevelopers();  // ✅ Ensure latest data on every open
  }


  fetchDevelopers() {
    this.http.get<any[]>('http://localhost:8085/api/developers')
      .subscribe({
        next: (res) => this.developers = res
      });
  }

  assign(developerId: number | null = null) {
    this.assigning = true;
    const devId = developerId ?? 2; // Default to the second developer if none is selected

    this.http.post(`http://localhost:8085/api/issues/${this.issue.id}/assign`, { developerId: devId })
      .subscribe({
        next: () => {
          this.assigned.emit();
        },
        error: (err) => alert('Failed to assign developer'),
        complete: () => this.assigning = false
      });
  }
}

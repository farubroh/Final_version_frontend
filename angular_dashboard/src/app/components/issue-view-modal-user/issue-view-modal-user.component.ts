import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthenticationService } from '../../authentication.service'; // adjust path

@Component({
  selector: 'app-issue-view-modal-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-view-modal-user.component.html',
  styleUrls: ['./issue-view-modal-user.component.css']
})
export class IssueViewModalUserComponent implements OnInit {
  @Input() issue: any;
  @Input() files: string[] | null = null;
  @Output() close = new EventEmitter<void>();

  showCommentSidebar = true;
  newComment = '';
  comments: { author: string; message: string; time: string }[] = [];

  showAttachment: { show: boolean; buttonText: "Show Attachment(s)" | "Hide Attachment(s)" } = {show: false, buttonText: "Show Attachment(s)"}

  constructor(private http: HttpClient, private auth: AuthenticationService) { }

  private authHeader() {
    const token = this.auth.getToken(); // <-- single source of truth
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  ngOnInit() {
    this.loadComments();
    console.log(this.issue); // Check if 'completedReason' and 'rejectionReason' are populated
  }

  toggleCommentSidebar() {
    this.showCommentSidebar = !this.showCommentSidebar;
  }

  submitComment() {
    const content = this.newComment.trim();
    if (!content) return;

    const currentUser = this.auth.getUser();
    const issueId = this.issue?.id;
    const userId = currentUser?.id;

    // Get developerId based on the current issue status
    let developerId = null;
    if (this.issue?.resolvedBy?.id) {
      developerId = this.issue.resolvedBy.id;
    } else if (this.issue?.rejectedBy?.id) {
      developerId = this.issue.rejectedBy.id;
    } else if (this.issue?.assignedTo?.id) {
      developerId = this.issue.assignedTo.id;
    }
    console.log(developerId);


    const params = new HttpParams()
      .set('issueId', issueId.toString())
      .set('userId', userId.toString())
      .set('developerId', developerId ? developerId.toString() : '')
      .set('comment', content);

    this.http.post<any>(
      'http://localhost:8085/api/comments/add',
      params,
      { headers: this.authHeader() }
    ).subscribe({
      next: (res) => {
        console.log('[comments/add] success:', res);
        const date = new Date();
        const time = date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).toLowerCase();

        this.comments.unshift({
          author: res?.userDto?.username ?? currentUser?.username ?? 'You',
          message: res?.content ?? content,
          time: time,
        });
        this.newComment = '';  // Clear the input after submission
      },
      error: (err) => {
        console.error('[comments/add] failed:', err);
      }
    });
  }

  loadComments() {
    this.http.get<{ id: number; comment: string; createdByDto: any; developerDto: any; createdAt: string }[]>(
      `http://localhost:8085/api/comments/issue/${this.issue.id}`,
      { headers: this.authHeader() } // Add headers for authentication
    ).subscribe({
      next: (res) => {
        console.log('Comments loaded:', res); // Inspect the response data

        //Sorting the commments based on createdAt (commenting time) in descending order
        res.sort((a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );

        this.comments = res.map((comment) => {
          const date = new Date(comment.createdAt);
          const time = date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',


            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })

          return {
            author: comment.createdByDto?.role.toLowerCase() !== "user" ? 'Developer' : comment.createdByDto?.username, // Getting the username from createdByDto
            message: comment.comment, // Getting the comment content
            time: time,
          };
        });
      },
      error: (err) => {
        console.error('[comments/load] failed:', err);
      }
    });
  }


  onCloseModal() {
    this.close.emit();
  }

  clickAttachmentShow(){
    this.showAttachment.show = !this.showAttachment.show

    this.showAttachment.show ?
    this.showAttachment.buttonText = "Hide Attachment(s)"
    : this.showAttachment.buttonText = "Show Attachment(s)"
  }

  getIssueStatusColor(status: string): string {
    const normalizedCategory = (status || '').toLowerCase();
    if(normalizedCategory === 'pending') return '#0000FF'
    if(normalizedCategory === 'inprogress') return '#FFA500'
    if(normalizedCategory === 'completed') return '#008000'
    if(normalizedCategory === 'rejected') return '#FF0000'
        
    return '#0000000f';  // Fallback to default color
  }
}

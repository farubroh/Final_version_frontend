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
  // this.http
  // .get<{ categoryId: number; categoryName: string }[]>(
  //   'http://localhost:8085/api/categories'
  // )
  // .subscribe({
  //   next: (data) => {
  //     console.log('Fetched categories:', data);
  //     this.categories = data;
  //   },
  //   error: (err) => {
  //     console.error('Failed to load categories', err);
  //
  //   }
  // });

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
    // ✅ Extract userId from JWT token
    const userId = this.extractUserIdFromToken(this.user.token);

    if (!userId) {
      alert('❌ Cannot extract user ID from token. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Extracted userId:', userId);

    const formData = new FormData();
    formData.append('title', this.form.title);
    formData.append('description', this.form.description);
    formData.append('userId', userId); // ✅ Now you have the real ID
    formData.append('deptShortName', ''); // ✅ You may need to add this from somewhere

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
            // ✅ AFTER
          } else if (event.type === HttpEventType.Response) {
            (window as any).showSimpuiToast('Ticket submitted successfully', (window as any).getFormattedDateTime());

            setTimeout(() => {
              this.issueCreated.emit();
            }, 2000); // give the toast 1s to show before navigating away
          }
        },
        error: (err) => {
          alert('❌ Submission failed. Check logs.');
          console.error('Full error:', err);
        }
      });
  }

// ✅ Helper method to decode JWT and extract user ID
  private extractUserIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', payload);

      // JWT typically uses 'sub' for subject (user ID)
      // But it could also be 'userId', 'id', or something custom
      return payload.sub || payload.userId || payload.id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
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

  openFaqIndex: number | null = null;

  toggleFaq(index: number) {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  faqs = [
    {
      q: 'Failed to pay transportation fees after deadline?',
      office: 'Contact the Office of the Treasurer',
      note: 'For financial and deadline related issues (D Block - Lift 5)',
      contacts: [
        { name: 'Mr. Md. Abdullah Al Mamun', designation: 'Assistant Director of Finance', contact: '01726944833' },
        { name: 'Md. Nazmul Hasan', designation: 'Accounts Officer', contact: '' },
      ],
      steps: [], answer: ''
    },
    {
      q: 'Failed to pay proctor punishment fine after deadline?',
      office: '', note: '', contacts: [],
      steps: [
        'Contact the Office of the Proctor for a deadline extension.',
        'Once paid, contact the ICT Center (8D06) office.',
      ],
      answer: ''
    },
    {
      q: 'Failed to pay semester / re-admission fees on time?',
      office: 'Contact the Office of the Treasurer',
      note: 'For financial and deadline related issues (D Block - Lift 5)',
      contacts: [
        { name: 'Mr. Md. Abdullah Al Mamun', designation: 'Assistant Director of Finance', contact: '01726944833' },
        { name: 'Md. Nazmul Hasan', designation: 'Accounts Officer', contact: '' },
      ],
      steps: [], answer: ''
    },
    {
      q: 'Queries regarding FF/RA quota verification?',
      office: 'Contact the Office of the Registrar',
      note: 'For quota verification and drop/withdraw related issues (D Block - Lift 2)',
      contacts: [
        { name: 'Mr. Khan Abdullah Al Masud', designation: 'Assistant Administrative Officer', contact: '01911610644' },
      ],
      steps: [], answer: ''
    },
    {
      q: 'Problem with semester grades / GPA / CGPA?',
      office: 'Contact the Office of the Controller of Examinations',
      note: 'For grades/CGPA/result processing issues (D Block - Lift 4)',
      contacts: [
        { name: 'Mr. Salauddin Ahmed', designation: 'Deputy Controller of Examinations', contact: '01911420669' },
        { name: 'Mr. Mohammad Anamul Hoque Bhuiyan', designation: 'Assistant Controller of Examinations', contact: '01745227522' },
      ],
      steps: [], answer: ''
    },
    {
      q: 'CGPA not updated but friends can see theirs?',
      office: 'Contact the Office of the Controller of Examinations',
      note: 'For grades/CGPA/result processing issues (D Block - Lift 4)',
      contacts: [
        { name: 'Mr. Salauddin Ahmed', designation: 'Deputy Controller of Examinations', contact: '01911420669' },
        { name: 'Mr. Mohammad Anamul Hoque Bhuiyan', designation: 'Assistant Controller of Examinations', contact: '01745227522' },
      ],
      steps: [], answer: ''
    },
    {
      q: 'Want to apply for semester extension?',
      office: '', note: '', contacts: [],
      steps: [
        'Apply through your Dept./School Head for semester extension approval.',
        'Department forwards to the Office of the Vice-Chancellor.',
        'VC office forwards to Controller of Examinations who performs the extension in IUMS.',
      ],
      answer: ''
    },
    {
      q: 'Section information wrong or missing in IUMS?',
      office: '', note: '', contacts: [],
      steps: [],
      answer: 'Contact your Department/School Admin Officer. They can update your Theory and Sessional section information.'
    },
    {
      q: 'Paid fees via ONE Bank but status still Pending?',
      office: '', note: '', contacts: [],
      steps: [
        'CASH payments are verified instantly — status becomes Completed immediately.',
        'Pay Order / Demand Draft / Cheque takes time once the instrument is received by ONE Bank.',
        'ONE Bank can take 3–10 working days to send verification status to IUMS.',
      ],
      answer: ''
    },
    {
      q: 'Cannot get or login to institutional email?',
      office: '', note: '', contacts: [],
      steps: [],
      answer: 'For any institutional email (@aust.edu) issue, contact the Hardware & Network Division at B Block (7B04).'
    },
    {
      q: 'First year student and haven\'t received IUMS account?',
      office: '', note: '', contacts: [],
      steps: [],
      answer: 'IUMS team sends credentials to your institutional email. It may take some time. If classmates received theirs but you didn\'t, email the IUMS team in the required format.'
    },
  ];
}

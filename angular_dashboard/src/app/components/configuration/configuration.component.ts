import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

declare global {
  interface Window { HSSelect: any; }
}

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnChanges, AfterViewInit {

  @Input() deptId: string = '';

  employees: { employeeId: string; employeeName: string; designationName: string }[] = [];
  peopleList: { employeeId: string; person: string; role: string }[] = [];
  loading = false;
  error   = '';

  private readonly BASE_URL = 'http://localhost:8085/api';

  constructor(private http: HttpClient) {}

  // fires when deptId @Input changes (including first set)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['deptId'] && this.deptId) {
      this.loadEmployees();
    }
  }

  ngAfterViewInit() {
    this.initDropdowns();
  }

  loadEmployees() {
    if (!this.deptId) {
      this.error = 'No department ID available for this role.';
      return;
    }

    this.loading   = true;
    this.error     = '';
    this.employees = [];

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}`
    });

    this.http.get<any>(`${this.BASE_URL}/departments/${this.deptId}/employees`, { headers })
      .subscribe({
        next: (res) => {
          this.employees = res.entries ?? [];
          this.loading   = false;
          setTimeout(() => this.initDropdowns(), 300);
        },
        error: (err) => {
          console.error(err);
          this.error   = 'Failed to load department employees.';
          this.loading = false;
        }
      });
  }

  ngAfterViewInit_unused() {}   // kept AfterViewInit only for initDropdowns on first render

  initDropdowns() {
    if (window.HSSelect) {
      window.HSSelect.autoInit();
    }
  }

  addPerson() {
    const personSelect = document.querySelector<HTMLSelectElement>('[name="person"]');
    const roleSelect   = document.querySelector<HTMLSelectElement>('[name="role"]');

    const selectedOption       = personSelect?.selectedOptions[0];
    const selectedEmployeeId   = selectedOption?.value?.trim()       ?? '';
    const selectedEmployeeName = selectedOption?.textContent?.trim() ?? '';
    const selectedRole         = roleSelect?.selectedOptions[0]?.value?.trim() ?? '';

    if (!selectedEmployeeId || !selectedRole) {
      alert('Please select both a person and a role.');
      return;
    }

    if (this.peopleList.some(p => p.employeeId === selectedEmployeeId)) {
      alert(`${selectedEmployeeName} has already been assigned a role.`);
      return;
    }

    this.peopleList.push({
      employeeId: selectedEmployeeId,
      person:     selectedEmployeeName,
      role:       selectedRole
    });

    personSelect!.selectedIndex = 0;
    roleSelect!.selectedIndex   = 0;
    setTimeout(() => this.initDropdowns(), 200);
  }

  editPerson(index: number) {
    const current = this.peopleList[index];
    alert(`Edit: ${current.person} — ${current.role}`);
  }

  removePerson(index: number) {
    this.peopleList.splice(index, 1);
  }
}

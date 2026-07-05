import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

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
  peopleList: { employeeId: string; person: string; role: string; assignmentId: number }[] = [];
  loading = false;
  error   = '';
  systemRoles: { roleId: number; roleKey: string; roleLabel: string; assignable: boolean }[] = [];

  private readonly BASE_URL = 'http://localhost:8085/api';

  constructor(private http: HttpClient) {}

  // fires when deptId @Input changes (including first set)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['deptId'] && this.deptId) {
      this.loading = true;
      this.error   = '';

      forkJoin({
        employees:   this.fetchEmployees(),
        roles:       this.fetchSystemRoles(),
        assignments: this.fetchAssignments()
      }).subscribe({
        next: ({ employees, roles, assignments }) => {
          this.employees    = employees?.entries ?? [];
          this.systemRoles  = roles ?? [];
          this.peopleList   = this.mapAssignmentsToPeopleList(assignments ?? []);
          this.loading      = false;
          setTimeout(() => this.initDropdowns(), 300);
        },
        error: (err) => {
          console.error(err);
          this.error   = 'Failed to load configuration data.';
          this.loading = false;
        }
      });
    }
  }

  ngAfterViewInit() {
    this.initDropdowns();
  }

  private fetchEmployees() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}`
    });
    return this.http.get<any>(`${this.BASE_URL}/departments/${this.deptId}/employees`, { headers });
  }

  private fetchSystemRoles() {
    return this.http.get<any[]>(`${this.BASE_URL}/system-roles/assignable`);
  }

  private fetchAssignments() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}`
    });
    return this.http.get<any[]>(`${this.BASE_URL}/admin/role-assignments`, { headers });
  }

  // Maps raw UserSystemRole[] from backend into the display shape the table uses.
  // Backend assignments likely only carry userId + roleId — we resolve display
  // names from already-loaded employees/systemRoles.
  private mapAssignmentsToPeopleList(assignments: any[]) {
    return assignments
      .filter(a => a.deptShortName === this.deptId) // only this department's assignments, adjust if field name differs
      .map(a => {
        const emp  = this.employees.find(e => e.employeeId === a.userId);
        const role = this.systemRoles.find(r => r.roleId === a.roleId);

        return {
          employeeId:   a.userId,
          person:       emp?.employeeName ?? a.userId,
          role:         role?.roleLabel ?? String(a.roleId),
          assignmentId: a.id
        };
      });
  }

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

    const selectedRoleOption = roleSelect?.selectedOptions[0];
    const selectedRoleId     = selectedRoleOption?.value?.trim() ?? '';
    const selectedRoleName   = selectedRoleOption?.textContent?.trim() ?? '';

    if (!selectedEmployeeId || !selectedRoleId) {
      alert('Please select both a person and a role.');
      return;
    }

    if (this.peopleList.some(p => p.employeeId === selectedEmployeeId)) {
      alert(`${selectedEmployeeName} has already been assigned a role.`);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}`
    });

    const body = {
      userId: selectedEmployeeId,
      roleId: Number(selectedRoleId),
      deptShortName: this.deptId
    };

    this.http.post<any>(`${this.BASE_URL}/admin/role-assignments`, body, { headers })
      .subscribe({
        next: (savedRecord) => {
          this.peopleList.push({
            employeeId:   selectedEmployeeId,
            person:       selectedEmployeeName,
            role:         selectedRoleName,
            assignmentId: savedRecord.id
          });

          personSelect!.selectedIndex = 0;
          roleSelect!.selectedIndex   = 0;
          setTimeout(() => this.initDropdowns(), 200);
        },
        error: (err) => {
          console.error(err);
          if (err.status === 400) {
            alert('This employee already has that role assigned.');
          } else {
            alert('Failed to assign role.');
          }
        }
      });
  }

  editPerson(index: number) {
    const current = this.peopleList[index];
    alert(`Edit: ${current.person} — ${current.role}`);
  }

  removePerson(index: number) {
    const item = this.peopleList[index];

    if (!item.assignmentId) {
      console.error('No assignmentId found for this row — cannot revoke on backend.');
      this.peopleList.splice(index, 1);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('accessToken') ?? ''}`
    });

    this.http.delete<void>(`${this.BASE_URL}/admin/role-assignments/${item.assignmentId}`, { headers })
      .subscribe({
        next: () => {
          this.peopleList.splice(index, 1);
        },
        error: (err) => {
          console.error('Failed to revoke role assignment', err);
          alert('Failed to remove role assignment.');
        }
      });
  }
}

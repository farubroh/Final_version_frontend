import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigurationComponent } from '../configuration/configuration.component';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ConfigurationComponent],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit {
  sidebarOpen = true;
  expandedMenu: string | null = 'product';
  showConfiguration = false;

  // dropdown states
  showNotifications = false;
  showProfileMenu = false;
  activeDeptId:string='';

  // hardcoded notifications (replace with API later)
  notifications = [
    { id: 1, text: 'Your ticket #1042 has been resolved.', time: '2 min ago', read: false },
    { id: 2, text: 'New announcement from ICT Center.', time: '1 hr ago', read: false },
    { id: 3, text: 'System maintenance scheduled tonight.', time: '3 hrs ago', read: true },
  ];

  user = {
    id: '', name: '', designation: '', email: '',
    personalEmail: '', deptLongName: '', deptShortName: '',
    programLongName: '', programShortName: '', university: 'AUST',
  };

  isStudent = false;
  isHead = false;
  isEmployee = false;

  // employee multi-role support
  roleInfo: any[] = [];
  activeRoleIndex = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    const name      = localStorage.getItem('name')          ?? '';
    const email     = localStorage.getItem('eduEmail')      ?? '';
    const isStudent = localStorage.getItem('isStudent')     === 'true';

    this.isStudent = isStudent;

    if (isStudent) {
      this.user = {
        id:               localStorage.getItem('userId')          ?? '',
        name,
        email,
        personalEmail:    localStorage.getItem('personalEmail')   ?? '',
        deptLongName:     localStorage.getItem('deptLongName')    ?? '',
        deptShortName:    localStorage.getItem('deptShortName')   ?? '',
        programLongName:  localStorage.getItem('programLongName') ?? '',
        programShortName: localStorage.getItem('programShortName') ?? '',
        designation:      'Student',
        university:       'AUST',
      };
      this.isHead     = false;
      this.isEmployee = false;

    } else {
      const raw = localStorage.getItem('roleInfo');
      this.roleInfo = raw ? JSON.parse(raw) : [];
      this.applyRole(0); // start with first role (isPrimaryRole)
    }
  }

  applyRole(index: number) {
    this.activeRoleIndex = index;
    const r = this.roleInfo[index];
    if (!r) return;

    this.isHead     = r.isHead === true;
    this.isEmployee = !this.isHead;
    this.activeDeptId = r.deptId ?? '';   // ← ADD THIS

    this.user = {
      id:               localStorage.getItem('userId')        ?? '',
      name:             localStorage.getItem('name')          ?? '',
      email:            localStorage.getItem('eduEmail')      ?? '',
      personalEmail:    localStorage.getItem('personalEmail') ?? '',
      designation:      r.designationName,
      deptLongName:     r.deptLongName,
      deptShortName:    r.deptShortName,
      programLongName:  '',
      programShortName: '',
      university:       'AUST',
    };

    this.showProfileMenu = false;
  }

  toggleSidebar()        { this.sidebarOpen = !this.sidebarOpen; }
  toggleMenu(menu: string) { this.expandedMenu = this.expandedMenu === menu ? null : menu; }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  get unreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  navigateToUserDashboard()  { this.showConfiguration = false; this.router.navigate(['/dashboard']); }
  navigateToAdminDashboard() { this.showConfiguration = false; this.router.navigate(['/admin']); }
  navigateToConfiguration()  { this.showConfiguration = true; }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}

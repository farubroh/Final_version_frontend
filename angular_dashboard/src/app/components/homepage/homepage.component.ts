import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {CommonModule} from '@angular/common';
import {ConfigurationComponent} from '../configuration/configuration.component';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ConfigurationComponent], // Import ConfigurationComponent here
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent {
  sidebarOpen = true;
  expandedMenu: string | null = 'product';
  activeSidebar: string | null = 'dashboard';
  showUserDetails = false;
  selectedUser: any | null = null;
  showConfiguration = false;  // Added this property to toggle content

  constructor(private router: Router) {}

  users = [
    { id: 1, name: 'Gladlyce Brown', designation: 'Product Manager', email: 'gladyce@example.com', university: 'AUST', avatar: 'https://randomuser.me/api/portraits/women/65.jpg' },
    { id: 2, name: 'Elbert Smith', designation: 'UI/UX Designer', email: 'elbert@example.com', university: 'AUST', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  ];

  user = { name: 'Omar Rahman', designation: 'Helpdesk Specialist', email: 'omar@example.com', university: 'AUST', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' };

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMenu(menu: string) {
    this.expandedMenu = this.expandedMenu === menu ? null : menu;
  }

  toggleUserDetails() {
    this.showUserDetails = !this.showUserDetails;
  }

  setActiveSidebar(key: string) {
    this.activeSidebar = key;
  }

  selectUser(u: any) {
    this.selectedUser = u;
  }

  closeUserDetails() {
    this.selectedUser = null;
  }

  logout() {
    // Implement your logout logic here
  }

  navigateToUserDashboard() {
    this.router.navigate(['/dashboard']);  // This should navigate to the user dashboard
  }

  navigateToAdminDashboard() {
    this.router.navigate(['/admin']);  // This should navigate to the admin dashboard
  }

  navigateToDeveloperDashboard() {
    this.router.navigate(['/developer']);  // This should navigate to the developer dashboard
  }

  navigateToConfiguration() {
    this.showConfiguration = true; // Show the configuration content
  }
}

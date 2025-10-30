// app.route.ts
import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DashboardComponent } from './components/user-dashboard/user-dashboard.component';
import { CreateIssueComponent } from './components/create-issue/create-issue.component';
import { IssueTableComponent } from './components/issue-table/issue-table.component';
import { DeveloperDashboardComponent } from './developers/developer-dashboard/developer-dashboard.component';
// import { LoginComponent } from './components/login/login.component';

import { AuthGuard } from './auth.guard';
import { HomepageComponent } from './components/homepage/homepage.component';
import { LoginPageComponent } from './components/login-page/login-page.component';
import {RegisterPageComponent} from './components/register-page/register-page.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { SessionExpiredComponent } from './components/session-expired/session-expired.component';
import { ConfigurationComponent } from './components/configuration/configuration.component';

export const routes: Routes = [
  { path: '', redirectTo: '/register', pathMatch: 'full' },
{ path: 'login', component: LoginPageComponent },
{ path: 'register', component: RegisterPageComponent },
{ path: 'reset-password', component: ResetPasswordComponent },
{ path: 'session-expired', component: SessionExpiredComponent },
{ path: 'home', component: HomepageComponent, canActivate: [AuthGuard] },
{ path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
{ path: 'admin', component: AdminDashboardComponent, canActivate: [AuthGuard] },
{ path: 'developer', component: DeveloperDashboardComponent, canActivate: [AuthGuard] },
  { path: 'configuration', component: ConfigurationComponent, canActivate: [AuthGuard] },

];

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueViewModalAdminComponent } from './issue-view-modal-admin.component';

describe('IssueViewModalAdminComponent', () => {
  let component: IssueViewModalAdminComponent;
  let fixture: ComponentFixture<IssueViewModalAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueViewModalAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueViewModalAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

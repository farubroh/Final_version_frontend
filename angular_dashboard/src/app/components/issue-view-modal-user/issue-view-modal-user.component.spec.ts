import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueViewModalUserComponent } from './issue-view-modal-user.component';

describe('IssueViewModalUserComponent', () => {
  let component: IssueViewModalUserComponent;
  let fixture: ComponentFixture<IssueViewModalUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueViewModalUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueViewModalUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

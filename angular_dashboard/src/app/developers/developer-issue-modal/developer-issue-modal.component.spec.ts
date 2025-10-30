import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeveloperIssueModalComponent } from './developer-issue-modal.component';

describe('DeveloperIssueModalComponent', () => {
  let component: DeveloperIssueModalComponent;
  let fixture: ComponentFixture<DeveloperIssueModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeveloperIssueModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeveloperIssueModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

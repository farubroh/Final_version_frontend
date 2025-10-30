import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignModalComponent } from './assign-model.component';


describe('AssignModelComponent', () => {
  let component: AssignModalComponent;
  let fixture: ComponentFixture<AssignModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

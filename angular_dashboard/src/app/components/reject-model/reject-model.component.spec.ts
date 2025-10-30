import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectModelComponent } from './reject-model.component';

describe('RejectModelComponent', () => {
  let component: RejectModelComponent;
  let fixture: ComponentFixture<RejectModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RejectModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RejectModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

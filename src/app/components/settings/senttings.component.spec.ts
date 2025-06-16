import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SenttingsComponent } from './settings.component';

describe('SenttingsComponent', () => {
  let component: SenttingsComponent;
  let fixture: ComponentFixture<SenttingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SenttingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SenttingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

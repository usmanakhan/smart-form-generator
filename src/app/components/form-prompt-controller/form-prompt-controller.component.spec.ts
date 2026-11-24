import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormPromptControllerComponent } from './form-prompt-controller.component';

describe('FormPromptControllerComponent', () => {
  let component: FormPromptControllerComponent;
  let fixture: ComponentFixture<FormPromptControllerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormPromptControllerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormPromptControllerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

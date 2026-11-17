import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { DynamicFormGeneratorComponent } from './dynamic-form-generator.component';
import { FormParserService } from '../../services/form-parser.service';
import { FormConfig } from '../../form-schema';

describe('DynamicFormGeneratorComponent', () => {
  let component: DynamicFormGeneratorComponent;
  let fixture: ComponentFixture<DynamicFormGeneratorComponent>;

  // Mock FormConfig matching your Zod schema contract
  const mockConfig: FormConfig = {
    formTitle: 'Test User Registration',
    formDescription: 'Fill out test details',
    submitButtonLabel: 'Register Now',
    fields: [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        validations: [
          { type: 'required', message: 'Username is strictly required.' },
          { type: 'min', value: 3, message: 'Username must be at least 3 characters.' }
        ]
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        validations: [
          { type: 'required', message: 'Email address is required.' },
          { type: 'email', message: 'Must be a valid email.' }
        ]
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormGeneratorComponent], // Standalone component import
      providers: [FormParserService]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormGeneratorComponent);
    component = fixture.componentInstance;

    // Simulate initial @Input binding and ngOnChanges lifecycle trigger
    component.config = mockConfig;
    component.ngOnChanges({
      config: new SimpleChange(null, mockConfig, true)
    });
    fixture.detectChanges();
  });

  it('should create the component instance', () => {
    expect(component).toBeTruthy();
  });

  it('should dynamically build the FormGroup based on FormConfig fields', () => {
    expect(component.form).toBeDefined();
    expect(component.form.contains('username')).toBe(true);
    expect(component.form.contains('email')).toBe(true);
  });

  it('should correctly identify required fields with isFieldRequired()', () => {
    expect(component.isFieldRequired('username')).toBe(true);
    expect(component.isFieldRequired('email')).toBe(true);
  });

  it('should mark all controls as touched when submitting an invalid form', () => {
    vi.spyOn(component.form, 'markAllAsTouched');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(component.form.get('username')?.touched).toBe(true);
  });

  it('should return the custom error message when a control is touched and invalid', () => {
    const usernameControl = component.form.get('username');
    usernameControl?.setValue('');
    usernameControl?.markAsTouched();

    const errorMessage = component.getErrorMessage('username');
    expect(errorMessage).toBe('Username is strictly required.');
  });
});

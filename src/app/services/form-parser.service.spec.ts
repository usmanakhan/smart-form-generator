import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FormParserService } from './form-parser.service';
import { FormConfig, FormField } from '../../form-schema';

describe('FormParserService', () => {
  let service: FormParserService;

  const createConfig = (overrides: Partial<FormConfig> & { fields: FormField[] }): FormConfig => ({
    formTitle: 'Test Form',
    submitButtonLabel: 'Submit',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [FormParserService],
    });
    service = TestBed.inject(FormParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('buildFormGroup - Field & Control Generation', () => {
    it('should generate FormControls matching the config fields', () => {
      const config = createConfig({
        fields: [
          { name: 'firstName', label: 'First Name', type: 'text' },
          { name: 'lastName', label: 'Last Name', type: 'text' },
        ],
      });

      const formGroup = service.buildFormGroup(config);

      expect(formGroup.contains('firstName')).toBe(true);
      expect(formGroup.contains('lastName')).toBe(true);
      expect(Object.keys(formGroup.controls).length).toBe(2);
    });

    it('should assign explicit defaultValue if provided', () => {
      const config = createConfig({
        fields: [
          { name: 'username', label: 'Username', type: 'text', defaultValue: 'john_doe' },
          { name: 'age', label: 'Age', type: 'number', defaultValue: 25 },
          { name: 'terms', label: 'Agree to terms', type: 'checkbox', defaultValue: true },
        ],
      });

      const formGroup = service.buildFormGroup(config);

      expect(formGroup.get('username')?.value).toBe('john_doe');
      expect(formGroup.get('age')?.value).toBe(25);
      expect(formGroup.get('terms')?.value).toBe(true);
    });

    it('should default checkbox to false when defaultValue is omitted', () => {
      const config = createConfig({
        fields: [
          { name: 'newsletter', label: 'Subscribe', type: 'checkbox' },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      expect(formGroup.get('newsletter')?.value).toBe(false);
    });

    it('should default non-checkbox fields to empty string when defaultValue is omitted', () => {
      const config = createConfig({
        fields: [
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'country', label: 'Country', type: 'select' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      expect(formGroup.get('email')?.value).toBe('');
      expect(formGroup.get('country')?.value).toBe('');
      expect(formGroup.get('notes')?.value).toBe('');
    });
  });

  describe('Validation Mapping', () => {
    it('should create valid control when validations array is undefined or empty', () => {
      const config = createConfig({
        fields: [
          { name: 'bio', label: 'Bio', type: 'textarea' },
          { name: 'website', label: 'Website', type: 'text', validations: [] },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const bioControl = formGroup.get('bio');
      const websiteControl = formGroup.get('website');

      expect(bioControl?.valid).toBe(true);
      expect(websiteControl?.valid).toBe(true);
    });

    it('should apply required validation correctly', () => {
      const config = createConfig({
        fields: [
          {
            name: 'fullName',
            label: 'Full Name',
            type: 'text',
            validations: [{ type: 'required', message: 'Name is required' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('fullName')!;

      expect(control.valid).toBe(false);
      expect(control.errors?.['required']).toBe(true);

      control.setValue('Jane Doe');
      expect(control.valid).toBe(true);
      expect(control.errors).toBeNull();
    });

    it('should apply email validation correctly', () => {
      const config = createConfig({
        fields: [
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            validations: [{ type: 'email', message: 'Must be a valid email' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('email')!;

      control.setValue('invalid-email-address');
      expect(control.valid).toBe(false);
      expect(control.errors?.['email']).toBe(true);

      control.setValue('jane@example.com');
      expect(control.valid).toBe(true);
      expect(control.errors).toBeNull();
    });

    it('should apply min length validation when value is numeric', () => {
      const config = createConfig({
        fields: [
          {
            name: 'code',
            label: 'Security Code',
            type: 'text',
            validations: [{ type: 'min', value: 5, message: 'Minimum 5 characters required' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('code')!;

      control.setValue('1234');
      expect(control.valid).toBe(false);
      expect(control.errors?.['minlength']).toBeDefined();
      expect(control.errors?.['minlength'].requiredLength).toBe(5);

      control.setValue('12345');
      expect(control.valid).toBe(true);
    });

    it('should ignore min length validation when value is not a number', () => {
      const config = createConfig({
        fields: [
          {
            name: 'code',
            label: 'Security Code',
            type: 'text',
            validations: [{ type: 'min', value: 'not-a-number' as any, message: 'Invalid min rule' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('code')!;

      control.setValue('a');
      expect(control.valid).toBe(true);
    });

    it('should apply max length validation when value is numeric', () => {
      const config = createConfig({
        fields: [
          {
            name: 'handle',
            label: 'Handle',
            type: 'text',
            validations: [{ type: 'max', value: 8, message: 'Maximum 8 characters allowed' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('handle')!;

      control.setValue('123456789');
      expect(control.valid).toBe(false);
      expect(control.errors?.['maxlength']).toBeDefined();
      expect(control.errors?.['maxlength'].requiredLength).toBe(8);

      control.setValue('12345678');
      expect(control.valid).toBe(true);
    });

    it('should ignore max length validation when value is not a number', () => {
      const config = createConfig({
        fields: [
          {
            name: 'handle',
            label: 'Handle',
            type: 'text',
            validations: [{ type: 'max', value: undefined, message: 'No value passed' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('handle')!;

      control.setValue('superlongstringexceedingnormalbounds');
      expect(control.valid).toBe(true);
    });

    it('should apply pattern validation when value is a string regex', () => {
      const config = createConfig({
        fields: [
          {
            name: 'zipCode',
            label: 'Zip Code',
            type: 'text',
            validations: [{ type: 'pattern', value: '^[0-9]{5}$', message: 'Must be 5 digits' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('zipCode')!;

      control.setValue('abcde');
      expect(control.valid).toBe(false);
      expect(control.errors?.['pattern']).toBeDefined();

      control.setValue('12345');
      expect(control.valid).toBe(true);
    });

    it('should ignore pattern validation when value is not a string', () => {
      const config = createConfig({
        fields: [
          {
            name: 'zipCode',
            label: 'Zip Code',
            type: 'text',
            validations: [{ type: 'pattern', value: 12345 as any, message: 'Pattern value not string' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('zipCode')!;

      control.setValue('abcde');
      expect(control.valid).toBe(true);
    });

    it('should combine multiple validators on a single field', () => {
      const config = createConfig({
        fields: [
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            validations: [
              { type: 'required', message: 'Password is required' },
              { type: 'min', value: 6, message: 'Minimum 6 chars' },
              { type: 'pattern', value: '^[A-Za-z0-9]+$', message: 'Alphanumeric only' },
            ],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);
      const control = formGroup.get('password')!;

      // 1. Initially empty: required error
      expect(control.valid).toBe(false);
      expect(control.errors?.['required']).toBe(true);

      // 2. Too short: minlength error
      control.setValue('abc');
      expect(control.valid).toBe(false);
      expect(control.errors?.['minlength']).toBeDefined();

      // 3. Right length but invalid characters: pattern error
      control.setValue('abcdef!');
      expect(control.valid).toBe(false);
      expect(control.errors?.['pattern']).toBeDefined();

      // 4. Valid length and characters: valid
      control.setValue('abcdef123');
      expect(control.valid).toBe(true);
      expect(control.errors).toBeNull();
    });
  });

  describe('Integration / Full Form Validation', () => {
    it('should accurately reflect form-wide validity status', () => {
      const config = createConfig({
        fields: [
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            validations: [
              { type: 'required', message: 'Email required' },
              { type: 'email', message: 'Invalid email' },
            ],
          },
          {
            name: 'fullName',
            label: 'Full Name',
            type: 'text',
            validations: [{ type: 'required', message: 'Name required' }],
          },
        ],
      });

      const formGroup = service.buildFormGroup(config);

      // Initially invalid because controls are empty strings
      expect(formGroup.valid).toBe(false);

      // Fill in valid email, but fullName is still empty
      formGroup.get('email')?.setValue('user@domain.com');
      expect(formGroup.valid).toBe(false);

      // Fill in fullName
      formGroup.get('fullName')?.setValue('Jane Doe');
      expect(formGroup.valid).toBe(true);
    });
  });
});

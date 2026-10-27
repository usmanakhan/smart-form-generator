import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ValidatorFn } from '@angular/forms';
import { FormConfig, FormField, FormFieldValidation } from '../../form-schema';

@Injectable({
    providedIn: 'root'
})
export class FormParserService {
    private fb = inject(FormBuilder);

    /**
     * Transforms a validated FormConfig payload into an interactive Angular FormGroup
     */
    buildFormGroup(config: FormConfig): FormGroup {
        const groupControls: { [key: string]: FormControl } = {};

        config.fields.forEach((field: FormField) => {
            // 1. Extract Angular Validators from Zod validation definitions
            const validators: ValidatorFn[] = this.extractValidators(field.validations);

            // 2. Determine initial value (fallback to false for checkboxes, '' for text/select)
            const initialValue = field.defaultValue ?? (field.type === 'checkbox' ? false : '');

            // 3. Instantiate FormControl
            groupControls[field.name] = new FormControl(initialValue, { validators });
        });

        return this.fb.group(groupControls);
    }

    /**
     * Maps string-based validation rules from LLM JSON to Angular ValidatorFn instances
     */
    private extractValidators(validations?: FormFieldValidation[]): ValidatorFn[] {
        if (!validations || validations.length === 0) {
            return [];
        }

        const controlValidators: ValidatorFn[] = [];

        validations.forEach((validation) => {
            switch (validation.type) {
                case 'required':
                    controlValidators.push(Validators.required);
                    break;
                case 'email':
                    controlValidators.push(Validators.email);
                    break;
                case 'min':
                    if (typeof validation.value === 'number') {
                        controlValidators.push(Validators.minLength(validation.value));
                    }
                    break;
                case 'max':
                    if (typeof validation.value === 'number') {
                        controlValidators.push(Validators.maxLength(validation.value));
                    }
                    break;
                case 'pattern':
                    if (typeof validation.value === 'string') {
                        controlValidators.push(Validators.pattern(validation.value));
                    }
                    break;
            }
        });

        return controlValidators;
    }
}
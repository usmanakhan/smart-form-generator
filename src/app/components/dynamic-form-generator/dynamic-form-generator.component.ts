import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormConfig } from '../../form-schema';
import { FormParserService } from '../../services/form-parser.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  selector: 'app-dynamic-form-generator',
  styleUrl: './dynamic-form-generator.component.css',
  templateUrl: './dynamic-form-generator.component.html',
})
export class DynamicFormGeneratorComponent implements OnChanges {

  // 1. Inject the FormParserService using Angular's modern inject() function
  private formParserService = inject(FormParserService);

  // 2. Required Input Property (Angular v16+)
  @Input({ required: true }) config!: FormConfig;

  // 3. Holds the dynamic reactive form group instance
  form!: FormGroup;

  // 4. Rebuild the form whenever a new configuration payload is passed
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.buildForm();
    }
  }

  private buildForm(): void {
    this.form = this.formParserService.buildFormGroup(this.config);
  }

  // 5. Handle form submission & validation triggers
  onSubmit(): void {
    if (this.form && this.form.valid) {
      console.log('⚡ Dynamic Form Submitted Successfully:', this.form.value);
    } else if (this.form) {
      // Highlights all invalid fields with visual error feedback
      this.form.markAllAsTouched();
    }
  }
}

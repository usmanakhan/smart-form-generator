# SmartFormGenerator

A dynamic, schema-driven smart form generator built with Angular and Zod.

## Overview

SmartFormGenerator allows you to define forms declaratively using strongly-typed [Zod](https://zod.dev/) schemas. It provides runtime validation and automatic TypeScript type inference, making it easy to generate dynamic forms in Angular from simple JSON or configuration objects.

The core schema is implemented in [`src/app/form-schema.ts`](file:///d:/learning/antigravity-ai/smart-form-generator/src/app/form-schema.ts) (re-exported via [`src/form-schema.ts`](file:///d:/learning/antigravity-ai/smart-form-generator/src/form-schema.ts)).

### Key Features
- **Strict Runtime Validation**: Validate form configuration payloads using `FormConfigSchema.safeParse()`.
- **Supported Field Types**: `text`, `number`, `email`, `password`, `select`, `textarea`, and `checkbox`.
- **Validation Constraints**: Add `required`, `email`, `min`, `max`, and `pattern` rules with custom error messages.
- **Strict Naming Rules**: Form field names enforce alphanumeric characters and underscores (`/^[a-zA-Z0-9_]+$/`).
- **Seamless Angular Integration**: Easily transform form configurations into Angular `FormGroup` controls and reactive validators.

---

## Documentation

- 📖 [Form Schema Architecture & Reference](docs/form-schema.md): Complete guide covering the data models (`FormConfig`, `FormField`, `FormFieldValidation`), Zod schema parsing, full configuration examples, and an Angular integration recipe.

---

## Quick Example

```typescript
import { FormConfig, FormConfigSchema } from './src/form-schema';

const contactForm: FormConfig = {
  formTitle: 'Contact Us',
  formDescription: 'Send us a message and we will respond promptly.',
  submitButtonLabel: 'Send Message',
  fields: [
    {
      name: 'full_name',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Jane Doe',
      validations: [
        { type: 'required', message: 'Name is required' },
        { type: 'min', value: 2, message: 'Name must have at least 2 characters' }
      ]
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'jane@example.com',
      validations: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Please enter a valid email address' }
      ]
    },
    {
      name: 'category',
      label: 'Inquiry Type',
      type: 'select',
      defaultValue: 'support',
      options: [
        { label: 'General Support', value: 'support' },
        { label: 'Sales Inquiry', value: 'sales' },
        { label: 'Feedback', value: 'feedback' }
      ],
      validations: [
        { type: 'required', message: 'Please select an inquiry type' }
      ]
    },
    {
      name: 'message',
      label: 'Your Message',
      type: 'textarea',
      placeholder: 'Enter your message...',
      validations: [
        { type: 'required', message: 'Message cannot be empty' },
        { type: 'max', value: 500, message: 'Message cannot exceed 500 characters' }
      ]
    }
  ]
};

// Validate at runtime using Zod
const result = FormConfigSchema.safeParse(contactForm);
if (result.success) {
  console.log('Form configuration is valid!');
} else {
  console.error('Validation errors:', result.error.format());
}
```

---

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, run:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

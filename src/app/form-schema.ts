import { z } from 'zod';

export const FormFieldValidationSchema = z.object({
  type: z.enum(['required', 'email', 'min', 'max', 'pattern']),
  value: z.any().optional(), // e.g., length number for min/max, string regex for pattern
  message: z.string().min(1, "Error message must be specified for field validation")
});

export const FormFieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_]+$/, "Field name must be alphanumeric and contains no spaces"),
  label: z.string().min(1, "Field label cannot be empty"),
  type: z.enum(['text', 'number', 'email', 'password', 'select', 'textarea', 'checkbox']),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.any()
  })).optional().describe("Options required only when type is 'select'"),
  validations: z.array(FormFieldValidationSchema).optional()
});

export const FormConfigSchema = z.object({
  formTitle: z.string().min(1, "Form title must be defined"),
  formDescription: z.string().optional(),
  submitButtonLabel: z.string().default('Submit'),
  fields: z.array(FormFieldSchema)
});

// Strongly-typed model inference for your frontend code
export type FormConfig = z.infer<typeof FormConfigSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormFieldValidation = z.infer<typeof FormFieldValidationSchema>;
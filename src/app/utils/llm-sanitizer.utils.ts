import { z } from 'zod';
import {
  FormConfig,
  FormConfigSchema,
  FormField,
  FormFieldValidation,
} from '../form-schema';

/**
 * Custom error class thrown when LLM output extraction, parsing, or validation fails.
 */
export class LLMSanitizerError extends Error {
  constructor(
    message: string,
    public readonly rawInput?: unknown,
    public readonly extractedJson?: string,
    public readonly issues?: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'LLMSanitizerError';
    Object.setPrototypeOf(this, LLMSanitizerError.prototype);
  }
}

/**
 * Result structure returned by safeSanitizeAndValidateLLMOutput.
 */
export interface SanitizeResult<T = FormConfig> {
  success: boolean;
  data: T | null;
  error: string | null;
  rawExtractedJson?: string;
  issues?: z.ZodIssue[];
}

/**
 * Configuration options for sanitizeAndValidateLLMOutput.
 */
export interface LLMSanitizerOptions {
  /**
   * If true (default), throws an LLMSanitizerError when validation fails.
   * If false, returns fallback (or null) instead of throwing.
   */
  throwOnError?: boolean;

  /**
   * Custom Zod schema to validate against. Defaults to FormConfigSchema.
   */
  schema?: z.ZodType<any>;

  /**
   * Fallback FormConfig returned when validation fails and throwOnError is false.
   */
  fallback?: FormConfig;

  /**
   * If true (default), strips potentially unsafe HTML/script tags from labels,
   * placeholders, titles, and messages to prevent stored XSS.
   */
  sanitizeHtml?: boolean;
}

/**
 * Mapping of common LLM field type aliases to the 7 supported FormField types.
 */
const FIELD_TYPE_MAP: Record<string, FormField['type']> = {
  text: 'text',
  string: 'text',
  str: 'text',
  input: 'text',
  number: 'number',
  num: 'number',
  int: 'number',
  integer: 'number',
  float: 'number',
  decimal: 'number',
  email: 'email',
  'e-mail': 'email',
  password: 'password',
  pass: 'password',
  select: 'select',
  dropdown: 'select',
  'drop-down': 'select',
  choice: 'select',
  radio: 'select',
  textarea: 'textarea',
  'text-area': 'textarea',
  multiline: 'textarea',
  longtext: 'textarea',
  checkbox: 'checkbox',
  bool: 'checkbox',
  boolean: 'checkbox',
  toggle: 'checkbox',
  switch: 'checkbox',
};

/**
 * Mapping of common LLM validation aliases to supported validation types.
 */
const VALIDATION_TYPE_MAP: Record<string, FormFieldValidation['type']> = {
  required: 'required',
  mandatory: 'required',
  email: 'email',
  min: 'min',
  minimum: 'min',
  minlength: 'min',
  'min-length': 'min',
  max: 'max',
  maximum: 'max',
  maxlength: 'max',
  'max-length': 'max',
  pattern: 'pattern',
  regex: 'pattern',
  regexp: 'pattern',
};

/**
 * Sanitizes a string by stripping script tags, javascript: links, inline event handlers,
 * and raw HTML tags.
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:[^"'\s]*/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Extracts and isolates JSON from raw LLM text that may contain Markdown code fences
 * (```json ... ```) or conversational preambles/postambles.
 */
export function extractJsonFromLLMOutput(input: string): string {
  if (typeof input !== 'string') {
    throw new LLMSanitizerError('Input must be a string or JSON object', input);
  }

  let text = input.trim();

  // Strip Markdown code fences if present (```json ... ``` or ``` ...)
  const codeBlockRegex = /```(?:json|jsonc|javascript|typescript|ts)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // Find outermost JSON object { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // Clean trailing commas before closing braces/brackets (e.g. { "a": 1, })
  text = text.replace(/,\s*([}\]])/g, '$1');

  return text;
}

/**
 * Sanitizes and normalizes an untrusted parsed object into a clean structure conforming
 * to FormConfigSchema specifications.
 */
export function sanitizeFormConfig(raw: unknown, sanitizeHtml = true): unknown {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  let obj = raw as Record<string, any>;

  // Unwrap common LLM response envelopes (e.g., { formConfig: { ... } }, { form: { ... } })
  const wrapperKeys = [
    'formConfig',
    'form_config',
    'form',
    'config',
    'schema',
    'data',
    'response',
    'result',
  ];
  if (!Array.isArray(obj['fields']) && !obj['formTitle']) {
    for (const key of wrapperKeys) {
      if (obj[key] && typeof obj[key] === 'object') {
        obj = obj[key];
        break;
      }
    }
  }

  // 1. Sanitize Form Title
  let rawTitle = obj['formTitle'] ?? obj['title'] ?? 'Generated Form';
  let formTitle = typeof rawTitle === 'string'
    ? (sanitizeHtml ? sanitizeString(rawTitle) : rawTitle.trim())
    : 'Generated Form';
  if (!formTitle) formTitle = 'Generated Form';

  // 2. Sanitize Form Description
  let rawDescription = obj['formDescription'] ?? obj['description'];
  let formDescription: string | undefined = typeof rawDescription === 'string'
    ? (sanitizeHtml ? sanitizeString(rawDescription) : rawDescription.trim())
    : undefined;

  // 3. Sanitize Submit Button Label
  let rawButtonLabel = obj['submitButtonLabel'] ?? obj['submitLabel'] ?? 'Submit';
  let submitButtonLabel = typeof rawButtonLabel === 'string'
    ? (sanitizeHtml ? sanitizeString(rawButtonLabel) : rawButtonLabel.trim())
    : 'Submit';
  if (!submitButtonLabel) submitButtonLabel = 'Submit';

  // 4. Sanitize and normalize Fields
  const rawFields = Array.isArray(obj['fields']) ? obj['fields'] : [];
  const fields = rawFields.map((f: any, idx: number) => {
    if (!f || typeof f !== 'object') {
      return {
        name: `field_${idx + 1}`,
        label: `Field ${idx + 1}`,
        type: 'text' as const,
      };
    }

    // Name: enforce alphanumeric and underscores (/^[a-zA-Z0-9_]+$/)
    let rawName = f.name ?? f.id ?? f.key ?? `field_${idx + 1}`;
    let name = String(rawName)
      .trim()
      .replace(/[-\s.]+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    if (!name) name = `field_${idx + 1}`;

    // Label: ensure non-empty
    let rawLabel = f.label ?? f.title ?? name.replace(/_/g, ' ');
    let label = sanitizeHtml ? sanitizeString(String(rawLabel)) : String(rawLabel).trim();
    if (!label) label = `Field ${idx + 1}`;

    // Type normalization
    const rawType = String(f.type || 'text').toLowerCase().trim();
    const type: FormField['type'] = FIELD_TYPE_MAP[rawType] || 'text';

    // Placeholder
    let placeholder: string | undefined;
    if (typeof f.placeholder === 'string') {
      placeholder = sanitizeHtml ? sanitizeString(f.placeholder) : f.placeholder.trim();
    }

    // Options (required when type === 'select')
    let options: Array<{ label: string; value: any }> | undefined;
    if (type === 'select') {
      const rawOptions = Array.isArray(f.options) ? f.options : [];
      if (rawOptions.length > 0) {
        options = rawOptions.map((opt: any, optIdx: number) => {
          if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
            const optStr = String(opt);
            return {
              label: sanitizeHtml ? sanitizeString(optStr) : optStr,
              value: opt,
            };
          }
          if (opt && typeof opt === 'object') {
            const optLabel = opt.label !== undefined ? String(opt.label) : String(opt.value ?? `Option ${optIdx + 1}`);
            return {
              label: sanitizeHtml ? sanitizeString(optLabel) : optLabel,
              value: opt.value !== undefined ? opt.value : optLabel,
            };
          }
          return { label: `Option ${optIdx + 1}`, value: optIdx + 1 };
        });
      } else {
        options = [{ label: 'Select an option', value: '' }];
      }
    }

    // Validations normalization
    let validations: FormFieldValidation[] | undefined;
    if (Array.isArray(f.validations)) {
      const parsedValidations = f.validations
        .map((v: any) => {
          if (!v || typeof v !== 'object') return null;
          const rawValType = String(v.type || '').toLowerCase().trim();
          const valType = VALIDATION_TYPE_MAP[rawValType];
          if (!valType) return null;

          let value = v.value;
          if (valType === 'min' || valType === 'max') {
            if (typeof value === 'string' && !isNaN(Number(value))) {
              value = Number(value);
            }
          }

          let message = typeof v.message === 'string'
            ? (sanitizeHtml ? sanitizeString(v.message) : v.message.trim())
            : '';

          // Auto-generate sensible error message if LLM omitted it
          if (!message) {
            switch (valType) {
              case 'required':
                message = `${label} is required`;
                break;
              case 'email':
                message = 'Please enter a valid email address';
                break;
              case 'min':
                message = type === 'number'
                  ? `${label} must be at least ${value ?? 0}`
                  : `${label} must be at least ${value ?? 1} characters`;
                break;
              case 'max':
                message = type === 'number'
                  ? `${label} cannot exceed ${value ?? 100}`
                  : `${label} cannot exceed ${value ?? 255} characters`;
                break;
              case 'pattern':
                message = `${label} has an invalid format`;
                break;
              default:
                message = `${label} is invalid`;
            }
          }

          const validationRule: FormFieldValidation = {
            type: valType,
            message,
          };
          if (value !== undefined) {
            validationRule.value = value;
          }

          return validationRule;
        })
        .filter((v: FormFieldValidation | null): v is FormFieldValidation => v !== null);

      if (parsedValidations.length > 0) {
        validations = parsedValidations;
      }
    }

    const fieldConfig: Record<string, any> = {
      name,
      label,
      type,
    };

    if (placeholder !== undefined) fieldConfig['placeholder'] = placeholder;
    if (f.defaultValue !== undefined) fieldConfig['defaultValue'] = f.defaultValue;
    if (options !== undefined) fieldConfig['options'] = options;
    if (validations !== undefined) fieldConfig['validations'] = validations;

    return fieldConfig;
  });

  const sanitizedResult: Record<string, any> = {
    formTitle,
    submitButtonLabel,
    fields,
  };

  if (formDescription !== undefined) {
    sanitizedResult['formDescription'] = formDescription;
  }

  return sanitizedResult;
}

/**
 * Sanitizes and validates raw LLM output into a strongly-typed FormConfig.
 *
 * Handles:
 * - Markdown code fences (` ```json ... ``` `)
 * - Conversational text preambles and postambles
 * - Trailing commas in JSON
 * - Envelope unwrapping (`formConfig`, `form`, `data`, etc.)
 * - HTML/script tag stripping to prevent XSS
 * - Field name sanitization to alphanumeric/underscore format (`/^[a-zA-Z0-9_]+$/`)
 * - Field type normalization (e.g. `dropdown` -> `select`, `bool` -> `checkbox`)
 * - Option array restructuring for select inputs
 * - Fallback error messages for validation rules
 * - Full schema validation against FormConfigSchema
 *
 * @param input Raw string from LLM or pre-parsed object
 * @param options Configuration options for schema, fallback, and error handling
 * @returns Strongly typed FormConfig
 * @throws LLMSanitizerError if input cannot be parsed or validated (when throwOnError is true)
 */
export function sanitizeAndValidateLLMOutput(
  input: string | unknown,
  options?: LLMSanitizerOptions
): FormConfig {
  const schema = options?.schema ?? FormConfigSchema;
  const throwOnError = options?.throwOnError ?? true;
  const sanitizeHtml = options?.sanitizeHtml ?? true;

  let extractedJson = '';
  let parsed: unknown;

  try {
    if (typeof input === 'string') {
      extractedJson = extractJsonFromLLMOutput(input);
      parsed = JSON.parse(extractedJson);
    } else if (input && typeof input === 'object') {
      parsed = input;
    } else {
      throw new LLMSanitizerError(
        'Invalid input: expected JSON string or object',
        input
      );
    }

    const sanitized = sanitizeFormConfig(parsed, sanitizeHtml);
    const result = schema.safeParse(sanitized);

    if (!result.success) {
      const issues = result.error.issues;
      const issueSummary = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new LLMSanitizerError(
        `Schema validation failed: ${issueSummary}`,
        input,
        extractedJson,
        issues
      );
    }

    return result.data as FormConfig;
  } catch (err: any) {
    if (throwOnError) {
      if (err instanceof LLMSanitizerError) {
        throw err;
      }
      throw new LLMSanitizerError(
        err.message || 'Failed to sanitize and validate LLM output',
        input,
        extractedJson
      );
    }

    return (options?.fallback ?? null) as unknown as FormConfig;
  }
}

/**
 * Non-throwing safe version of sanitizeAndValidateLLMOutput.
 *
 * Returns a discriminated SanitizeResult containing `success`, `data`, and any `error`/`issues`.
 */
export function safeSanitizeAndValidateLLMOutput(
  input: string | unknown,
  options?: Omit<LLMSanitizerOptions, 'throwOnError'>
): SanitizeResult<FormConfig> {
  try {
    const data = sanitizeAndValidateLLMOutput(input, {
      ...options,
      throwOnError: true,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (err: any) {
    const issues = err instanceof LLMSanitizerError ? err.issues : undefined;
    const rawExtractedJson = err instanceof LLMSanitizerError ? err.extractedJson : undefined;
    return {
      success: false,
      data: null,
      error: err.message || 'Sanitization and validation failed',
      rawExtractedJson,
      issues,
    };
  }
}

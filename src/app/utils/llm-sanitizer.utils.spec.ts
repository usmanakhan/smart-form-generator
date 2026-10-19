import { describe, it, expect } from 'vitest';
import {
  sanitizeAndValidateLLMOutput,
  safeSanitizeAndValidateLLMOutput,
  extractJsonFromLLMOutput,
  sanitizeString,
  LLMSanitizerError,
} from './llm-sanitizer.utils';

describe('llm-sanitizer.utils', () => {
  describe('sanitizeString', () => {
    it('should strip script tags and HTML elements', () => {
      const malicious = 'User Name <script>alert("XSS")</script> <img src=x onerror=alert(1)/>';
      expect(sanitizeString(malicious)).toBe('User Name');
    });

    it('should strip javascript: pseudo-protocols', () => {
      const input = 'javascript:void(0)';
      expect(sanitizeString(input)).toBe('');
    });

    it('should keep clean plain text intact', () => {
      expect(sanitizeString('Standard Field Label')).toBe('Standard Field Label');
    });
  });

  describe('extractJsonFromLLMOutput', () => {
    it('should extract JSON from markdown code fence', () => {
      const llmOutput = `Here is your requested form:
\`\`\`json
{
  "formTitle": "Feedback Form",
  "fields": [
    { "name": "comments", "label": "Comments", "type": "textarea" }
  ]
}
\`\`\`
Hope this helps!`;

      const extracted = extractJsonFromLLMOutput(llmOutput);
      expect(JSON.parse(extracted)).toEqual({
        formTitle: 'Feedback Form',
        fields: [{ name: 'comments', label: 'Comments', type: 'textarea' }],
      });
    });

    it('should handle code fence without language specifier', () => {
      const llmOutput = `\`\`\`
{
  "formTitle": "Simple Form",
  "fields": []
}
\`\`\``;
      const extracted = extractJsonFromLLMOutput(llmOutput);
      expect(JSON.parse(extracted).formTitle).toBe('Simple Form');
    });

    it('should remove trailing commas in JSON', () => {
      const messyJson = `{
        "formTitle": "Trailing Comma Form",
        "fields": [
          { "name": "email", "label": "Email", "type": "email", },
        ],
      }`;
      const extracted = extractJsonFromLLMOutput(messyJson);
      expect(() => JSON.parse(extracted)).not.toThrow();
    });
  });

  describe('sanitizeAndValidateLLMOutput', () => {
    it('should parse and validate a standard JSON string', () => {
      const raw = JSON.stringify({
        formTitle: 'Login Form',
        submitButtonLabel: 'Sign In',
        fields: [
          {
            name: 'username',
            label: 'Username',
            type: 'text',
            validations: [{ type: 'required', message: 'Username is required' }],
          },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            validations: [{ type: 'required', message: 'Password is required' }],
          },
        ],
      });

      const config = sanitizeAndValidateLLMOutput(raw);
      expect(config.formTitle).toBe('Login Form');
      expect(config.submitButtonLabel).toBe('Sign In');
      expect(config.fields.length).toBe(2);
      expect(config.fields[0].name).toBe('username');
    });

    it('should unwrap wrapped response envelopes', () => {
      const wrapped = JSON.stringify({
        formConfig: {
          formTitle: 'Enveloped Form',
          fields: [{ name: 'test_field', label: 'Test', type: 'text' }],
        },
      });

      const config = sanitizeAndValidateLLMOutput(wrapped);
      expect(config.formTitle).toBe('Enveloped Form');
      expect(config.fields[0].name).toBe('test_field');
    });

    it('should sanitize field names with hyphens and spaces', () => {
      const raw = JSON.stringify({
        formTitle: 'Contact Form',
        fields: [
          { name: 'first-name', label: 'First Name', type: 'text' },
          { name: 'Phone Number', label: 'Phone', type: 'text' },
        ],
      });

      const config = sanitizeAndValidateLLMOutput(raw);
      expect(config.fields[0].name).toBe('first_name');
      expect(config.fields[1].name).toBe('Phone_Number');
    });

    it('should normalize LLM field type aliases to supported types', () => {
      const raw = JSON.stringify({
        formTitle: 'Profile Form',
        fields: [
          { name: 'country', label: 'Country', type: 'dropdown', options: ['USA', 'Canada'] },
          { name: 'bio', label: 'About Me', type: 'multiline' },
          { name: 'newsletter', label: 'Subscribe', type: 'bool' },
          { name: 'full_name', label: 'Full Name', type: 'string' },
        ],
      });

      const config = sanitizeAndValidateLLMOutput(raw);
      expect(config.fields[0].type).toBe('select');
      expect(config.fields[0].options).toEqual([
        { label: 'USA', value: 'USA' },
        { label: 'Canada', value: 'Canada' },
      ]);
      expect(config.fields[1].type).toBe('textarea');
      expect(config.fields[2].type).toBe('checkbox');
      expect(config.fields[3].type).toBe('text');
    });

    it('should auto-populate validation messages when omitted by LLM', () => {
      const raw = JSON.stringify({
        formTitle: 'Validation Form',
        fields: [
          {
            name: 'email',
            label: 'Email Address',
            type: 'email',
            validations: [{ type: 'required' }, { type: 'email' }],
          },
        ],
      });

      const config = sanitizeAndValidateLLMOutput(raw);
      const validations = config.fields[0].validations!;
      expect(validations.length).toBe(2);
      expect(validations[0].message).toBe('Email Address is required');
      expect(validations[1].message).toBe('Please enter a valid email address');
    });

    it('should strip XSS injection from title and labels', () => {
      const malicious = JSON.stringify({
        formTitle: 'Safe Form <script>stealCookies()</script>',
        fields: [
          {
            name: 'safe_field',
            label: 'Your Name <img src=x onerror=alert(1)>',
            type: 'text',
          },
        ],
      });

      const config = sanitizeAndValidateLLMOutput(malicious);
      expect(config.formTitle).toBe('Safe Form');
      expect(config.fields[0].label).toBe('Your Name');
    });

    it('should throw LLMSanitizerError for unparseable input when throwOnError is true', () => {
      expect(() => {
        sanitizeAndValidateLLMOutput('This is definitely not JSON at all');
      }).toThrowError(LLMSanitizerError);
    });

    it('should return fallback when throwOnError is false and parsing fails', () => {
      const fallbackConfig = {
        formTitle: 'Fallback Form',
        submitButtonLabel: 'Submit',
        fields: [],
      };

      const result = sanitizeAndValidateLLMOutput('corrupted content', {
        throwOnError: false,
        fallback: fallbackConfig,
      });

      expect(result).toBe(fallbackConfig);
    });
  });

  describe('safeSanitizeAndValidateLLMOutput', () => {
    it('should return success true and data on valid output', () => {
      const valid = JSON.stringify({
        formTitle: 'Account Setup',
        fields: [{ name: 'account_name', label: 'Account Name', type: 'text' }],
      });

      const res = safeSanitizeAndValidateLLMOutput(valid);
      expect(res.success).toBe(true);
      expect(res.data?.formTitle).toBe('Account Setup');
      expect(res.error).toBeNull();
    });

    it('should return success false and error message on invalid input', () => {
      const invalid = 'not valid json';
      const res = safeSanitizeAndValidateLLMOutput(invalid);
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
      expect(typeof res.error).toBe('string');
    });
  });
});

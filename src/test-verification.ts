import { FormConfigSchema } from './app/form-schema';
import { sanitizeAndValidateLLMOutput } from './app/utils/llm-sanitizer.utils';

// Paste the raw string received from agy CLI
const rawAgyOutput = `{
  "formTitle": "User Profile Setup",
  "formDescription": "Complete your profile information to personalize your account experience.",
  "submitButtonLabel": "Save Profile",
  "fields": [
    {
      "name": "fullName",
      "label": "Full Name",
      "type": "text",
      "placeholder": "Enter your full name",
      "validations": {
        "required": true,
        "minLength": 2,
        "maxLength": 100
      }
    },
    {
      "name": "username",
      "label": "Username",
      "type": "text",
      "placeholder": "Choose a unique username",
      "validations": {
        "required": true,
        "minLength": 3,
        "maxLength": 30,
        "pattern": "^[a-zA-Z0-9_]+$"
      }
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "placeholder": "you@example.com",
      "validations": {
        "required": true,
        "pattern": "^[^\s@]+@[^\s@]+\.[^\s@]+$"
      }
    },
    {
      "name": "phoneNumber",
      "label": "Phone Number",
      "type": "tel",
      "placeholder": "+1 (555) 000-0000",
      "validations": {
        "required": false,
        "pattern": "^\+?[0-9\s\-()]{7,20}$"
      }
    },
    {
      "name": "dateOfBirth",
      "label": "Date of Birth",
      "type": "date",
      "placeholder": "YYYY-MM-DD",
      "validations": {
        "required": false
      }
    },
    {
      "name": "bio",
      "label": "Short Bio",
      "type": "textarea",
      "placeholder": "Tell us a little about yourself",
      "validations": {
        "required": false,
        "maxLength": 500
      }
    },
    {
      "name": "website",
      "label": "Personal Website",
      "type": "url",
      "placeholder": "https://yourwebsite.com",
      "validations": {
        "required": false,
        "pattern": "^https?://.+"
      }
    }
  ]
  }`;

try {
  const validatedConfig = sanitizeAndValidateLLMOutput(rawAgyOutput);
  console.log("✅ Verification SUCCESS: CLI output perfectly matches form-schema.ts!");
  console.log("Parsed Title:", validatedConfig.formTitle);
} catch (error) {
  console.error("❌ Verification FAILED:", (error as Error).message);
}
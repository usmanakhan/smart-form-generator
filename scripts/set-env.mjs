import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const targetPath = resolve('src/environments/environment.development.ts');
const apiKey = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

const envFileContent = `export const environment = {
    production: false,
    geminiApiKey: ${JSON.stringify(apiKey)}
};
`;

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, envFileContent, 'utf8');
console.log(`Updated ${targetPath} from environment variables.`);


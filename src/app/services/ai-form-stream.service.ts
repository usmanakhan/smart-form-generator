import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { FormConfig } from '../../form-schema';
import { sanitizeAndValidateLLMOutput } from '../utils/llm-sanitizer.utils';

@Injectable({
    providedIn: 'root'
})
export class AiFormStreamService {
    private ai = new GoogleGenAI({ apiKey: environment.geminiApiKey });

    /**
     * Streams generation chunks and attempts to yield partial or final FormConfig
     */
    streamFormConfig(userPrompt: string): Observable<{ rawText: string; config?: FormConfig }> {
        return new Observable(subscriber => {
            (async () => {
                try {
                    const responseStream = await this.ai.models.generateContentStream({
                        model: 'gemini-2.5-flash',
                        contents: `Generate a dynamic form configuration based on this description: "${userPrompt}".
You must output ONLY valid JSON without markdown code fences or commentary.
Required top-level keys: formTitle, formDescription, submitButtonLabel, fields.`,
                        config: {
                            responseMimeType: 'application/json' // Native structured JSON mode
                        }
                    });

                    let accumulatedText = '';

                    for await (const chunk of responseStream) {
                        const chunkText = chunk.text ?? '';
                        accumulatedText += chunkText;

                        // Emit raw streaming text for terminal/UI visual feedback
                        subscriber.next({ rawText: accumulatedText });
                    }

                    // Once stream ends, run through Week 1 sanitization and Zod validation
                    const validatedConfig = sanitizeAndValidateLLMOutput(accumulatedText);
                    subscriber.next({ rawText: accumulatedText, config: validatedConfig });
                    subscriber.complete();

                } catch (error) {
                    subscriber.error(error);
                }
            })();
        });
    }
}
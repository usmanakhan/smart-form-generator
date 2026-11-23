import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DynamicFormGeneratorComponent } from './components/dynamic-form-generator/dynamic-form-generator.component';
import { AiFormStreamService } from './services/ai-form-stream.service';
import { FormConfig } from './form-schema';


@Component({
  imports: [RouterOutlet, CommonModule, FormsModule, DynamicFormGeneratorComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  standalone: true,
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('smart-form-generator');
  private streamService = inject(AiFormStreamService);

  prompt = '';
  isLoading = signal(false);
  streamingRawText = signal('');
  currentConfig = signal<FormConfig | null>(null);

  generate() {
    if (!this.prompt.trim()) return;

    this.isLoading.set(true);
    this.currentConfig.set(null);
    this.streamingRawText.set('');

    this.streamService.streamFormConfig(this.prompt).subscribe({
      next: (update) => {
        this.streamingRawText.set(update.rawText);
        if (update.config) {
          this.currentConfig.set(update.config);
        }
      },
      error: (err) => {
        console.error('Streaming error:', err);
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

}

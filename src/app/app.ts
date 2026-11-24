import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormPromptControllerComponent } from './components/form-prompt-controller/form-prompt-controller.component';
import { DynamicFormGeneratorComponent } from './components/dynamic-form-generator/dynamic-form-generator.component';
import { AiFormStreamService } from './services/ai-form-stream.service';
import { FormConfig } from './form-schema';


@Component({
  imports: [RouterOutlet, CommonModule, FormsModule, FormPromptControllerComponent, DynamicFormGeneratorComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  standalone: true,
  templateUrl: './app.html',
})
export class App {
  private streamService = inject(AiFormStreamService);

  isLoading = signal(false);
  streamFeed = signal('');
  currentConfig = signal<FormConfig | null>(null);

  onGenerate(prompt: string): void {
    this.isLoading.set(true);
    this.streamFeed.set('');
    this.currentConfig.set(null);

    this.streamService.streamFormConfig(prompt).subscribe({
      next: (update) => {
        this.streamFeed.set(update.rawText);
        if (update.config) {
          this.currentConfig.set(update.config);
        }
      },
      error: (err) => {
        console.error('Generation failure:', err);
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

}

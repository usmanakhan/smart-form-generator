import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PromptPreset {
  label: string;
  icon: string;
  prompt: string;
}

@Component({
  imports: [CommonModule, FormsModule],
  standalone: true,
  selector: 'app-form-prompt-controller',
  styleUrl: './form-prompt-controller.component.css',
  templateUrl: './form-prompt-controller.component.html',
})
export class FormPromptControllerComponent {
  @Output() generateRequest = new EventEmitter<string>();

  isGenerating = false;
  userPrompt = '';

  // Presets designed to test various field types & validations
  readonly presets: PromptPreset[] = [
    {
      label: 'User Signup',
      icon: '👤',
      prompt: 'A user registration form with username, email, password, and required terms agreement checkbox.'
    },
    {
      label: 'Customer Feedback',
      icon: '⭐',
      prompt: 'A customer feedback form with full name, satisfaction level dropdown (Excellent, Good, Poor), and detailed comments textarea.'
    },
    {
      label: 'Bug Report',
      icon: '🐛',
      prompt: 'A developer bug report form with bug title, severity select dropdown, steps to reproduce textarea, and contact email.'
    },
    {
      label: 'Event RSVP',
      icon: '🎟️',
      prompt: 'An event registration form with attendee name, ticket tier selection, dietary requirements, and confirmation checkbox.'
    }
  ];

  selectPreset(presetPrompt: string): void {
    this.userPrompt = presetPrompt;
  }

  onEnterPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.triggerGenerate();
    }
  }

  triggerGenerate(): void {
    if (this.userPrompt.trim() && !this.isGenerating) {
      this.generateRequest.emit(this.userPrompt.trim());
    }
  }

}

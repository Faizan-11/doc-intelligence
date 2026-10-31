
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    if (this.password().length < 8 || this.password().length > 72) {
      this.errorMessage.set('Password must contain between 8 and 72 characters.');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.register(
      this.name().trim(),
      this.email().trim(),
      this.password(),
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isSubmitting.set(false);

        this.errorMessage.set(
          error.status === 409
            ? 'An account with this email already exists.'
            : error.status === 400
              ? 'Please check your registration details.'
              : 'Unable to create your account. Please try again.',
        );
      },
    });
  }
}

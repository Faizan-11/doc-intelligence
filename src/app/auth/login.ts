
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');

    this.isSubmitting.set(true);

    this.authService.login(
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
          error.status === 401
            ? 'Invalid email or password.'
            : 'Unable to sign in. Please try again.',
        );
      },
    });
  }
}

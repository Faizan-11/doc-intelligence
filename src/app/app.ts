
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('Document Intelligence');
  protected readonly documentCount = signal(0);

  protected incrementDocumentCount(): void {
    this.documentCount.update((count) => count + 1);
  }

  protected resetDocumentCount(): void {
    this.documentCount.set(0);
  }
}

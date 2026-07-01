import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleAuthStateService {
  readonly isAvailable = signal(true);

  markUnavailable(): void {
    this.isAvailable.set(false);
  }
}

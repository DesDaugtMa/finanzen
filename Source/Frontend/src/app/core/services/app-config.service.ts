import { Injectable, inject } from '@angular/core';
import { AppConfig } from '../models/app-config.model';
import { APP_CONFIG } from '../tokens/app-config.token';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly config = inject(APP_CONFIG);

  get settings(): AppConfig {
    return this.config;
  }

  get apiBaseUrl(): string {
    return this.config.api.baseUrl;
  }

  get googleClientId(): string {
    return this.config.api.googleClientId;
  }
}

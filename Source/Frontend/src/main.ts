import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { createAppConfig } from './app/app.config';
import { App } from './app/app';
import { AppConfig } from './app/core/models/app-config.model';

async function main(): Promise<void> {
  const suffix = isDevMode() ? '.development' : '';
  const configPath = `assets/config/appconfig${suffix}.json`;

  let config: AppConfig;
  try {
    const response = await fetch(configPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} beim Laden der Konfiguration: ${configPath}`);
    }
    config = (await response.json()) as AppConfig;
  } catch (error) {
    console.error(`[AppConfig] Konfiguration konnte nicht geladen werden: ${configPath}`, error);
    throw error;
  }

  await bootstrapApplication(App, createAppConfig(config));
}

main().catch((err) => console.error(err));

/**
 * Der Changelog, wie ihn die API liefert: gepflegt als Markdown im Projekt, vom Server
 * in Versionen zerlegt. Das Frontend baut daraus den Zeitstrahl und muss kein Markdown
 * verstehen.
 */
export interface Changelog {
  /** Jüngste veröffentlichte Version ohne führendes `v`, z. B. `1.2`. */
  currentVersion: string | null;
  /** Neueste Version zuerst. */
  entries: ChangelogEntry[];
}

export interface ChangelogEntry {
  /** Versionsnummer ohne führendes `v`, z. B. `1.2` oder `1.2.1` bei einem wichtigen Bugfix. */
  version: string;
  /** Veröffentlichungsdatum als `yyyy-MM-dd`. */
  releaseDate: string;
  /** Kurze Zusammenfassung der Version; kann leer sein. */
  summary: string;
  features: string[];
  changes: string[];
  bugfixes: string[];
}

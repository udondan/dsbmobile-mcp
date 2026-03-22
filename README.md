# DSBmobile MCP Server

Ein [MCP (Model Context Protocol)](https://modelcontextprotocol.io) Server, der KI-Assistenten den Zugriff auf [DSBmobile](https://www.dsbmobile.de) ermöglicht – die digitale Schulkommunikationsplattform, über die tausende Schulen Vertretungspläne, Neuigkeiten und Dokumente veröffentlichen.

> **Hinweis**: Dieser Server benötigt [Bun](https://bun.sh) als Laufzeitumgebung. Der DSBmobile-API-Server unterstützt kein HTTP/2, das Node.js standardmäßig verwendet. Bun löst dies ohne zusätzliche Konfiguration korrekt.

## Funktionen

- **Vertretungsplan-Übersicht** (`get_timetables`): Listet alle verfügbaren Vertretungsplan-Einträge (heute, morgen, wochenweise) mit Links zu den HTML-Planseiten auf
- **Vertretungseinträge** (`get_substitutions`): Lädt und parst die Vertretungspläne und gibt strukturierte Einträge pro Klasse zurück – filterbar nach Klasse
- **Neuigkeiten** (`get_news`): Ruft Schulnachrichten und Ankündigungen ab
- **Dokumente** (`get_documents`): Listet verfügbare Dokumente und Dateien mit Download-Links auf

## Voraussetzungen

- [Bun](https://bun.sh) (Installation: `curl -fsSL https://bun.sh/install | bash`)
- Ein gültiger DSBmobile-Account (Benutzername und Passwort)

## Schnellstart mit bunx

Keine Installation nötig – direkt mit `bunx` starten:

```bash
DSB_USERNAME=benutzername DSB_PASSWORD=passwort bunx github:udondan/dsbmobile-mcp
```

## Konfiguration mit Claude Desktop

Die folgende Konfiguration in die Claude Desktop Konfigurationsdatei eintragen:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dsbmobile": {
      "command": "bunx",
      "args": ["github:udondan/dsbmobile-mcp"],
      "env": {
        "DSB_USERNAME": "benutzername",
        "DSB_PASSWORD": "passwort",
        "DSB_CLASS": "07b" // optional
      }
    }
  }
}
```

## Konfiguration mit anderen MCP-Clients

Der Server verwendet stdio-Transport und ist mit jedem MCP-Client kompatibel, der subprocess-basierte Server unterstützt.

```json
{
  "command": "bunx",
  "args": ["github:udondan/dsbmobile-mcp"],
  "env": {
    "DSB_USERNAME": "benutzername",
    "DSB_PASSWORD": "passwort",
    "DSB_CLASS": "07b" // optional
  }
}
```

## Umgebungsvariablen

| Variable       | Pflicht | Beschreibung                                                                                                                       |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `DSB_USERNAME` | ✅      | DSBmobile-Benutzername bzw. -ID                                                                                                    |
| `DSB_PASSWORD` | ✅      | DSBmobile-Passwort                                                                                                                 |
| `DSB_CLASS`    | ❌      | Standard-Klassenfilter für `get_substitutions` (z. B. `07b`). Kann pro Aufruf über den Parameter `className` überschrieben werden. |

## Verfügbare Tools

### `get_timetables`

Gibt alle verfügbaren Vertretungsplan-Einträge zurück.

**Rückgabe**: Liste von Plan-Einträgen, jeweils mit:

- `id`: Eindeutige ID
- `title`: Planname (z. B. „V-Homepage heute - subst_001 (Seite 1)")
- `date`: Zeitstempel der letzten Aktualisierung im Format `TT.MM.JJJJ HH:MM`
- `url`: Link zur HTML-Planseite mit der Vertretungstabelle
- `previewUrl`: Link zu einem Vorschaubild (optional)

**Beispielfragen**:

- „Habe ich heute Vertretung?"
- „Was steht diese Woche im Vertretungsplan?"
- „Zeig mir den aktuellen Vertretungsplan."

### `get_substitutions`

Lädt und parst alle Vertretungsplan-Seiten und gibt strukturierte Einträge zurück.

**Parameter**:

- `className` (optional): Klassenfilter, z. B. `07b` oder `Q2_Kra`. Groß-/Kleinschreibung wird ignoriert. Standardmäßig wird `DSB_CLASS` verwendet, falls gesetzt.

**Rückgabe**: Liste von Plänen, jeweils mit:

- `title`: Planname
- `planDate`: Datum laut Plan (z. B. „20.3.2026 Freitag (Seite 1 / 8)")
- `lastUpdated`: Zeitstempel der letzten Aktualisierung
- `affectedClasses`: Kommagetrennte Liste betroffener Klassen
- `entries`: Liste der Vertretungseinträge, jeweils mit:
  - `className`: Klasse (z. B. `07b`, `Q2_Kra`)
  - `type`: Art der Vertretung (z. B. `Vertretung`, `Statt-Vertretung`, `Entfall`)
  - `period`: Stunde(n) (z. B. `3` oder `5 - 6`)
  - `originalTeacher`: Kürzel der vertretenen Lehrkraft
  - `substituteTeacher`: Kürzel der vertretenden Lehrkraft
  - `subject`: Fachkürzel (z. B. `SPO`, `ETHI`, `E`)
  - `originalRoom`: Ursprünglicher Raum
  - `substituteRoom`: Ausweichraum
  - `text`: Zusätzliche Hinweise

**Beispielfragen**:

- „Hat die 07b heute Vertretung?"
- „Wer vertritt heute Herrn Müller?"
- „Fällt die 3. Stunde aus?"

### `get_news`

Ruft alle Neuigkeiten und Ankündigungen von DSBmobile ab.

**Rückgabe**: Liste von Nachrichten, jeweils mit:

- `id`: Eindeutige ID
- `title`: Überschrift
- `detail`: Inhalt oder Link
- `date`: Veröffentlichungsdatum
- `tags`: Zugehörige Schlagwörter

### `get_documents`

Listet alle verfügbaren Dokumente und Dateien auf.

**Rückgabe**: Liste von Dokumenten, jeweils mit:

- `id`: Eindeutige ID
- `title`: Dokumentname
- `url`: Download-Link (typischerweise PDF, JPG oder PNG)
- `date`: Hochladedatum

## Entwicklung

```bash
# Repository klonen
git clone https://github.com/udondan/dsbmobile-mcp.git
cd dsbmobile-mcp

# Abhängigkeiten installieren
bun install

# Im Entwicklungsmodus starten (automatischer Neustart bei Änderungen)
DSB_USERNAME=benutzername DSB_PASSWORD=passwort bun run src/index.ts

# Bauen
bun run build

# Gebaute Version starten
DSB_USERNAME=benutzername DSB_PASSWORD=passwort bun run dist/index.js
```

## Sicherheit

- Zugangsdaten werden ausschließlich über Umgebungsvariablen übergeben und nie im Code hinterlegt
- Zugangsdaten erscheinen weder in Logs noch in Fehlermeldungen
- Es werden keine sensiblen Daten auf der Festplatte gespeichert
- Der Server ist schreibgeschützt – er kann keine Daten auf DSBmobile verändern

## Lizenz

MIT

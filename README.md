# Vibe Coding Exam

Lern-App für Studierende und Startup-Gründer:innen, die zum ersten Mal mit KI programmieren („Vibe Coding").
Nutzer:innen bearbeiten kleine Aufgaben rund um Grundbegriffe der Software-Entwicklung (README, Git, Secrets, Tests …).
Ein KI-Agent liest ihr GitHub-Repository und prüft, ob die Aufgabe erfüllt ist.

Architektur und Meilensteine: siehe [PLAN.md](PLAN.md).

## Tech-Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- PostgreSQL mit Drizzle ORM
- Registrierung und Login mit Better Auth (E-Mail + Passwort, E-Mail-Bestätigung per SMTP)
- Deutsch und Englisch mit next-intl, UI-Bausteine von shadcn/ui
- KI-Prüfung über das Vercel AI SDK gegen ein selbst gehostetes Modell (Qwen 3.6 auf vLLM, OpenAI-kompatible API)
- Hosting mit Coolify auf einem Hetzner VPS (Docker-Image, siehe [docs/deployment-coolify.md](docs/deployment-coolify.md))

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
cp .env.example .env.local   # Werte eintragen, BETTER_AUTH_SECRET erzeugen
docker compose up -d         # lokale Postgres auf Port 54335
npm run db:migrate           # Tabellen anlegen
npm run dev
npm run worker               # in einem zweiten Terminal: führt die KI-Prüfungen aus
```

Die App läuft dann auf http://localhost:3000, der Healthcheck auf http://localhost:3000/api/health.

Ohne `SMTP_HOST` werden E-Mails nicht verschickt. Die Links zum Bestätigen der E-Mail-Adresse und zum
Zurücksetzen des Passworts erscheinen dann im Terminal, in dem `npm run dev` läuft (Zeilen mit `[email]`).

## Datenbank

| Befehl | Zweck |
|---|---|
| `npm run auth:generate` | Auth-Tabellen in `src/lib/db/auth-schema.ts` neu erzeugen (nach Änderungen an `src/lib/auth.ts`) |
| `npm run db:generate` | Migration aus Schema-Änderungen erzeugen (landet in `drizzle/`) |
| `npm run db:migrate` | Offene Migrationen einspielen (im Container automatisch beim Start) |

## Aufgaben

Die Aufgaben liegen als Dateien im Ordner `tasks/` – ein Ordner pro Aufgabe:

```
tasks/
├─ modules.yaml          # Module (Gruppen auf der Startseite) und ihre Reihenfolge
└─ readme/
   ├─ task.yaml          # Metadaten, Prüfart und Kriterien (Texte auf Deutsch und Englisch)
   ├─ de.md              # Erklärtext auf Deutsch
   └─ en.md              # Erklärtext auf Englisch
```

Nach Änderungen prüft `npm run tasks:check`, ob alle Aufgaben gültig sind (Schema, beide Sprachen,
Verweise auf Module und Voraussetzungen).

## Mehrsprachigkeit

Die App ist auf Deutsch und Englisch verfügbar (next-intl, ohne Sprache in der URL). Texte stehen in
`messages/de.json` und `messages/en.json`; beide Dateien müssen dieselben Schlüssel haben. Die Sprache kommt aus
dem Cookie `locale` (Sprachumschalter oder beim Login aus dem Profil), sonst aus der Browsersprache.

## Docker-Image lokal testen

```bash
docker build -t vibe-coding-exam .
docker run -p 3000:3000 --env-file .env.local vibe-coding-exam
```

Im Container zeigt `localhost` auf den Container selbst. Für die lokale Datenbank in `DATABASE_URL`
`host.docker.internal` statt `localhost` verwenden.

## Tests

```bash
npm test             # Unit-Tests (Vitest)
npm run tasks:check  # Aufgaben-Dateien prüfen
```

## KI-Prüfung

Ablauf: Der Button „Jetzt prüfen“ legt einen Eintrag in `check_runs` an und einen Auftrag in die Warteschlange
(pg-boss, ebenfalls in Postgres). Der Worker (`src/worker`) holt den Auftrag, friert das Repo auf dem aktuellen
Commit ein und ruft den Prüfer (`src/checker`) auf: zuerst die Vorprüfungen aus `task.yaml`, die ohne KI
entscheiden, dann der Agent mit nur lesenden Werkzeugen. Ob eine Aufgabe bestanden ist, entscheidet der Code aus
den Pflicht-Kriterien, nicht das Modell.

| Befehl | Zweck |
|---|---|
| `npm run worker` | Worker lokal starten |
| `npm run check:repo -- <github-url> <task-id> [de\|en]` | Eine Prüfung ohne Warteschlange und Datenbank ausführen, gut zum Ausprobieren von Prompts |
| `npm run eval` | Modell gegen Beispiel-Repos mit bekanntem Ergebnis messen (`evals/cases.yaml`), Kriterien und Gesamtergebnis |

Das Eval-Set gehört zu jeder Änderung an Modell, Prompt oder Server-Einstellungen.

## Admin-Bereich

Unter `/admin` tragen Admins den Zugang zum KI-Modell ein und vergeben Admin-Rechte. Den ersten Admin legt dieser
Befehl fest, die Person muss schon registriert sein:

```bash
npm run admin:grant -- person@example.com
```

## LLM-Server testen

Dasselbe gibt es im Admin-Bereich als Button für die dort gespeicherten Werte; dieser Befehl testet die Umgebungsvariablen.
Prüft, ob der vLLM-Server erreichbar ist, Tool-Calling in mehreren Schritten beherrscht und JSON-Schema-Ausgaben liefert:

```bash
npm run llm:test
```

Damit Tool-Calling funktioniert, muss vLLM mit `--enable-auto-tool-choice` und dem passenden `--tool-call-parser` für Qwen 3.6 gestartet sein.

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | Postgres-Verbindung |
| `BETTER_AUTH_SECRET` | Geheimer Schlüssel für Sessions (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Öffentliche URL der App, z. B. `http://localhost:3000` |
| `SMTP_HOST`, `SMTP_PORT` | SMTP-Server für E-Mails, z. B. `smtp.ionos.de` und `587` (lokal optional) |
| `SMTP_USER`, `SMTP_PASSWORD` | Zugangsdaten des Postfachs |
| `EMAIL_FROM` | Absender, muss die Adresse des Postfachs sein, z. B. `Vibe Coding Exam <kurs@deine-domain.de>` |
| `GITHUB_TOKEN` | Optional lokal, in Produktion nötig: GitHub-Token mit Lesezugriff auf öffentliche Repos (ohne Token nur 60 Anfragen pro Stunde) |
| `SETTINGS_ENCRYPTION_KEY` | Verschlüsselt im Admin-Bereich gespeicherte Geheimnisse (`openssl rand -base64 32`). Web und Worker brauchen denselben Wert |
| `LLM_BASE_URL` | Basis-URL des vLLM-Servers inkl. `/v1`. Die drei `LLM_*`-Variablen sind die Rückfallebene, Werte aus dem Admin-Bereich haben Vorrang |
| `LLM_MODEL` | Modellname, wie ihn der Server unter `/v1/models` meldet |
| `LLM_API_KEY` | API-Key, mit dem der vLLM-Server abgesichert ist |
| `CHECK_CONCURRENCY` | Worker: Wie viele Prüfungen gleichzeitig laufen (Standard 1) |
| `APP_ROLE` | Im Docker-Image: `worker` startet den Worker statt des Web-Servers |

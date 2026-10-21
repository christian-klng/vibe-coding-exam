# Vibe Coding Exam

Lern-App für Studierende und Startup-Gründer:innen, die zum ersten Mal mit KI programmieren („Vibe Coding").
Nutzer:innen bearbeiten kleine Aufgaben rund um Grundbegriffe der Software-Entwicklung (README, Git, Secrets, Tests …).
Ein KI-Agent liest ihr GitHub-Repository und prüft, ob die Aufgabe erfüllt ist.

Architektur und Meilensteine: siehe [PLAN.md](PLAN.md).

## Tech-Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- PostgreSQL mit Drizzle ORM
- Registrierung und Login mit Better Auth (E-Mail + Passwort, E-Mail-Bestätigung)
- Deutsch und Englisch mit next-intl, UI-Bausteine von shadcn/ui
- KI-Prüfung über das Vercel AI SDK gegen ein selbst gehostetes Modell (Qwen 3.6 auf vLLM, OpenAI-kompatible API)
- Hosting auf Railway

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
cp .env.example .env.local   # Werte eintragen, BETTER_AUTH_SECRET erzeugen
docker compose up -d         # lokale Postgres auf Port 54335
npm run db:migrate           # Tabellen anlegen
npm run dev
```

Die App läuft dann auf http://localhost:3000, der Healthcheck auf http://localhost:3000/api/health.

Ohne `RESEND_API_KEY` werden E-Mails nicht verschickt. Die Links zum Bestätigen der E-Mail-Adresse und zum
Zurücksetzen des Passworts erscheinen dann im Terminal, in dem `npm run dev` läuft (Zeilen mit `[email]`).

## Datenbank

| Befehl | Zweck |
|---|---|
| `npm run auth:generate` | Auth-Tabellen in `src/lib/db/auth-schema.ts` neu erzeugen (nach Änderungen an `src/lib/auth.ts`) |
| `npm run db:generate` | Migration aus Schema-Änderungen erzeugen (landet in `drizzle/`) |
| `npm run db:migrate` | Offene Migrationen einspielen (auf Railway automatisch vor jedem Deployment) |

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

## LLM-Server testen

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
| `RESEND_API_KEY` | Optional: Versand von E-Mails über Resend |
| `EMAIL_FROM` | Absender der E-Mails |
| `LLM_BASE_URL` | Basis-URL des vLLM-Servers inkl. `/v1` |
| `LLM_MODEL` | Modellname, wie ihn der Server unter `/v1/models` meldet |
| `LLM_API_KEY` | API-Key, mit dem der vLLM-Server abgesichert ist |

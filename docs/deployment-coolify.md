# Deployment mit Coolify

Die App läuft als Docker-Image (siehe `Dockerfile`) in Coolify auf einem Hetzner VPS.
Beim Containerstart werden zuerst die Datenbank-Migrationen eingespielt, danach startet der Server.

## Vorbereitung

1. **Domain:** Lege bei deinem DNS-Anbieter einen A-Eintrag an, z. B. `exam.deine-domain.de` → IP des VPS.
2. **Secret erzeugen:** `openssl rand -base64 32` – das Ergebnis wird `BETTER_AUTH_SECRET`.
3. **GitHub-Token:** Auf GitHub unter *Settings → Developer settings → Personal access tokens → Fine-grained tokens*
   einen Token mit Zugriff auf *Public repositories (read-only)* erstellen. Ohne Token erlaubt GitHub nur
   60 Anfragen pro Stunde für den ganzen Server.
4. **E-Mail:** Bei [Resend](https://resend.com) die Absender-Domain bestätigen und einen API-Key erstellen.
   Ohne funktionierenden E-Mail-Versand können neue Nutzer ihre Adresse nicht bestätigen und sich nicht anmelden.

## 1. Projekt und Datenbank

1. In Coolify **Projects → + Add** → Name `vibe-coding-exam`, Umgebung `production`.
2. In der Umgebung **+ New → Databases → PostgreSQL** (Version 17).
3. Datenbank starten. Auf der Seite der Datenbank die **Postgres URL (internal)** kopieren –
   das wird `DATABASE_URL` der App.
4. Unter **Backups** einen täglichen Backup-Zeitplan einrichten (am besten auf S3-kompatiblen Speicher,
   z. B. Hetzner Object Storage).

Die Datenbank braucht keinen öffentlichen Port: App und Datenbank sprechen über das interne Docker-Netz.

## 2. Anwendung anlegen

1. Einmalig unter **Sources → + Add → GitHub App** die Coolify-GitHub-App installieren und ihr Zugriff auf
   `christian-klng/vibe-coding-exam` geben. Damit löst jeder Push auf `main` automatisch ein Deployment aus.
2. In der Umgebung **+ New → Applications → Private Repository (with GitHub App)** → Repository
   `vibe-coding-exam`, Branch `main`.
3. **Build Pack:** `Dockerfile` (Base Directory `/`, Dockerfile Location `/Dockerfile`).
4. **General:**
   - **Domains:** `https://exam.deine-domain.de` – Coolify holt automatisch ein Let's-Encrypt-Zertifikat.
   - **Ports Exposes:** `3000`
5. **Healthcheck:** nichts einstellen. Coolify erkennt den `HEALTHCHECK` im Dockerfile und nutzt ihn
   (prüft `/api/health` inklusive Datenbankverbindung).
6. **Pre-/Post-deployment command:** leer lassen. Die Migrationen laufen beim Containerstart.

## 3. Umgebungsvariablen

Unter **Environment Variables** eintragen. Alle Werte werden nur zur Laufzeit gebraucht –
die Option *Build Variable* bei allen **aus** lassen.

| Variable | Wert |
|---|---|
| `DATABASE_URL` | Postgres URL (internal) aus Schritt 1 |
| `BETTER_AUTH_SECRET` | Ergebnis von `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://exam.deine-domain.de` – exakt die Domain, ohne Schrägstrich am Ende |
| `GITHUB_TOKEN` | GitHub-Token aus der Vorbereitung |
| `RESEND_API_KEY` | API-Key von Resend |
| `EMAIL_FROM` | z. B. `Vibe Coding Exam <noreply@deine-domain.de>` (Domain muss bei Resend bestätigt sein) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | ab M4: Zugang zum vLLM-Server mit Qwen 3.6 |

## 4. Deployen und prüfen

1. **Deploy** klicken und das Build-Log verfolgen. Am Ende des Logs sollte `Migrations applied` stehen.
2. `https://exam.deine-domain.de/api/health` aufrufen – erwartet: `{"status":"ok","db":"ok"}`.
3. Ein Testkonto registrieren und prüfen, ob die Bestätigungs-E-Mail ankommt.

## Fehlersuche

| Problem | Ursache |
|---|---|
| Container wird „unhealthy“, `/api/health` meldet `db: unreachable` | `DATABASE_URL` falsch, oder es wurde die externe statt der internen URL eingetragen |
| Login oder Registrierung schlägt mit „Invalid origin“ fehl | `BETTER_AUTH_URL` stimmt nicht exakt mit der aufgerufenen Domain überein |
| Keine Bestätigungs-E-Mail | `RESEND_API_KEY` fehlt (dann steht der Link nur im Container-Log) oder `EMAIL_FROM` nutzt eine nicht bestätigte Domain |
| „GitHub bremst gerade zu viele Anfragen aus“ | `GITHUB_TOKEN` fehlt oder ist abgelaufen |

## Später: Worker (ab M4)

Der Prüf-Worker nutzt dasselbe Repo und dasselbe Image, aber einen eigenen Start-Befehl und keine Domain.
Er wird als zweite Anwendung in derselben Umgebung angelegt. Die genaue Einrichtung folgt mit M4.

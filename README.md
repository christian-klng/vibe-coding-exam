# Vibe Coding Exam

Lern-App für Studierende und Startup-Gründer:innen, die zum ersten Mal mit KI programmieren („Vibe Coding").
Nutzer:innen bearbeiten kleine Aufgaben rund um Grundbegriffe der Software-Entwicklung (README, Git, Secrets, Tests …).
Ein KI-Agent liest ihr GitHub-Repository und prüft, ob die Aufgabe erfüllt ist.

Architektur und Meilensteine: siehe [PLAN.md](PLAN.md).

## Tech-Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- PostgreSQL mit Drizzle ORM
- KI-Prüfung über das Vercel AI SDK gegen ein selbst gehostetes Modell (Qwen 3.6 auf vLLM, OpenAI-kompatible API)
- Hosting auf Railway

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```

Die App läuft dann auf http://localhost:3000, der Healthcheck auf http://localhost:3000/api/health.

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
| `LLM_BASE_URL` | Basis-URL des vLLM-Servers inkl. `/v1` |
| `LLM_MODEL` | Modellname, wie ihn der Server unter `/v1/models` meldet |
| `LLM_API_KEY` | API-Key, mit dem der vLLM-Server abgesichert ist |

## Worum geht es?
Nicht alles in deinem Projektordner gehört ins Repo. Die Datei **.gitignore** listet auf, welche Dateien und Ordner Git ignorieren soll – sie werden dann nie committet.

## Warum ist das wichtig?
- **Abhängigkeiten** wie `node_modules` sind riesig und lassen sich jederzeit neu installieren.
- **.env-Dateien** enthalten Passwörter und API-Keys – in einem öffentlichen Repo kann sie jeder lesen.
- **Persönliche Einstellungen** gehören nur auf deinen Rechner.

## Checkliste: Claude-Code-Dateien
Claude Code legt eigene Dateien an. So entscheidest du, was ins Repo darf:

| Datei | Ins Repo? | Warum |
|---|---|---|
| `CLAUDE.md` | ✅ ja | Projektwissen für alle, die am Projekt arbeiten |
| `.claude/settings.json` | ✅ ja | gemeinsame Einstellungen fürs Team – vorher prüfen, dass keine Keys drinstehen |
| `.claude/commands/`, `.claude/agents/` | ✅ ja | geteilte Befehle und Agenten |
| `.claude/settings.local.json` | ❌ nein | persönliche Freigaben, lokale Pfade, evtl. Tokens |
| `CLAUDE.local.md` | ❌ nein | deine persönlichen Notizen für die KI |
| `.mcp.json` mit eingetragenen Keys | ❌ nein | Keys gehören in Umgebungsvariablen |

## Tipp: So fragst du Claude Code
> „Prüf meine .gitignore. Fehlt etwas für meinen Tech-Stack oder für Claude Code? Liegen schon Dateien im Repo, die nicht hineingehören? Entferne sie aus Git, aber nicht von meinem Rechner.“

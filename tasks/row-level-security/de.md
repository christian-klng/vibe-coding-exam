## Worum geht es?
Zwei Begriffe, die oft verwechselt werden:
- **Authentifizierung:** *Wer bist du?* (Login)
- **Autorisierung:** *Was darfst du?* (Zugriffsregeln)

Viele Vibe-Coding-Apps haben einen Login, aber keine Zugriffsregeln. Dann kann jeder angemeldete Nutzer – mit etwas Geschick – die Daten aller anderen lesen. **Row-Level Security (RLS)** löst das direkt in der Datenbank: Für jede Zeile wird geprüft, ob sie zum anfragenden Nutzer gehört.

## Warum ist das wichtig?
Bei Diensten wie Supabase spricht der Browser direkt mit der Datenbank. Ohne RLS ist deine Datenbank praktisch öffentlich. Genau dieser Fehler hat schon viele KI-gebaute Apps Nutzerdaten gekostet.

## Tipp: So fragst du Claude Code
> „Prüfe alle Tabellen in meinem Projekt: Wo fehlt Row-Level Security oder eine Prüfung auf den angemeldeten Nutzer? Schreib die fehlenden Regeln als Migration und erklär mir jede in einem Satz.“

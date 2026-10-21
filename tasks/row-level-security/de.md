## Worum geht es?
Zwei Begriffe, die oft verwechselt werden:
- **Authentifizierung:** *Wer bist du?* (Login)
- **Autorisierung:** *Was darfst du?* (Zugriffsregeln)

Viele Vibe-Coding-Apps haben einen Login, aber keine Zugriffsregeln. Dann kann jeder angemeldete Nutzer – mit etwas Geschick – die Daten aller anderen lesen. **Row-Level Security (RLS)** löst das direkt in der Datenbank: Für jede Zeile wird geprüft, ob sie zum anfragenden Nutzer gehört.

## Warum ist das wichtig?
Bei Diensten wie Supabase spricht der Browser direkt mit der Datenbank. Ohne RLS ist deine Datenbank praktisch öffentlich. Genau dieser Fehler hat schon viele KI-gebaute Apps Nutzerdaten gekostet.

## So gehst du vor
1. Prüfe im Datenmodell: Welche Tabellen enthalten persönliche Daten? Haben sie ein Feld wie `user_id`?
2. Aktiviere RLS für diese Tabellen und lege Regeln an, z. B. „Nutzer dürfen nur Zeilen lesen, deren `user_id` ihrer eigenen ID entspricht“.
3. Speichere die Regeln als Migration im Repo (z. B. `supabase/migrations/…sql`).
4. Ohne Supabase: Stelle sicher, dass jeder Datenbankzugriff im Server-Code nach dem angemeldeten Nutzer filtert.
5. Teste es: Melde dich mit zwei Konten an – sieht Konto B die Daten von Konto A?

## Tipp: So fragst du Claude Code
> „Prüfe alle Tabellen in meinem Projekt: Wo fehlt Row-Level Security oder eine Prüfung auf den angemeldeten Nutzer? Schreib die fehlenden Regeln als Migration und erklär mir jede in einem Satz.“

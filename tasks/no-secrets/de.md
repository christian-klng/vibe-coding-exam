## Worum geht es?
Ein **API-Key** ist wie ein Passwort für einen Dienst (z. B. OpenAI, Stripe, Supabase). Wer ihn hat, kann den Dienst in deinem Namen nutzen – und auf deine Kosten. Keys gehören deshalb in **Umgebungsvariablen**: Werte, die außerhalb des Codes gespeichert werden, lokal in einer `.env`-Datei.

## Warum ist das wichtig?
Das ist der häufigste und teuerste Vibe-Coding-Fehler. Bots durchsuchen GitHub rund um die Uhr nach Keys – ein veröffentlichter Key wird oft innerhalb von Minuten missbraucht. **Achtung:** Einen Key nur aus der Datei zu löschen reicht nicht. In der Commit-Historie bleibt er sichtbar. Ein einmal veröffentlichter Key muss beim Anbieter **gesperrt und neu erstellt** werden.

## Tipp: So fragst du Claude Code
> „Durchsuche mein Projekt und die Git-Historie nach API-Keys, Passwörtern und Tokens. Verschiebe gefundene Werte in Umgebungsvariablen, leg eine .env.example an und sag mir, welche Keys ich beim Anbieter neu erstellen muss.“

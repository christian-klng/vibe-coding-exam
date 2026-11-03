## Worum geht es?
Deine App besteht aus zwei Teilen:
- **Client:** Code, der im Browser der Nutzer läuft. Jeder kann ihn sich ansehen (Rechtsklick → „Seitenquelltext“ oder Entwicklertools).
- **Server:** Code, der auf deinem Hosting läuft. Nutzer sehen nur das Ergebnis.

Geheime Keys dürfen **nur auf dem Server** verwendet werden. Frameworks markieren Variablen, die in den Browser dürfen, mit einem Präfix wie `NEXT_PUBLIC_` (Next.js) oder `VITE_` (Vite). Alles mit diesem Präfix ist öffentlich!

## Warum ist das wichtig?
Ein typischer Fehler: Die KI baut einen Chat mit einer KI-API und schickt die Anfrage direkt aus dem Browser – samt API-Key. Wer die Seite öffnet, kann den Key kopieren und auf deine Rechnung nutzen. Die `.gitignore` hilft hier nicht, denn der Key steckt im ausgelieferten Code.

## Tipp: So fragst du Claude Code
> „Prüfe, ob in meinem Projekt geheime Keys im Browser-Code landen können. Liste alle Umgebungsvariablen auf, sag mir, welche öffentlich und welche geheim sind, und verschiebe Aufrufe mit geheimen Keys auf den Server.“

## Worum geht es?
Deine App besteht aus zwei Teilen:
- **Client:** Code, der im Browser der Nutzer läuft. Jeder kann ihn sich ansehen (Rechtsklick → „Seitenquelltext“ oder Entwicklertools).
- **Server:** Code, der auf deinem Hosting läuft. Nutzer sehen nur das Ergebnis.

Geheime Keys dürfen **nur auf dem Server** verwendet werden. Frameworks markieren Variablen, die in den Browser dürfen, mit einem Präfix wie `NEXT_PUBLIC_` (Next.js) oder `VITE_` (Vite). Alles mit diesem Präfix ist öffentlich!

## Warum ist das wichtig?
Ein typischer Fehler: Die KI baut einen Chat mit einer KI-API und schickt die Anfrage direkt aus dem Browser – samt API-Key. Wer die Seite öffnet, kann den Key kopieren und auf deine Rechnung nutzen. Die `.gitignore` hilft hier nicht, denn der Key steckt im ausgelieferten Code.

## So gehst du vor
1. Geh alle Umgebungsvariablen durch: Welche sind geheim (Keys, Passwörter), welche dürfen öffentlich sein (z. B. die Adresse deiner App)?
2. Stell sicher, dass geheime Variablen **kein** `NEXT_PUBLIC_`- oder `VITE_`-Präfix haben.
3. Lass Aufrufe an Dienste mit geheimen Keys über eine Server-Funktion (API-Route, Server Action) laufen.
4. Prüfe die Live-Seite: Entwicklertools öffnen → Netzwerk bzw. Quellen → nach Teilen deines Keys suchen.

## Tipp: So fragst du Claude Code
> „Prüfe, ob in meinem Projekt geheime Keys im Browser-Code landen können. Liste alle Umgebungsvariablen auf, sag mir, welche öffentlich und welche geheim sind, und verschiebe Aufrufe mit geheimen Keys auf den Server.“

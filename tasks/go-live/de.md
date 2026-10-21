## Worum geht es?
Bisher läuft deine App nur auf deinem Rechner (`localhost`). Beim **Deployment** wird sie auf einen Server im Internet gebracht – zu einem **Hosting**-Anbieter wie Vercel, Railway oder Netlify. Danach hat sie eine öffentliche Adresse, die jeder aufrufen kann.

## Warum ist das wichtig?
Erst wenn echte Menschen deine App benutzen, bekommst du echtes Feedback. Viele Anbieter verbinden sich direkt mit deinem GitHub-Repo: Jeder Push auf `main` veröffentlicht automatisch die neue Version.

## So gehst du vor
1. Wähle einen Anbieter, der zu deinem Tech-Stack passt (siehe `docs/tech-stack.md`).
2. Verbinde dein GitHub-Repo und starte das erste Deployment.
3. Trage die Umgebungsvariablen beim Anbieter ein (nicht ins Repo!).
4. Öffne die Adresse und prüfe, ob alles funktioniert.
5. Schreib die URL in deine README.

## Tipp: So fragst du Claude Code
> „Hilf mir, meine App auf … zu deployen. Erklär mir jeden Schritt, sag mir, welche Umgebungsvariablen ich beim Anbieter eintragen muss, und ergänze danach die README um die Live-URL.“

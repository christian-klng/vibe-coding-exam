## Worum geht es?
Eine KI erinnert sich nicht an frühere Gespräche. **CLAUDE.md** ist eine Datei im Hauptordner deines Repos, die Claude Code zu Beginn jeder Sitzung automatisch liest. Darin steht, was die KI über dein Projekt wissen muss – ihr **Kontext**. Andere Tools nutzen dafür `AGENTS.md`.

## Warum ist das wichtig?
Ohne Kontext muss die KI jedes Mal raten: Welche Sprache, welche Bibliotheken, welche Regeln? Mit einer guten CLAUDE.md bekommst du von Anfang an Ergebnisse, die zu deinem Projekt passen – und musst nicht alles wiederholen.

## So gehst du vor
1. Lege `CLAUDE.md` im Hauptordner an.
2. Schreib hinein:
   - Was ist das Projekt? (ein, zwei Sätze, Verweis auf `docs/`)
   - Tech-Stack und wichtige Befehle (starten, testen)
   - Regeln, z. B. „Schreib Texte auf Deutsch“, „Keine API-Keys in den Code“, „Frag nach, bevor du Dateien löschst“
3. Halte sie kurz. Lieber zehn klare Zeilen als drei Seiten.

## Tipp: So fragst du Claude Code
> „Erstelle eine CLAUDE.md für dieses Projekt. Nutze die Dateien in docs/ und schlag mir Regeln vor, die für Einsteiger sinnvoll sind.“ – oder einfach der Befehl `/init`.

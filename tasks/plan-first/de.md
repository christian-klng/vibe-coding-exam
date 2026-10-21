## Worum geht es?
Der häufigste Fehler beim Vibe Coding: „Bau mir X“ – und die KI legt sofort los, oft in eine falsche Richtung. Besser: Die KI erstellt zuerst einen **Plan**, du liest ihn, korrigierst ihn, und erst dann wird gebaut. Claude Code hat dafür einen eigenen **Plan-Modus** (Umschalt+Tab).

## Warum ist das wichtig?
Einen Plan zu ändern kostet Sekunden, fertigen Code umzubauen kostet Stunden. Beim Lesen des Plans verstehst du außerdem, *wie* die KI vorgehen will – so lernst du nebenbei, wie Software aufgebaut ist.

## So gehst du vor
1. Wähle eine User Story aus `docs/user-stories.md`.
2. Starte den Plan-Modus und bitte die KI, das Feature zu planen.
3. Lies den Plan. Ist etwas unklar oder zu groß? Frag nach und lass ihn anpassen.
4. Speichere den finalen Plan in `docs/plans/`, z. B. `docs/plans/login.md`.
5. Lass die KI den Plan umsetzen und committe das Ergebnis.

## Tipp: So fragst du Claude Code
> „Plane die User Story ‚…‘. Schreib den Plan nach docs/plans/<name>.md mit Ziel, betroffenen Dateien und Schritten. Fang noch nicht an zu programmieren.“

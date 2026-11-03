## Worum geht es?
Fast jede App speichert Daten: Nutzer, Beiträge, Termine … Ein **Datenmodell** beschreibt, welche **Tabellen** es gibt, welche **Felder** (Spalten) sie haben und welche **Beziehungen** zwischen ihnen bestehen.

Beispiel: Ein *Nutzer* (Name, E-Mail) hat viele *Lernpläne* (Titel, Prüfungsdatum), und jeder Lernplan hat viele *Tagesziele*.

## Warum ist das wichtig?
Das Datenmodell ist schwer nachträglich zu ändern – sobald echte Daten drin sind, wird jede Umstellung aufwendig. Wenn du es vorher festlegst, baut die KI eine passende Datenbank, statt bei jedem Feature neue Tabellen zu erfinden.

## Tipp: So fragst du Claude Code
> „Leite aus docs/user-stories.md ein Datenmodell ab. Erklär mir jede Tabelle in einfachen Worten und zeichne ein Mermaid-ER-Diagramm in docs/datenmodell.md.“

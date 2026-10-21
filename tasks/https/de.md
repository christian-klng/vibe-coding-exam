## Worum geht es?
**HTTPS** verschlüsselt die Verbindung zwischen Browser und Server. Ohne Verschlüsselung können Dritte – etwa im öffentlichen WLAN – mitlesen, was übertragen wird, auch Passwörter. Für die Verschlüsselung braucht der Server ein **SSL/TLS-Zertifikat**, das beweist, dass er wirklich zu deiner Domain gehört. Das Schloss-Symbol im Browser zeigt: alles in Ordnung.

## Warum ist das wichtig?
Browser markieren Seiten ohne HTTPS als „nicht sicher“, viele Funktionen (z. B. Login-Cookies, Kamera, Standort) funktionieren nur mit HTTPS, und Suchmaschinen bevorzugen verschlüsselte Seiten.

## So gehst du vor
1. Öffne deine Live-URL. Steht `https://` davor und zeigt der Browser ein Schloss?
2. Ruf die Adresse mit `http://` auf – wirst du automatisch auf `https://` weitergeleitet?
3. Die meisten Hosting-Anbieter erledigen beides automatisch. Bei einer eigenen Domain musst du sie beim Anbieter eintragen und die DNS-Einstellungen anpassen; das Zertifikat wird dann meist kostenlos erstellt (z. B. über Let's Encrypt).
4. Achte darauf, dass in der README die `https://`-Adresse steht.

## Tipp: So fragst du Claude Code
> „Prüfe mit curl, ob meine App unter https://… ein gültiges Zertifikat hat und ob http:// auf https:// weiterleitet. Erklär mir das Ergebnis in einfachen Worten.“

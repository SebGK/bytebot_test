# Sicherheitsüberblick

## Sicherheitsauffälligkeiten
- Offen exponierte Ports (Agent 9991, Desktop 9990, Postgres 5432, UI 9992) ohne Zugriffsbegrenzung
- Standard‑ oder schwache Zugangsdaten (z. B. `postgres/postgres`)
- Fehlende Authentifizierung und CORS‑Beschränkung für Agent‑ und Desktop‑APIs
- Proxy‑Weiterleitungen zu internen Diensten ohne Authentifizierung
- Unsichere Container‑Konfiguration (privilegierter Desktop‑Container, `root`‑Nutzer)
- Verwendung ungeprüfter Paketquellen und `curl`‑Installationen im Dockerfile
- Bekannte Schwachstellen in Abhängigkeiten (z. B. Next.js)

## Maßnahmenplan
1. **Netzwerkabschottung**
   - Externe Portfreigaben minimieren und Dienste nur intern bzw. über VPN/Firewall erreichbar machen.
   - Starke, individuelle Postgres‑Credentials erzwingen und Port 5432 nur intern freigeben.
2. **Authentifizierung & Autorisierung**
   - Für UI, Agent‑API und VNC/WebSocket zwingende Authentifizierung (OAuth2, API‑Keys, JWT) einführen.
   - CORS auf vertrauenswürdige Domains beschränken.
3. **Transportverschlüsselung**
   - TLS für alle HTTP/WS‑Verbindungen mittels Reverse‑Proxy (z. B. Nginx, Traefik) erzwingen.
4. **Container‑Härtung**
   - `privileged` entfernen, Container als nicht‑privilegierten Benutzer starten und nur notwendige Capabilities vergeben.
   - Downloads im Dockerfile versionieren und deren Integrität prüfen.
5. **Proxy‑Absicherung**
   - Proxy‑Endpunkte nur für authentifizierte Benutzer freischalten und ggf. zusätzliche ACLs einsetzen.
6. **Abhängigkeits‑Management**
   - Regelmäßige Updates und Sicherheits‑Scans (`npm audit`, Image‑Scanning) integrieren.
7. **Eingabe‑Validierung & Logging**
   - Globale Validierungspipes aktivieren, sicherheitsrelevante Ereignisse loggen und Rate‑Limiting einsetzen.
8. **Secret‑Handling**
   - API‑Keys und Secrets in Secret‑Managern oder verschlüsselten `.env`‑Dateien verwalten.
9. **Betrieb & Monitoring**
   - Firewall‑Regeln, IDS/IPS und System‑Updates automatisieren sowie regelmäßige Penetrationstests durchführen.

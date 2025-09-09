# Security

Dieser Maßnahmenplan dokumentiert bekannte Sicherheitsrisiken und deren Status.

## Maßnahmenplan

| Risiko | Maßnahme | Status |
| --- | --- | --- |
| Express sendet den Header `X-Powered-By` und verrät die eingesetzte Technologie. | Header im Server deaktivieren, um Informationsoffenlegung zu vermeiden. | ✅ erledigt (alle Dienste) |
| APIs akzeptieren Anfragen ohne Authentifizierung und erlauben beliebige Origins. | API-Key-Prüfung und konfigurierbare CORS-Liste implementiert. | ✅ erledigt |
| Fehlende Rate-Limits und Eingabevalidierung ermöglichen Denial-of-Service und unsichere Eingaben. | In-memory-Rate-Limiter und globale Validation Pipes aktiviert. | ✅ erledigt |
| Desktop-Container läuft privilegiert und UI-Port ist extern erreichbar. | Privileged-Mode entfernt und UI-Port an `127.0.0.1` gebunden. | ✅ erledigt |
| Postgres wird mit Standard-Credentials gestartet. | Zwingende Angabe eines starken `POSTGRES_PASSWORD` im Compose-File. | ✅ erledigt |

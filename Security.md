# Security

Dieser Maßnahmenplan dokumentiert bekannte Sicherheitsrisiken und deren Status.

## Maßnahmenplan

| Risiko | Maßnahme | Status |
| --- | --- | --- |
| Express sendet den Header `X-Powered-By` und verrät die eingesetzte Technologie. | Header im Server deaktivieren, um Informationsoffenlegung zu vermeiden. | ✅ erledigt (alle Dienste) |

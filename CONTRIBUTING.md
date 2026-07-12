# Mitwirken

## Branches

- `main` ist geschützt, jederzeit releasefähig und entspricht dem veröffentlichten Produktionsstand.
- Jede Änderung entsteht in einem kurzen Branch wie `feat/navigation`, `fix/mobile-menu` oder `chore/dependencies`.
- Pull Requests zielen direkt auf `main`, müssen das vollständige Quality Gate bestehen und werden per Squash gemergt.

Commits und Pull Requests auf Feature-Branches lösen kein Deployment aus. Erst
der Squash-Merge nach `main` veröffentlicht genau einen geprüften Stand über
GitHub Pages. Mehrere Änderungen können bei Bedarf vor dem Merge in einem
gemeinsamen Release-Branch gesammelt werden; ein dauerhafter Integrationsbranch
ist dafür nicht nötig.

Reine Änderungen an Dokumentation, Tests, Lint-Konfiguration oder dem
CI-Workflow werden auf `main` gespeichert, lösen aber kein Pages-Deployment aus.

## Lokale Qualitätssicherung

```bash
npm ci
npm run check
npm run test:e2e
```

Für Playwright werden einmalig die Browser benötigt:

```bash
npx playwright install chromium webkit
```

## Definition of Done

- Die Änderung funktioniert ab 320 Pixel Viewport-Breite.
- Alle Funktionen sind per Tastatur erreichbar.
- Informationen werden nicht ausschließlich über Farbe oder Bewegung vermittelt.
- Reduzierte Bewegung wird respektiert.
- Automatisierte Tests und Dokumentation wurden angepasst.
- Es werden keine personenbezogenen Daten oder Secrets eingecheckt.

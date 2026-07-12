# Mitwirken

## Branches

- `main` ist der veröffentlichte Produktionsstand.
- `develop` sammelt geprüfte Änderungen vor dem Release.
- Größere Änderungen entstehen optional in kurzen Branches wie `feat/navigation` und werden zunächst nach `develop` gemergt.

Ein Pull Request von `develop` nach `main` wird als Squash-Merge übernommen und löst genau ein Pages-Deployment aus.

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

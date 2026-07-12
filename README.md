# Anonymisierte Portfolio-Vorschau

Mobile-first Portfolio mit Vite, Vanilla TypeScript, lokal gebündelten Fonts und automatisierter WCAG-, Browser- und Performance-Qualitätssicherung.

## Voraussetzungen

- Node.js 22 (`.nvmrc`)
- npm 10 oder neuer

## Entwicklung

```bash
npm ci
npm run dev
```

Vite zeigt die lokale URL im Terminal an und aktualisiert Änderungen per HMR.

## Qualitätssicherung

```bash
npm run check
npm run test:e2e
npm run lighthouse
```

`npm run check` prüft Formatierung, TypeScript, JavaScript, CSS, Unit-Tests, den Produktionsbuild und die gzip-Budgets. Playwright testet Chromium und WebKit in mobilen und Desktop-Viewports; axe prüft zentrale WCAG-A/AA-Regeln.

Details zu Struktur und Qualitätsprinzipien stehen in [`docs/architecture.md`](docs/architecture.md), der Entwicklungsablauf in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deployment

Der Branch `develop` dient der Entwicklung. Ein Squash-Merge nach `main` startet `.github/workflows/deploy.yml` und veröffentlicht ausschließlich das von Vite erzeugte `dist/`-Artefakt auf GitHub Pages.

## Vor Veröffentlichung anpassen

- In `index.html` die Platzhalter-E-Mail `kontakt@example.com` ersetzen.
- Projekttexte und Technologien bei Bedarf konkretisieren.
- Keine personenbezogenen Daten oder Secrets einchecken.

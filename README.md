# Anonymisierte Portfolio-Vorschau

Mobile-first Portfolio mit Vite, Vanilla TypeScript, lokal gebündelten Fonts und automatisierter WCAG-, Browser- und Performance-Qualitätssicherung.

Die dargestellten Projektsituationen sind bewusst anonymisiert und verzichten auf Kundennamen, personenbezogene Angaben und unbelegte Kennzahlen.

Canonical URL, Open Graph, Twitter Card, strukturierte Website-Daten, Sitemap und Social-Preview sind auf die öffentliche GitHub-Pages-Adresse abgestimmt und enthalten keine personenbezogenen Angaben.

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

`npm run check` prüft Formatierung, TypeScript, JavaScript, CSS, Unit-Tests, den Produktionsbuild und die gzip-Budgets. Playwright testet Chromium und WebKit in mobilen und Desktop-Viewports, einschließlich eines kompakten 320-Pixel-iPhone-Viewports und eines kurzen Querformats. Die Browser-Suite prüft außerdem Tastaturfokus, Reflow, reduzierte Bewegung und erzwungene Systemfarben; axe prüft zentrale WCAG-A/AA-Regeln.

Vitest prüft neben der reinen Bewegungslogik auch alle Controller-Lifecycles in einer isolierten DOM-Umgebung. Dabei werden insbesondere Listener, Observer, Timer, Animation Frames und kurzlebige Zustände nach `destroy()` kontrolliert.

Die Browser-Suite enthält deterministische visuelle Regressionstests in mobilem
und Desktop-Chromium. WebKit bleibt funktional abgedeckt, weil kontinuierliche
Compositor-Effekte dort keine stabilen Pixel-Baselines ergeben. Neue
Referenzbilder werden bewusst geprüft und mit
`npx playwright test tests/e2e/portfolio.visual.spec.ts --update-snapshots`
aktualisiert; normale Testläufe überschreiben sie nicht.

Lighthouse bewertet drei Läufe anhand ihres Medians. Accessibility, Best Practices, SEO, LCP und CLS sind harte Gates. Performance-Score und TBT werden auf den wechselnden GitHub-Runnern als Trendwerte protokolliert; harte CPU-Budgets setzen eine kontrollierte Runner-Umgebung voraus.

Bei fehlgeschlagenen Browser- oder Lighthouse-Prüfungen stellt das Quality Gate die zugehörigen Berichte, Screenshots und Traces sieben Tage lang als Diagnose-Artefakte bereit. Erfolgreiche Läufe erzeugen keine zusätzlichen Uploads.

Details zu Struktur und Qualitätsprinzipien stehen in [`docs/architecture.md`](docs/architecture.md), der Entwicklungsablauf in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deployment

Änderungen entstehen in kurzlebigen Feature-Branches und gelangen ausschließlich
über geprüfte Pull Requests nach `main`. Ein Squash-Merge nach `main` startet
`.github/workflows/deploy.yml` und veröffentlicht ausschließlich das von Vite
erzeugte `dist/`-Artefakt auf GitHub Pages.

Nach dem Pages-Deployment prüft ein eigener Smoke-Test die veröffentlichte HTML-Struktur sowie Favicon, Touch-Icon, Social-Preview, Robots-Datei und Sitemap direkt über die produktive URL.

## Vor Veröffentlichung anpassen

- In `index.html` die Platzhalter-E-Mail `kontakt@example.com` ersetzen.
- Projekttexte und Technologien bei Bedarf konkretisieren.
- Keine personenbezogenen Daten oder Secrets einchecken.

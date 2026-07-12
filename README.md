# Anonymisierte Portfolio-Vorschau

Mobile-first Portfolio mit Vite, Vanilla TypeScript und gebündeltem CSS.

## Entwicklung

Voraussetzung: Node.js 22 oder neuer.

```bash
npm ci
npm run dev
```

Vite zeigt die lokale URL im Terminal an und aktualisiert Änderungen per HMR.

## Qualitätssicherung

```bash
npm run typecheck
npm run build
npm run preview
```

Der Produktionsbuild wird nach `dist/` geschrieben. Vite versieht JavaScript
und CSS automatisch mit Content-Hashes.

## Deployment

Der Branch `develop` dient der Entwicklung. Ein Squash-Merge nach `main`
startet `.github/workflows/deploy.yml`, prüft TypeScript, baut die Seite und
veröffentlicht das `dist/`-Artefakt auf GitHub Pages.

## Vor Veröffentlichung anpassen

- In `index.html` die Platzhalter-E-Mail `kontakt@example.com` ersetzen.
- Projekttexte und Technologien bei Bedarf konkretisieren.

Die Seite verwendet Google Fonts. Für einen vollständig lokalen Betrieb können
die Schriften heruntergeladen und selbst eingebunden werden.

# Architektur

## Leitlinien

Das Portfolio nutzt Vite und Vanilla TypeScript. Die Seite bleibt bewusst frameworkfrei: Semantisches HTML liefert die Grundfunktion, CSS gestaltet sie und TypeScript ergänzt progressive Interaktionen.

## Module

- `src/main.ts` bindet Fonts und Styles ein und startet die Anwendung.
- `src/portfolio-app.ts` komponiert kleine Controller und garantiert deren geordneten Lifecycle.
- `src/features/` trennt Navigation, Ansichtsmodus, Seitenfortschritt, Pointer-Effekte, Viewport-Observer und den interaktiven Systemkern.
- `src/motion/` enthält reine, unabhängig testbare Bewegungs- und Koordinatenlogik.
- `src/styles/` trennt Fundament, Theme und progressive Experience-Layer.
- `tests/e2e/` prüft reale mobile und Desktop-Browserzustände.

Jeder Controller implementiert `init()` und `destroy()`, besitzt seine Listener und räumt sie selbstständig auf. Abhängigkeiten werden als kleine Callbacks injiziert, statt Controller über globale Zustände miteinander zu koppeln. Mathematische oder zustandsbasierte Logik bleibt frei von DOM-Zugriffen und wird mit Vitest getestet.

Die Controller-Lifecycles werden zusätzlich in einer isolierten DOM-Umgebung geprüft. Die Tests sichern sichtbares Verhalten sowie das Entfernen von Listenern, Observern, Timern, Animation Frames und kurzlebigen CSS-Zuständen beim Aufräumen ab.

## Accessibility

- Mobile-first und WCAG 2.2 AA sind Mindeststandard.
- Automatisierte axe-Tests decken häufige Probleme ab.
- Tastatur, Fokusführung, Zoom, Kontrast und Screenreader werden zusätzlich manuell geprüft.
- Bewegungen besitzen eine funktionale Variante für `prefers-reduced-motion`.

## Deployment

Pull Requests führen das vollständige Quality Gate aus. Nur ein Merge nach `main` startet den Pages-Workflow. Veröffentlicht wird ausschließlich das von Vite erzeugte `dist/`-Artefakt.

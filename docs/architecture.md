# Architektur

## Leitlinien

Das Portfolio nutzt Vite und Vanilla TypeScript. Die Seite bleibt bewusst frameworkfrei: Semantisches HTML liefert die Grundfunktion, CSS gestaltet sie und TypeScript ergänzt progressive Interaktionen.

## Module

- `src/main.ts` bindet Fonts und Styles ein und startet die Anwendung.
- `src/app-context.ts` löst zentral den Web-/Pages- oder Embedded-Kontext auf und stellt ihn als `data-app-context` bereit.
- `src/app-lifecycle.ts` besitzt den Seiten-Lifecycle und räumt die App beim Entfernen des iframe über `pagehide` auf.
- `src/portfolio-app.ts` komponiert kleine Controller und garantiert deren geordneten Lifecycle.
- `src/features/` trennt Navigation, Ansichtsmodus, Seitenfortschritt, Pointer-Effekte, Viewport-Observer und den interaktiven Systemkern.
- `src/motion/` enthält reine, unabhängig testbare Bewegungs- und Koordinatenlogik.
- `src/styles/` trennt Fundament, Theme und progressive Experience-Layer.
- `tests/e2e/` prüft reale mobile und Desktop-Browserzustände.

Jeder Controller implementiert `init()` und `destroy()`, besitzt seine Listener und räumt sie selbstständig auf. Abhängigkeiten werden als kleine Callbacks injiziert, statt Controller über globale Zustände miteinander zu koppeln. Mathematische oder zustandsbasierte Logik bleibt frei von DOM-Zugriffen und wird mit Vitest getestet.

Die Controller-Lifecycles werden zusätzlich in einer isolierten DOM-Umgebung geprüft. Die Tests sichern sichtbares Verhalten sowie das Entfernen von Listenern, Observern, Timern, Animation Frames und kurzlebigen CSS-Zuständen beim Aufräumen ab.

## Web- und Embedded-Build

Die mode-abhängige Vite-Konfiguration erzeugt aus derselben Quelle zwei klar
getrennte Artefakte:

- Der normale Build nutzt `/portfolio/`, schreibt nach `dist/` und wird auf
  GitHub Pages veröffentlicht.
- Der Embedded-Build nutzt `./`, schreibt nach `dist-embedded/` und ist für eine
  spätere versionsfixierte, vollständig lokale Einbettung im ki-node Hub gedacht.

Komponenten prüfen den Build-Modus nicht selbst. `src/app-context.ts` bildet die
zentrale Laufzeitgrenze. Öffentliche Links und `mailto:` behalten vorerst ihren
Browser-Fallback. Eine spätere versionierte Hub-Bridge für externe Links und
native Funktionen wird an dieser Grenze als eigener Adapter ergänzt und in die
Controller injiziert; sie ist nicht Teil dieses Pull Requests.

## Accessibility

- Mobile-first und WCAG 2.2 AA sind Mindeststandard.
- Automatisierte axe-Tests decken häufige Probleme ab.
- Tastatur, Fokusführung, Zoom, Kontrast und Screenreader werden zusätzlich manuell geprüft.
- Bewegungen besitzen eine funktionale Variante für `prefers-reduced-motion`.

## Deployment

Pull Requests führen das vollständige Quality Gate einschließlich beider Builds aus. Nur ein Merge nach `main` startet den Pages-Workflow. Veröffentlicht wird ausschließlich das normale, von Vite erzeugte `dist/`-Artefakt; `dist-embedded/` bleibt ein lokales Integrationsartefakt.

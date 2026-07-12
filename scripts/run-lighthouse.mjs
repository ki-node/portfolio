import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

const url = 'http://127.0.0.1:4173/portfolio/';
const artifactDirectory = new URL('../artifacts/lighthouse/', import.meta.url);
const server = await preview({
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});

let chrome;

const median = (values) => {
  const sortedValues = [...values].sort((a, b) => a - b);

  return sortedValues[Math.floor(sortedValues.length / 2)];
};

/** Writes complete Lighthouse reports and a compact summary for CI diagnostics. */
const writeDiagnostics = async (reports, summary) => {
  await mkdir(artifactDirectory, { recursive: true });
  await Promise.all(
    reports.map((report, index) =>
      writeFile(
        new URL(`run-${index + 1}.json`, artifactDirectory),
        `${JSON.stringify(report, null, 2)}\n`,
      ),
    ),
  );
  await writeFile(
    new URL('summary.json', artifactDirectory),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
};

try {
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  const reports = [];

  for (let run = 1; run <= 3; run += 1) {
    const result = await lighthouse(
      url,
      {
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        output: 'json',
        port: chrome.port,
      },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          screenEmulation: { disabled: true },
        },
      },
    );

    if (!result) {
      throw new Error(`Lighthouse run ${run} returned no result.`);
    }

    reports.push(result.lhr);
    console.log(`Lighthouse run ${run}/3 completed.`);
  }

  const thresholds = new Map([
    ['accessibility', 1],
    ['best-practices', 0.95],
    ['seo', 0.95],
  ]);
  const failures = [];

  for (const [category, minimum] of thresholds) {
    const score = median(reports.map((report) => report.categories[category]?.score ?? 0));

    console.log(`${category}: ${Math.round(score * 100)} / ${Math.round(minimum * 100)}`);

    if (score < minimum) {
      failures.push(`${category} ${Math.round(score * 100)} < ${Math.round(minimum * 100)}`);
    }
  }

  const performanceScore = median(
    reports.map((report) => report.categories.performance?.score ?? 0),
  );

  console.log(`performance: ${Math.round(performanceScore * 100)} / 90 advisory target`);

  const auditMedian = (auditId) =>
    median(
      reports.map((report) => report.audits[auditId]?.numericValue ?? Number.POSITIVE_INFINITY),
    );
  const cls = auditMedian('cumulative-layout-shift');
  const lcp = auditMedian('largest-contentful-paint');
  const totalBlockingTime = auditMedian('total-blocking-time');

  console.log(`CLS: ${cls.toFixed(3)} / 0.100`);
  console.log(`LCP: ${Math.round(lcp)} ms / 2500 ms`);
  console.log(`TBT: ${Math.round(totalBlockingTime)} ms / 150 ms advisory target`);

  await writeDiagnostics(reports, {
    generatedAt: new Date().toISOString(),
    url,
    medians: {
      performance: performanceScore,
      accessibility: median(reports.map((report) => report.categories.accessibility?.score ?? 0)),
      bestPractices: median(
        reports.map((report) => report.categories['best-practices']?.score ?? 0),
      ),
      seo: median(reports.map((report) => report.categories.seo?.score ?? 0)),
      cls,
      lcp,
      totalBlockingTime,
    },
  });

  if (cls > 0.1) {
    failures.push(`CLS ${cls.toFixed(3)} > 0.100`);
  }

  if (lcp > 2500) {
    failures.push(`LCP ${Math.round(lcp)} ms > 2500 ms`);
  }

  if (failures.length > 0) {
    throw new Error(`Lighthouse budgets failed:\n- ${failures.join('\n- ')}`);
  }
} finally {
  await chrome?.kill();
  await server.close();
}

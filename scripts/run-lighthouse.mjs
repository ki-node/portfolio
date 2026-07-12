import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

const url = 'http://127.0.0.1:4173/portfolio/';
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
    ['performance', 0.9],
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

  const auditMedian = (auditId) =>
    median(
      reports.map((report) => report.audits[auditId]?.numericValue ?? Number.POSITIVE_INFINITY),
    );
  const cls = auditMedian('cumulative-layout-shift');
  const lcp = auditMedian('largest-contentful-paint');
  const totalBlockingTime = auditMedian('total-blocking-time');

  console.log(`CLS: ${cls.toFixed(3)} / 0.100`);
  console.log(`LCP: ${Math.round(lcp)} ms / 2500 ms`);
  console.log(`TBT: ${Math.round(totalBlockingTime)} ms / 150 ms`);

  if (cls > 0.1) {
    failures.push(`CLS ${cls.toFixed(3)} > 0.100`);
  }

  if (lcp > 2500) {
    failures.push(`LCP ${Math.round(lcp)} ms > 2500 ms`);
  }

  if (totalBlockingTime > 150) {
    failures.push(`TBT ${Math.round(totalBlockingTime)} ms > 150 ms`);
  }

  if (failures.length > 0) {
    throw new Error(`Lighthouse budgets failed:\n- ${failures.join('\n- ')}`);
  }
} finally {
  await chrome?.kill();
  await server.close();
}

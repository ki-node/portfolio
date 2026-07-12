import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const budgets = new Map([
  ['.css', 35 * 1024],
  ['.js', 15 * 1024],
]);

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const assets = await readdir(assetsDirectory);
const failures = [];

for (const asset of assets) {
  const extension = path.extname(asset);
  const budget = budgets.get(extension);

  if (!budget) {
    continue;
  }

  const content = await readFile(new URL(asset, assetsDirectory));
  const compressedBytes = gzipSync(content).byteLength;
  const compressedKilobytes = (compressedBytes / 1024).toFixed(2);
  const budgetKilobytes = (budget / 1024).toFixed(0);

  console.log(`${asset}: ${compressedKilobytes} KiB gzip / ${budgetKilobytes} KiB budget`);

  if (compressedBytes > budget) {
    failures.push(asset);
  }
}

if (failures.length > 0) {
  throw new Error(`Bundle budget exceeded: ${failures.join(', ')}`);
}

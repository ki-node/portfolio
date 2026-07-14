import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const pagesDirectory = path.join(repositoryRoot, 'dist');
const embeddedDirectory = path.join(repositoryRoot, 'dist-embedded');
const nestedEmbeddedUrl = new URL('https://local.invalid/projects/portfolio/index.html');

const readOutput = (directory, file = 'index.html') => readFile(path.join(directory, file), 'utf8');

const isExternalReference = (reference) =>
  /^(?:[a-z]+:|\/\/|#)/iu.test(decodeURIComponent(reference));

const extractHtmlAssetReferences = (html) =>
  [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/giu)]
    .map((match) => match[1])
    .filter((reference) => reference && !isExternalReference(reference));

const assertFileExists = async (file, message) => {
  await assert.doesNotReject(access(file), message);
};

const collectTextAssets = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTextAssets(entryPath)));
    } else if (/\.(?:css|html|js)$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
};

const pagesHtml = await readOutput(pagesDirectory);
const embeddedHtml = await readOutput(embeddedDirectory);

assert.match(pagesHtml, /href="\/portfolio\/icon\.svg"/u);
assert.match(pagesHtml, /href="\/portfolio\/apple-touch-icon\.png"/u);
assert.match(pagesHtml, /href="https:\/\/ki-node\.github\.io\/portfolio\/"/u);
assert.match(pagesHtml, /content="https:\/\/ki-node\.github\.io\/portfolio\/social-preview\.png"/u);

const embeddedReferences = extractHtmlAssetReferences(embeddedHtml);

assert.ok(embeddedReferences.length > 0, 'Embedded HTML must reference local build assets.');

for (const reference of embeddedReferences) {
  assert.ok(!reference.startsWith('/'), `Embedded asset must be relative: ${reference}`);

  const resolvedUrl = new URL(reference, nestedEmbeddedUrl);
  assert.ok(
    resolvedUrl.pathname.startsWith('/projects/portfolio/'),
    `Embedded asset escapes its arbitrary mount path: ${reference}`,
  );

  const localPath = path.resolve(
    embeddedDirectory,
    decodeURIComponent(reference.split(/[?#]/u)[0] ?? ''),
  );
  await assertFileExists(localPath, `Missing embedded asset: ${reference}`);
}

const embeddedTextAssets = await collectTextAssets(embeddedDirectory);
const localPortfolioPath = /(^|["'(=:\s])\/portfolio\//u;

for (const file of embeddedTextAssets) {
  const content = await readFile(file, 'utf8');
  const relativeFile = path.relative(embeddedDirectory, file);

  assert.doesNotMatch(
    content,
    localPortfolioPath,
    `Embedded output still depends on /portfolio/: ${relativeFile}`,
  );

  if (path.extname(file) !== '.css') {
    continue;
  }

  assert.doesNotMatch(
    content,
    /url\(["']?(?:https?:|\/\/)/iu,
    `Embedded CSS must not load assets from the network: ${relativeFile}`,
  );

  const cssReferences = [...content.matchAll(/url\(["']?([^"')]+)["']?\)/giu)]
    .map((match) => match[1])
    .filter((reference) => reference && !isExternalReference(reference));

  for (const reference of cssReferences) {
    assert.ok(!reference.startsWith('/'), `Embedded CSS asset must be relative: ${reference}`);
    await assertFileExists(
      path.resolve(path.dirname(file), decodeURIComponent(reference.split(/[?#]/u)[0] ?? '')),
      `Missing embedded CSS asset: ${reference}`,
    );
  }
}

assert.doesNotMatch(
  embeddedHtml,
  /<(?:audio|iframe|img|script|source|video)\b[^>]*\bsrc=["']https?:/iu,
  'Embedded output must not load runtime resources from the network.',
);
assert.doesNotMatch(
  embeddedHtml,
  /<link\b[^>]*\brel=["'](?:modulepreload|preload|stylesheet)["'][^>]*\bhref=["']https?:/iu,
  'Embedded output must not load styles or preloads from the network.',
);

console.log('Pages and embedded build outputs use valid, context-appropriate asset paths.');

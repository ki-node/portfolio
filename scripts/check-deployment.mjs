const siteUrl = process.env.SITE_URL;
const attempts = 12;
const retryDelayMs = 5_000;
const requestTimeoutMs = 15_000;
const requiredHtmlMarkers = ['data-menu-button', 'application/ld+json', 'social-preview.png'];
const requiredAssets = [
  'icon.svg',
  'apple-touch-icon.png',
  'social-preview.png',
  'robots.txt',
  'sitemap.xml',
];

if (!siteUrl) {
  throw new Error('SITE_URL is required for the deployment smoke test.');
}

const baseUrl = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);

/** Waits before retrying an eventually consistent deployment. */
const delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/** Fetches one deployment resource with a strict timeout and cache bypass. */
const fetchResource = async (path) => {
  const url = new URL(path, baseUrl);
  url.searchParams.set('smoke', Date.now().toString());

  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}.`);
  }

  return response;
};

/** Verifies the deployed HTML and every critical public asset. */
const verifyDeployment = async () => {
  const html = await (await fetchResource('./')).text();

  for (const marker of requiredHtmlMarkers) {
    if (!html.includes(marker)) {
      throw new Error(`Deployed HTML is missing ${marker}.`);
    }
  }

  await Promise.all(requiredAssets.map((asset) => fetchResource(asset)));
};

let lastError;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await verifyDeployment();
    console.log(`Deployment smoke test passed for ${baseUrl.href}`);
    lastError = undefined;
    break;
  } catch (error) {
    lastError = error;

    if (attempt < attempts) {
      console.warn(`Deployment check ${attempt}/${attempts} failed; retrying.`);
      await delay(retryDelayMs);
    }
  }
}

if (lastError) {
  throw lastError;
}

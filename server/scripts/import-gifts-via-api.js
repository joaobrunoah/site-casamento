/**
 * Imports gifts through Nest API endpoint.
 *
 * Works with local or production API:
 * - API_BASE_URL=http://127.0.0.1:8080 node scripts/import-gifts-via-api.js
 * - API_BASE_URL=https://your-api.run.app X_AUTH_HASH=... node scripts/import-gifts-via-api.js
 *
 * Optional env vars:
 * - X_AUTH_HASH: precomputed auth hash for protected endpoints
 * - ADMIN_USER / ADMIN_PASSWORD: used to auto-login when X_AUTH_HASH is not provided
 * - GIFTS_REPLACE_EXISTING=true|false (default false)
 * - GIFTS_IMPORT_RETRIES (default 10)
 * - GIFTS_IMPORT_DELAY_MS (default 2000)
 */

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function getApiBaseUrl() {
  return (process.env.API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

async function getAuthHash(apiBaseUrl) {
  if (process.env.X_AUTH_HASH) {
    return process.env.X_AUTH_HASH;
  }

  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    throw new Error(
      'Missing auth. Provide X_AUTH_HASH or ADMIN_USER + ADMIN_PASSWORD.',
    );
  }

  const loginResponse = await fetch(`${apiBaseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password }),
  });

  if (!loginResponse.ok) {
    const bodyText = await loginResponse.text();
    throw new Error(`Failed to login: ${loginResponse.status} ${bodyText}`);
  }

  const loginBody = await loginResponse.json();
  if (!loginBody?.hash) {
    throw new Error('Login succeeded but hash was not returned');
  }

  return loginBody.hash;
}

async function runImport() {
  const apiBaseUrl = getApiBaseUrl();
  const replaceExisting = parseBoolean(process.env.GIFTS_REPLACE_EXISTING, false);
  const retries = Number(process.env.GIFTS_IMPORT_RETRIES || 10);
  const delayMs = Number(process.env.GIFTS_IMPORT_DELAY_MS || 2000);

  const authHash = await getAuthHash(apiBaseUrl);
  const endpointUrl = `${apiBaseUrl}/importGifts`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Hash': authHash,
        },
        body: JSON.stringify({ replaceExisting }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`HTTP ${response.status} ${bodyText}`);
      }

      const payload = await response.json();
      console.log('✅ Gifts import finished:', payload);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === retries) {
        throw new Error(`Import failed after ${retries} attempts: ${message}`);
      }
      console.warn(
        `⚠️  Attempt ${attempt}/${retries} failed (${message}). Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }
}

runImport().catch((error) => {
  console.error('❌ Gifts import script failed:', error);
  process.exit(1);
});

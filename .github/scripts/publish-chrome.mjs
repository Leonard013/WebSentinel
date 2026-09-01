import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const requiredEnvironment = [
  'CHROME_EXTENSION_ID',
  'CHROME_PACKAGE',
  'CHROME_PUBLISHER_ID',
  'CHROME_SERVICE_ACCOUNT_JSON',
  'CHROME_VERSION'
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

let credentials;
try {
  credentials = JSON.parse(process.env.CHROME_SERVICE_ACCOUNT_JSON);
} catch {
  throw new Error('CHROME_SERVICE_ACCOUNT_JSON is not valid JSON.');
}

if (!credentials.client_email || !credentials.private_key) {
  throw new Error('The service account JSON must contain client_email and private_key.');
}

const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
const scope = 'https://www.googleapis.com/auth/chromewebstore';
const publisherId = process.env.CHROME_PUBLISHER_ID;
const extensionId = process.env.CHROME_EXTENSION_ID;
const expectedVersion = process.env.CHROME_VERSION;
const packagePath = process.env.CHROME_PACKAGE;
const itemName = `publishers/${publisherId}/items/${extensionId}`;

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createAssertion() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'RS256', typ: 'JWT' });
  const claims = encodeJson({
    iss: credentials.client_email,
    scope,
    aud: tokenUri,
    iat: issuedAt,
    exp: issuedAt + 3600
  });
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(credentials.private_key).toString('base64url');
  return `${unsignedToken}.${signature}`;
}

async function requestJson(url, options, label) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { rawResponse: text };
    }
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function getAccessToken() {
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: createAssertion()
  });
  const token = await requestJson(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  }, 'Service account authentication');

  if (!token.access_token) {
    throw new Error('Google did not return an access token.');
  }

  return token.access_token;
}

function normaliseUploadState(state = '') {
  return state.replace(/^UPLOAD_/, '');
}

async function waitForUpload(accessToken, initialUpload) {
  let state = normaliseUploadState(initialUpload.uploadState);
  let version = initialUpload.crxVersion;

  for (let attempt = 0; state === 'IN_PROGRESS' && attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await requestJson(
      `https://chromewebstore.googleapis.com/v2/${itemName}:fetchStatus`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      'Chrome Web Store upload status'
    );
    state = normaliseUploadState(status.lastAsyncUploadState);
    const channels = status.submittedItemRevisionStatus?.distributionChannels || [];
    version = channels[0]?.crxVersion || version;
  }

  if (state !== 'SUCCEEDED') {
    throw new Error(`Chrome Web Store upload did not succeed (state: ${state || 'unknown'}).`);
  }

  if (version && version !== expectedVersion) {
    throw new Error(`Chrome Web Store received version ${version}; expected ${expectedVersion}.`);
  }
}

const accessToken = await getAccessToken();
const packageData = await readFile(packagePath);

console.log(`Uploading WebSentinel ${expectedVersion} to Chrome Web Store item ${extensionId}...`);
const upload = await requestJson(
  `https://chromewebstore.googleapis.com/upload/v2/${itemName}:upload`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/zip'
    },
    body: packageData
  },
  'Chrome Web Store upload'
);

await waitForUpload(accessToken, upload);
console.log('Upload succeeded. Submitting the new version for review...');

const published = await requestJson(
  `https://chromewebstore.googleapis.com/v2/${itemName}:publish`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publishType: 'DEFAULT_PUBLISH',
      skipReview: false,
      blockOnWarnings: false
    })
  },
  'Chrome Web Store publish'
);

console.log(`Chrome Web Store submission accepted (state: ${published.state || 'submitted'}).`);
if (published.warningInfo?.warnings?.length) {
  for (const warning of published.warningInfo.warnings) {
    console.warn(`Chrome Web Store warning: ${warning.description || warning.reason}`);
  }
}

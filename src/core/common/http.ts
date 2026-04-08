import { createAppError, ErrorKey } from "../error/error.app.js";

const DEFAULT_LOG = true;

export async function httpRequest(
  resource: RequestInfo,
  options: RequestInit = {},
  timeout: number = 5000,
  log: boolean = false
): Promise<Response> {
  console.log('httpRequest 1')
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  console.log('httpRequest 2')
  const safeOptions = {
    ...options,
    body: truncateLargeValues(options.body)
  } as RequestInit;
  console.log('httpRequest 3')
  if (log || DEFAULT_LOG) {
    console.log(toCurl(resource, safeOptions));
  }
  console.log('httpRequest 4')
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  }).catch((error) => {
    console.error('Fetch error:', error);
    throw error
  })
  console.log('httpRequest 5')
  if (log || DEFAULT_LOG) {
    const text = await response.clone().text(); // 🔥 clone สำคัญ
    console.log('--- RESPONSE ---');
    console.log(text);
  }
  console.log('httpRequest 6')
  clearTimeout(id);
  console.log('httpRequest 7', response)
  return response;
}

export async function httpRequestBody<T>(resource: RequestInfo, options: RequestInit = {}, timeout: number = 5000, log: boolean = false): Promise<T> {
  const response = await httpRequest(resource, options, timeout, log)

  if (!response.ok) {
    throw createAppError(ErrorKey.UNKNOW_ERROR_00000, `HTTP error: ${response.status}`);
  }

  return await response.json() as T
}

function truncateLargeValues(value: unknown, maxLength = 100): unknown {

  if (typeof value === "string") {

    // ถ้าเป็น JSON string
    try {
      const parsed = JSON.parse(value);
      return truncateLargeValues(parsed, maxLength);
    } catch {
      return value.length > maxLength ? "too large" : value;
    }

  }

  if (Array.isArray(value)) {
    return value.map(v => truncateLargeValues(v, maxLength));
  }

  if (value && typeof value === "object") {

    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = truncateLargeValues(val, maxLength);
    }

    return result;
  }

  return value;
}

function toCurl(resource: RequestInfo, options: RequestInit = {}) {
  const url = typeof resource === 'string' ? resource : resource.toString();
  const method = options.method || 'GET';

  let curl = `curl -X ${method} '${url}'`;

  // headers
  if (options.headers) {
    const headers = options.headers as Record<string, string>;
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });
  }

  // body
  if (options.body) {
    const body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

    curl += ` \\\n  --data-raw '${body}'`;
  }

  return curl;
}
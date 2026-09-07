import { config } from "./config.js";

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

const BASE_URL = "https://api.airtable.com/v0";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Airtable's public API caps at 5 req/sec per base; this stays comfortably under that
// rather than relying purely on reactive 429 backoff, since a rate-limited migration
// run over thousands of records (5001 Attendance rows alone) would otherwise be slow
// and noisy from repeated retries.
const MIN_REQUEST_INTERVAL_MS = 250;
let lastRequestAt = 0;

async function throttledFetch(url: string): Promise<Response> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestAt = Date.now();

  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.airtableApiKey}` } });

  if (res.status === 429) {
    // Airtable's own documented backoff for rate limiting is 30s.
    await sleep(30_000);
    return throttledFetch(url);
  }

  return res;
}

export async function listAllRecords(tableId: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/${config.airtableBaseId}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await throttledFetch(url.toString());
    if (!res.ok) {
      throw new Error(`Airtable API error ${res.status} for table ${tableId}: ${await res.text()}`);
    }

    const body = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...body.records);
    offset = body.offset;
  } while (offset);

  return records;
}

// Airtable's real REST API (api.airtable.com, used here) returns single-select fields
// as plain strings — confirmed directly against the live base. The {id, name, color}
// object shape only appears via the separate Airtable MCP tool, not this client; a
// prior version of this helper assumed the object shape, which silently discarded
// every select value and fell back to each caller's default (e.g. every migrated
// Leave Request's real "Approved" status was lost, defaulting to "Pending").
export function selectName(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) return (value as { name: string }).name;
  return undefined;
}

export function linkedRecordIds(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

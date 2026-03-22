/**
 * Integration tests against the real DSBmobile API.
 * Requires DSB_USERNAME and DSB_PASSWORD environment variables to be set.
 *
 * Run with: DSB_USERNAME=... DSB_PASSWORD=... mise run test:integration
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { DsbmobileClient } from '../src/services/dsbmobile.js';

const hasCredentials = !!process.env.DSB_USERNAME && !!process.env.DSB_PASSWORD;

const describeIfCredentials = hasCredentials ? describe : describe.skip;

describeIfCredentials('DsbmobileClient (integration)', () => {
  let client: DsbmobileClient;

  beforeAll(() => {
    client = new DsbmobileClient();
  });

  test('getTimetables returns at least one entry', async () => {
    const entries = await client.getTimetables();
    expect(entries.length).toBeGreaterThan(0);
    const first = entries[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/^https?:\/\//);
    expect(first.date).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  test('getTimetables entries have valid URLs', async () => {
    const entries = await client.getTimetables();
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/light\.dsbcontrol\.de\//);
    }
  });

  test('getNews returns an array (may be empty)', async () => {
    const entries = await client.getNews();
    expect(Array.isArray(entries)).toBe(true);
  });

  test('getDocuments returns an array (may be empty)', async () => {
    const entries = await client.getDocuments();
    expect(Array.isArray(entries)).toBe(true);
  });

  test('getSubstitutions returns parsed plans with entries', async () => {
    const plans = await client.getSubstitutions();
    expect(plans.length).toBeGreaterThan(0);
    const first = plans[0];
    expect(first.title).toBeTruthy();
    expect(first.planDate).toBeTruthy();
    expect(Array.isArray(first.entries)).toBe(true);
    expect(first.entries.length).toBeGreaterThan(0);
  });

  test('getSubstitutions entries have required fields', async () => {
    const plans = await client.getSubstitutions();
    const allEntries = plans.flatMap((p) => p.entries);
    expect(allEntries.length).toBeGreaterThan(0);
    for (const entry of allEntries) {
      expect(entry.className).toBeTruthy();
      expect(entry.type).toBeTruthy();
      expect(entry.period).toBeTruthy();
      expect(entry.subject).toBeTruthy();
    }
  });

  test('throws on invalid credentials', async () => {
    const originalUsername = process.env.DSB_USERNAME;
    const originalPassword = process.env.DSB_PASSWORD;
    process.env.DSB_USERNAME = 'invalid_user';
    process.env.DSB_PASSWORD = 'invalid_pass';
    const badClient = new DsbmobileClient();
    // Restore original credentials before awaiting so other tests are unaffected
    process.env.DSB_USERNAME = originalUsername;
    process.env.DSB_PASSWORD = originalPassword;
    await expect(badClient.getTimetables()).rejects.toThrow(/Error:/);
  });
});

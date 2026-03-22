import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DsbmobileClient } from '../src/services/dsbmobile.js';

const parseHtml = (
  html: string,
  title = 'Test',
  date = '01.01.2026 00:00',
  url = 'http://example.com',
) => (DsbmobileClient.prototype as any).parseSubstitutionHtml.call({}, html, title, date, url);

const fixtureHtml = new TextDecoder('iso-8859-1').decode(
  readFileSync(path.join(import.meta.dir, 'fixtures/subst_001.htm')),
);

describe('parseSubstitutionHtml', () => {
  test('parses plan date correctly', () => {
    const plan = parseHtml(fixtureHtml);
    expect(plan.planDate).toBe('20.3.2026 Freitag (Seite 1 / 8)');
  });

  test('passes through title and lastUpdated', () => {
    const plan = parseHtml(fixtureHtml, 'V-Homepage heute', '20.03.2026 10:23');
    expect(plan.title).toBe('V-Homepage heute');
    expect(plan.lastUpdated).toBe('20.03.2026 10:23');
  });

  test('parses affected classes', () => {
    const plan = parseHtml(fixtureHtml);
    expect(plan.affectedClasses).toContain('10a');
    expect(plan.affectedClasses).toContain('11a');
    expect(plan.affectedClasses).toContain('12a');
  });

  test('parses correct number of substitution entries', () => {
    const plan = parseHtml(fixtureHtml);
    expect(plan.entries.length).toBe(8);
  });

  test('parses first entry for class 10a correctly', () => {
    const plan = parseHtml(fixtureHtml);
    const entry = plan.entries[0];
    expect(entry.className).toBe('10a');
    expect(entry.type).toBe('Vertretung');
    expect(entry.period).toBe('3');
    expect(entry.originalTeacher).toBe('Aaa');
    expect(entry.substituteTeacher).toBe('Bbb');
    expect(entry.subject).toBe('SPO');
    expect(entry.originalRoom).toBe('SPH1');
    expect(entry.substituteRoom).toBe('A103');
  });

  test('parses multi-period entry correctly', () => {
    const plan = parseHtml(fixtureHtml);
    const entry = plan.entries.find((e: any) => e.period === '5 - 6' && e.className === '10b');
    expect(entry).toBeDefined();
    expect(entry.type).toBe('Statt-Vertretung');
    expect(entry.originalTeacher).toBe('Ddd');
    expect(entry.substituteTeacher).toBe('Eee');
    expect(entry.subject).toBe('ETHI');
  });

  test('handles entry with no room change (single room field)', () => {
    const plan = parseHtml(fixtureHtml);
    // 10b entry has room 'A208' with no '?' separator
    const entry = plan.entries.find((e: any) => e.className === '10b');
    expect(entry).toBeDefined();
    expect(entry.originalRoom).toBe('');
    expect(entry.substituteRoom).toBe('A208');
  });

  test('groups entries by class correctly', () => {
    const plan = parseHtml(fixtureHtml);
    const class10a = plan.entries.filter((e: any) => e.className === '10a');
    const class11a = plan.entries.filter((e: any) => e.className === '11a');
    expect(class10a.length).toBe(2);
    expect(class11a.length).toBe(3);
  });

  test('returns empty entries for HTML with no substitutions', () => {
    const emptyHtml = `<html><body>
      <div class="mon_title">01.01.2026 Donnerstag</div>
      <table class="mon_list"><tr class='list'><th class="list">Art</th></tr></table>
    </body></html>`;
    const plan = parseHtml(emptyHtml);
    expect(plan.entries.length).toBe(0);
  });
});

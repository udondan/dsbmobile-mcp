import { describe, expect, mock, test } from 'bun:test';
import type { DsbmobileClient } from '../src/services/dsbmobile.js';
import { registerDocumentsTool } from '../src/tools/documents.js';
import { registerNewsTool } from '../src/tools/news.js';
import { registerSubstitutionsTool } from '../src/tools/substitutions.js';
import { registerTimetablesTool } from '../src/tools/timetables.js';
import type { SubstitutionPlan, TimetableEntry } from '../src/types.js';

// --- Helpers ---

function makeMockClient(overrides: Partial<DsbmobileClient> = {}): DsbmobileClient {
  return {
    getTimetables: mock(async () => []),
    getNews: mock(async () => []),
    getDocuments: mock(async () => []),
    getSubstitutions: mock(async () => []),
    ...overrides,
  } as unknown as DsbmobileClient;
}

async function callTool(
  register: (server: any, client: DsbmobileClient) => void,
  client: DsbmobileClient,
  args: Record<string, unknown> = {},
): Promise<{ text: string; structuredContent?: unknown; isError?: boolean }> {
  let handler: ((args: any) => Promise<any>) | undefined;
  const fakeServer = {
    registerTool: (_name: string, _config: unknown, fn: (args: any) => Promise<any>) => {
      handler = fn;
    },
  };
  register(fakeServer, client);
  const result = await handler!(args);
  return {
    text: result.content[0].text as string,
    structuredContent: result.structuredContent,
    isError: result.isError,
  };
}

// --- Timetables tool ---

describe('get_timetables tool', () => {
  test('returns message when no timetables available', async () => {
    const client = makeMockClient({ getTimetables: mock(async () => []) });
    const result = await callTool(registerTimetablesTool, client);
    expect(result.text).toContain('keine');
  });

  test('returns formatted timetable list', async () => {
    const entries: TimetableEntry[] = [
      {
        id: 'abc',
        title: 'V-Homepage heute',
        date: '20.03.2026 10:23',
        url: 'https://example.com/plan.htm',
      },
    ];
    const client = makeMockClient({ getTimetables: mock(async () => entries) });
    const result = await callTool(registerTimetablesTool, client);
    expect(result.text).toContain('V-Homepage heute');
    expect(result.text).toContain('https://example.com/plan.htm');
    expect((result.structuredContent as any).count).toBe(1);
  });

  test('returns error text on failure', async () => {
    const client = makeMockClient({
      getTimetables: mock(async () => {
        throw new Error('Error: Auth failed');
      }),
    });
    const result = await callTool(registerTimetablesTool, client);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('Auth failed');
  });
});

// --- Substitutions tool ---

describe('get_substitutions tool', () => {
  const makePlan = (entries: SubstitutionPlan['entries']): SubstitutionPlan => ({
    title: 'V-Homepage heute (Seite 1)',
    planDate: '20.3.2026 Freitag',
    lastUpdated: '20.03.2026 10:23',
    url: 'https://example.com/plan.htm',
    affectedClasses: '05b, 06c',
    entries,
  });

  test('returns message when no plans available', async () => {
    const client = makeMockClient({ getSubstitutions: mock(async () => []) });
    const result = await callTool(registerSubstitutionsTool, client);
    expect(result.text).toContain('keine');
  });

  test('returns all entries when no filter given', async () => {
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: 'SPH1',
        substituteRoom: 'A103',
        text: '',
      },
      {
        className: '06c',
        type: 'Entfall',
        period: '5',
        originalTeacher: 'Mül',
        substituteTeacher: '',
        subject: 'DE',
        originalRoom: 'A201',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client);
    expect((result.structuredContent as any).totalEntries).toBe(2);
    expect(result.text).toContain('05b');
    expect(result.text).toContain('06c');
  });

  test('filters by className parameter', async () => {
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: 'SPH1',
        substituteRoom: 'A103',
        text: '',
      },
      {
        className: '06c',
        type: 'Entfall',
        period: '5',
        originalTeacher: 'Mül',
        substituteTeacher: '',
        subject: 'DE',
        originalRoom: 'A201',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client, {
      className: '05b',
    });
    expect((result.structuredContent as any).totalEntries).toBe(1);
    expect(result.text).toContain('Class 05b');
    expect(result.text).not.toContain('Class 06c');
  });

  test('className filter is case-insensitive', async () => {
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client, {
      className: '05B',
    });
    expect((result.structuredContent as any).totalEntries).toBe(1);
  });

  test('returns message when filter matches nothing', async () => {
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client, {
      className: '99z',
    });
    expect(result.text).toContain('99z');
    expect(result.isError).toBeUndefined();
  });

  test('uses DSB_CLASS env var as default filter', async () => {
    process.env.DSB_CLASS = '06c';
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
      {
        className: '06c',
        type: 'Entfall',
        period: '5',
        originalTeacher: 'Mül',
        substituteTeacher: '',
        subject: 'DE',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client);
    expect((result.structuredContent as any).totalEntries).toBe(1);
    expect(result.text).toContain('06c');
    delete process.env.DSB_CLASS;
  });

  test('className param overrides DSB_CLASS env var', async () => {
    process.env.DSB_CLASS = '06c';
    const plan = makePlan([
      {
        className: '05b',
        type: 'Vertretung',
        period: '3',
        originalTeacher: 'Läp',
        substituteTeacher: 'Jun',
        subject: 'SPO',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
      {
        className: '06c',
        type: 'Entfall',
        period: '5',
        originalTeacher: 'Mül',
        substituteTeacher: '',
        subject: 'DE',
        originalRoom: '',
        substituteRoom: '',
        text: '',
      },
    ]);
    const client = makeMockClient({
      getSubstitutions: mock(async () => [plan]),
    });
    const result = await callTool(registerSubstitutionsTool, client, {
      className: '05b',
    });
    expect((result.structuredContent as any).totalEntries).toBe(1);
    expect(result.text).toContain('05b');
    delete process.env.DSB_CLASS;
  });
});

// --- News tool ---

describe('get_news tool', () => {
  test('returns message when no news available', async () => {
    const client = makeMockClient({ getNews: mock(async () => []) });
    const result = await callTool(registerNewsTool, client);
    expect(result.text).toContain('keine');
  });

  test('returns formatted news list', async () => {
    const client = makeMockClient({
      getNews: mock(async () => [
        {
          id: '1',
          title: 'Schulausflug',
          detail: 'Morgen kein Unterricht',
          date: '20.03.2026 08:00',
          tags: '',
        },
      ]),
    });
    const result = await callTool(registerNewsTool, client);
    expect(result.text).toContain('Schulausflug');
    expect(result.text).toContain('Morgen kein Unterricht');
    expect((result.structuredContent as any).count).toBe(1);
  });
});

// --- Documents tool ---

describe('get_documents tool', () => {
  test('returns message when no documents available', async () => {
    const client = makeMockClient({ getDocuments: mock(async () => []) });
    const result = await callTool(registerDocumentsTool, client);
    expect(result.text).toContain('keine');
  });

  test('returns formatted document list', async () => {
    const client = makeMockClient({
      getDocuments: mock(async () => [
        {
          id: '1',
          title: 'Elternbrief',
          url: 'https://example.com/brief.pdf',
          date: '13.03.2026 09:00',
        },
      ]),
    });
    const result = await callTool(registerDocumentsTool, client);
    expect(result.text).toContain('Elternbrief');
    expect(result.text).toContain('https://example.com/brief.pdf');
    expect((result.structuredContent as any).count).toBe(1);
  });
});

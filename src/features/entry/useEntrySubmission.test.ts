/**
 * Covers the I/O & Edge-Case Matrix rows owned by this hook: "Phase 1 in
 * flight" (second submission blocked), "Phase 1 success" (Phase 2 begins),
 * "Phase 1 failure" (status/errorMessage, retry re-sends the same text),
 * "Phase 2 result" (`handleRoundTripResult` maps `entry` and flips to
 * `'ready'`), "Phase 2 timeout" (`PHASE2_TIMEOUT_MS`, Catalan copy), and
 * "Save POST fails"/succeeds (`saveEntry`). `postToN8n`, `readSecureItem`
 * and the settings store are mocked so this exercises only this hook's own
 * logic, not real networking or secure storage — same boundary
 * `useTracerBullet.test.ts` draws for its own (single-phase) version of this
 * state machine.
 *
 * No hook-testing library is installed in this repo, so a tiny harness
 * mounts a throwaway component with `react-test-renderer` and captures the
 * hook's latest return value into a mutable ref on every render — the same
 * mechanism `useTracerBullet.test.ts` uses.
 */
import React from 'react';
import ReactTestRenderer, { act, type ReactTestRenderer as Renderer } from 'react-test-renderer';

import { postToN8n } from '../../lib/api/n8nClient';
import { PHASE2_TIMEOUT_MS } from '../../lib/constants';
import { roundTripError } from '../../lib/conchiCopy';
import { readSecureItem } from '../../lib/storage/secureStore';
import { useSettingsStore } from '../../store';
import { useEntrySubmission, type UseEntrySubmissionResult } from './useEntrySubmission';
import type { Entry } from '../../lib/types/entry';

jest.mock('../../lib/api/n8nClient', () => ({
  ...jest.requireActual<typeof import('../../lib/api/n8nClient')>('../../lib/api/n8nClient'),
  postToN8n: jest.fn(),
}));

jest.mock('../../lib/storage/secureStore', () => ({
  AUTH_SECRET_KEY: 'settings.authSecret',
  readSecureItem: jest.fn(),
}));

jest.mock('../../store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

const mockPostToN8n = postToN8n as jest.MockedFunction<typeof postToN8n>;
const mockReadSecureItem = readSecureItem as jest.MockedFunction<typeof readSecureItem>;
const mockGetState = useSettingsStore.getState as jest.MockedFunction<typeof useSettingsStore.getState>;

const MOCK_ENTRY: Entry = {
  id: 'entry-1',
  userId: 'user-1',
  amount: 24.5,
  currency: 'EUR',
  category: 'Alimentació',
  subcategory: 'Supermercat',
  description: 'Compra setmanal',
  date: '2026-10-15',
  context: 'Casa',
  origin: 'app',
};

// Several tests below leave a real Phase 2 `setTimeout(..., PHASE2_TIMEOUT_MS)`
// pending (any `submit()` that reaches 'waiting' schedules one) — unlike
// `useTracerBullet` (single-phase, no outstanding timers), this hook needs
// its renderer actually unmounted afterwards so its own cleanup effect
// (`clearPhase2Timeout`) runs; otherwise that real 60s timer outlives the
// test and fires later, warning "update not wrapped in act()" or "cannot log
// after tests are done" once some other test's `jest.useFakeTimers()` later
// hijacks still-pending real timers.
let activeRenderer: Renderer | undefined;

function renderEntrySubmissionHook(): { current: UseEntrySubmissionResult } {
  const ref: { current: UseEntrySubmissionResult } = {
    current: undefined as unknown as UseEntrySubmissionResult,
  };

  function Harness(): null {
    ref.current = useEntrySubmission();
    return null;
  }

  act(() => {
    activeRenderer = ReactTestRenderer.create(React.createElement(Harness));
  });

  return ref;
}

beforeEach(() => {
  mockPostToN8n.mockReset();
  mockReadSecureItem.mockReset();
  mockGetState.mockReset();
  mockGetState.mockReturnValue({
    webhookUrl: 'https://n8n.example.com/webhook',
  } as ReturnType<typeof useSettingsStore.getState>);
  mockReadSecureItem.mockResolvedValue('secret-value');
});

afterEach(() => {
  if (activeRenderer) {
    act(() => {
      activeRenderer?.unmount();
    });
    activeRenderer = undefined;
  }
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('submit (Phase 1)', () => {
  test('happy path: posts the text, then moves to waiting (Phase 2 begins)', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();

    await act(async () => hook.current.submit('hola conchi'));

    expect(mockPostToN8n).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/send-expense',
      'secret-value',
      'hola conchi',
    );
    expect(hook.current.status).toBe('waiting');
    expect(hook.current.errorMessage).toBeUndefined();
  });

  test('HTTP error: status becomes error, with the status code in the message', async () => {
    mockPostToN8n.mockResolvedValue({ ok: false, status: 500 } as Response);
    const hook = renderEntrySubmissionHook();

    await act(async () => hook.current.submit('hola conchi'));

    expect(hook.current.status).toBe('error');
    expect(hook.current.errorMessage).toContain('500');
  });

  test('network failure: a thrown/rejected fetch is caught and shown, not thrown', async () => {
    mockPostToN8n.mockRejectedValue(new Error('Network request failed'));
    const hook = renderEntrySubmissionHook();

    await act(async () => hook.current.submit('hola conchi'));

    expect(hook.current.status).toBe('error');
    expect(hook.current.errorMessage).toBeDefined();
  });

  test('second submission is blocked while Phase 1 is in flight', async () => {
    let resolvePost!: (response: Response) => void;
    mockPostToN8n.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );
    const hook = renderEntrySubmissionHook();

    await act(async () => {
      void hook.current.submit('first');
      void hook.current.submit('second');
      // Macrotask boundary (not a fixed number of microtask hops) — Node
      // drains the entire microtask queue before any timer fires, so this
      // reliably lets `readSecureItem`'s mocked promise resolve and
      // `postToN8n` actually get invoked (capturing `resolvePost`) before
      // this resolves it, regardless of how many awaits are chained inside
      // the hook.
      await new Promise((resolve) => setTimeout(resolve, 0));
      resolvePost({ ok: true } as Response);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(mockPostToN8n).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'first');
  });

  test('second submission is blocked while Phase 2 is waiting', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('first'));
    expect(hook.current.status).toBe('waiting');

    await act(async () => hook.current.submit('second'));

    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
  });
});

describe('retry', () => {
  test('re-sends the exact text from the last submit()', async () => {
    mockPostToN8n.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));
    expect(hook.current.status).toBe('error');

    mockPostToN8n.mockResolvedValueOnce({ ok: true } as Response);
    await act(async () => hook.current.retry());

    expect(mockPostToN8n).toHaveBeenNthCalledWith(2, expect.any(String), expect.any(String), 'hola conchi');
    expect(hook.current.status).toBe('waiting');
  });
});

describe('Phase 2', () => {
  test('handleRoundTripResult while waiting maps the entry and moves to ready', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));
    expect(hook.current.status).toBe('waiting');

    act(() => {
      hook.current.handleRoundTripResult(MOCK_ENTRY);
    });

    expect(hook.current.status).toBe('ready');
    expect(hook.current.entryResult).toEqual({
      amount: 24.5,
      currency: 'EUR',
      category: 'Alimentació',
      subcategory: 'Supermercat',
      description: 'Compra setmanal',
      date: '2026-10-15',
      context: 'Casa',
    });
  });

  test('handleRoundTripResult is a no-op when not currently waiting (e.g. idle)', () => {
    const hook = renderEntrySubmissionHook();

    act(() => {
      hook.current.handleRoundTripResult(MOCK_ENTRY);
    });

    expect(hook.current.status).toBe('idle');
    expect(hook.current.entryResult).toBeUndefined();
  });

  test('timeout: no result within PHASE2_TIMEOUT_MS surfaces a Catalan error, Bubble-facing', async () => {
    jest.useFakeTimers();
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));
    expect(hook.current.status).toBe('waiting');

    act(() => {
      jest.advanceTimersByTime(PHASE2_TIMEOUT_MS);
    });

    expect(hook.current.status).toBe('error');
    expect(hook.current.errorMessage).toBe(roundTripError);
  });

  test('a result that arrives after the timeout has already fired is ignored', async () => {
    jest.useFakeTimers();
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));

    act(() => {
      jest.advanceTimersByTime(PHASE2_TIMEOUT_MS);
    });
    expect(hook.current.status).toBe('error');

    act(() => {
      hook.current.handleRoundTripResult(MOCK_ENTRY);
    });

    // Still the timeout error, not clobbered by a late result.
    expect(hook.current.status).toBe('error');
    expect(hook.current.entryResult).toBeUndefined();
  });

  test('a result that arrives before the timeout cancels it (no later error)', async () => {
    jest.useFakeTimers();
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));

    act(() => {
      hook.current.handleRoundTripResult(MOCK_ENTRY);
    });
    expect(hook.current.status).toBe('ready');

    act(() => {
      jest.advanceTimersByTime(PHASE2_TIMEOUT_MS);
    });

    expect(hook.current.status).toBe('ready');
  });
});

describe('reset', () => {
  test('returns to idle with everything cleared, and a stale Phase 2 timeout can no longer fire', async () => {
    jest.useFakeTimers();
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();
    await act(async () => hook.current.submit('hola conchi'));
    expect(hook.current.status).toBe('waiting');

    act(() => {
      hook.current.reset();
    });

    expect(hook.current.status).toBe('idle');
    expect(hook.current.errorMessage).toBeUndefined();
    expect(hook.current.entryResult).toBeUndefined();

    act(() => {
      jest.advanceTimersByTime(PHASE2_TIMEOUT_MS);
    });

    expect(hook.current.status).toBe('idle');
  });
});

describe('saveEntry (Acceptar)', () => {
  const SAVE_DATA = {
    amount: 24.5,
    currency: 'EUR',
    category: 'Alimentació',
    subcategory: 'Supermercat',
    description: 'Compra setmanal',
    date: '2026-10-15',
    context: 'Casa',
  };

  test('happy path: POSTs to the save endpoint and resolves true', async () => {
    mockPostToN8n.mockResolvedValue({ ok: true } as Response);
    const hook = renderEntrySubmissionHook();

    let saved = false;
    await act(async () => {
      saved = await hook.current.saveEntry(SAVE_DATA);
    });

    expect(saved).toBe(true);
    expect(mockPostToN8n).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/save-entry',
      'secret-value',
      SAVE_DATA,
    );
    expect(hook.current.saveStatus).toBe('idle');
  });

  test('HTTP error: resolves false, saveStatus becomes error, card data is left untouched', async () => {
    mockPostToN8n.mockResolvedValue({ ok: false, status: 500 } as Response);
    const hook = renderEntrySubmissionHook();

    let saved = true;
    await act(async () => {
      saved = await hook.current.saveEntry(SAVE_DATA);
    });

    expect(saved).toBe(false);
    expect(hook.current.saveStatus).toBe('error');
    expect(hook.current.saveErrorMessage).toContain('500');
  });

  test('network failure: resolves false and surfaces a message, does not throw', async () => {
    mockPostToN8n.mockRejectedValue(new Error('Network request failed'));
    const hook = renderEntrySubmissionHook();

    let saved = true;
    await act(async () => {
      saved = await hook.current.saveEntry(SAVE_DATA);
    });

    expect(saved).toBe(false);
    expect(hook.current.saveStatus).toBe('error');
    expect(hook.current.saveErrorMessage).toBeDefined();
  });

  test('a re-entrant call (e.g. a double-tapped Acceptar) while a save is already in flight is rejected without a second POST', async () => {
    let resolvePost!: (response: Response) => void;
    mockPostToN8n.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );
    const hook = renderEntrySubmissionHook();

    let firstResult: boolean | undefined;
    let secondResult: boolean | undefined;
    await act(async () => {
      void hook.current.saveEntry(SAVE_DATA).then((result) => {
        firstResult = result;
      });
      void hook.current.saveEntry(SAVE_DATA).then((result) => {
        secondResult = result;
      });
      // Same macrotask-boundary technique as the Phase 1 in-flight test
      // above, letting `readSecureItem`'s mocked promise resolve and
      // `postToN8n` actually get invoked (capturing `resolvePost`) before
      // this resolves it.
      await new Promise((resolve) => setTimeout(resolve, 0));
      resolvePost({ ok: true } as Response);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockPostToN8n).toHaveBeenCalledTimes(1);
    expect(secondResult).toBe(false);
    expect(firstResult).toBe(true);
  });
});

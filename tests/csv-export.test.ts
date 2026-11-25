// Tests of the CSV export of the transaction history. The export code and the export modal run as they are, while the
// network, the stores, the translations, the build config and the browser APIs they use are replaced by fixtures.
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { reactive, type Ref } from 'vue';

import HistoryExportModal from '@/components/modals/HistoryExportModal.vue';
import { BlockpitAppFormat } from '@/lib/export/BlockpitAppFormat';
import { GenericFormat } from '@/lib/export/GenericFormat';
import { ExportFormat, exportTransactions } from '@/lib/export/TransactionExport';
import type { Transaction as NimTx } from '@/stores/Transactions';

type Receipt = { hash: string; block_height: number };
type FetchResponse = { ok: boolean; json: () => Promise<unknown> };
type Options = {
    // Transactions already in the transactions store.
    cached?: NimTx[];
    // The receipts returned by the block explorer, if not overridden by fetch.
    receipts?: Receipt[];
    fetch?: (url: string, init: RequestInit | undefined, call: number) => Promise<FetchResponse>;
    network?: () => Promise<unknown>;
    consensus?: () => Promise<void>;
    // Whether the network client only returns transactions after waitForConsensusEstablished.
    requireConsensus?: boolean;
    lookup?: (hash: string) => Promise<NimTx>;
    swap?: unknown;
    onAdd?: (transactions: Record<string, NimTx>) => void;
};
type Fixture = ReturnType<typeof setUp>;

const fixtures = vi.hoisted(() => ({ current: null as Fixture | null }));

function current() {
    if (!fixtures.current) throw new Error('No fixture set up');
    return fixtures.current;
}

vi.mock('config', () => ({
    default: {
        nimiqPay: { cosignerPublicKeys: [] },
        polygon: { usdc: {}, usdc_bridged: {}, usdt_bridged: {} },
    },
}));
vi.mock('@/components/PageBody.vue', () => ({ default: {} }));
vi.mock('@/components/PageHeader.vue', () => ({ default: {} }));
vi.mock('@/components/PageFooter.vue', () => ({ default: {} }));
vi.mock('@/components/CircleSpinner.vue', () => ({ default: {} }));
vi.mock('@/components/ButtonGroup.vue', () => ({ default: {} }));
vi.mock('@/components/modals/Modal.vue', () => ({ default: {} }));
vi.mock('@/composables/useConfig', () => ({ useConfig: () => ({ config: { environment: 'main' } }) }));
vi.mock('@/i18n/i18n-setup', () => ({ i18n: { t: (key: string) => key } }));
vi.mock('@/lib/useI18n', () => ({ useI18n: () => ({ $t: (key: string) => key }) }));
vi.mock('@/network', () => ({ getNetworkClient: () => current().getNetworkClient() }));
vi.mock('@/stores/Account', () => ({
    useAccountStore: () => current().accountStore,
}));
vi.mock('@/stores/Address', () => ({
    useAddressStore: () => ({ $state: { addressInfos: { own: { label: 'Test' } } } }),
}));
vi.mock('@/stores/BtcTransactions', () => ({ useBtcTransactionsStore: () => ({ $state: { transactions: {} } }) }));
vi.mock('@/stores/Fiat', () => ({ useFiatStore: () => ({ $state: { currency: 'usd' } }) }));
vi.mock('@/stores/Proxy', () => ({ useProxyStore: () => ({ $state: { hubCashlinks: {} } }) }));
vi.mock('@/stores/Swaps', () => ({
    useSwapsStore: () => ({ getSwapByTransactionHash: () => current().options.swap }),
}));
vi.mock('@/stores/Transactions', () => ({
    // Copies of the store module's helpers, as the store module itself imports the network.
    toMs: (time: number) => (time < 1e12 ? time * 1000 : time),
    toSecs: (time: number) => (time > 1e12 ? Math.floor(time / 1000) : time),
    useTransactionsStore: () => current().transactionsStore,
}));
vi.mock('@/stores/UsdcTransactions', () => ({ useUsdcTransactionsStore: () => ({ $state: { transactions: {} } }) }));
vi.mock('@/stores/UsdtTransactions', () => ({ useUsdtTransactionsStore: () => ({ $state: { transactions: {} } }) }));

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const messageHex = Array.from(new TextEncoder().encode('Test message'), (byte) =>
    byte.toString(16).padStart(2, '0'),
).join('');
const receipt = (hash: string): Receipt => ({ hash, block_height: 2000000 });
const nimTx = (hash: string) =>
    ({
        transactionHash: hash,
        sender: 'own',
        recipient: 'recipient',
        senderType: 0,
        recipientType: 0,
        value: 100000,
        fee: 0,
        data: { raw: messageHex },
        proof: {},
        timestamp: 1654041600,
        fiatValue: { usd: 1 },
    }) as unknown as NimTx;
const pending = () => new Promise<never>(() => {});

function setUp(options: Options = {}) {
    // The export's timers, which fire after a millisecond, or 30 milliseconds for its timeouts of 15 seconds and more.
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const delays: number[] = [];
    vi.stubGlobal('window', {
        setTimeout: (callback: () => void, milliseconds: number) => {
            delays.push(milliseconds);
            const timer = setTimeout(
                () => {
                    timers.delete(timer);
                    callback();
                },
                milliseconds >= 15000 ? 30 : 1,
            );
            timers.add(timer);
            return timer;
        },
        clearTimeout: (timer: ReturnType<typeof setTimeout>) => {
            timers.delete(timer);
            clearTimeout(timer);
        },
    });

    const downloads: Blob[] = [];
    const blobs = new Map<string, Blob>();
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
        const url = `blob:${blobs.size}`;
        blobs.set(url, blob as Blob);
        return url;
    });
    vi.stubGlobal('document', {
        createElement: () => {
            const link = {
                href: '',
                setAttribute: () => {},
                click: () => downloads.push(blobs.get(link.href)!),
            };
            return link;
        },
    });

    const fixture = {
        options,
        downloads,
        timers,
        delays,
        // Transaction hashes requested from the network client.
        requested: [] as string[],
        // Abort signals of the receipt requests.
        signals: [] as (AbortSignal | null | undefined)[],
        fetchCalls: 0,
        transactions: Object.fromEntries((options.cached || []).map((tx) => [tx.transactionHash, tx])),
        transactionsStore: {
            $state: { transactions: {} as Record<string, NimTx> },
            addTransactions: (txs: NimTx[]) => {
                for (const tx of txs) fixture.transactions[tx.transactionHash] = tx;
                options.onAdd?.(fixture.transactions);
            },
        },
        // Reactive, as the export modal reads it via storeToRefs.
        accountStore: reactive({
            $state: { accountInfos: { test: { label: 'Test', addresses: ['own'] } } },
            activeAccountInfo: { label: 'Test', addresses: ['own'], btcAddresses: { internal: [], external: [] } },
        }),
        getNetworkClient: options.network || (async () => client),
        run: (format = ExportFormat.GENERIC, addresses = ['own']) =>
            exportTransactions(addresses, { internal: [], external: [] }, [], [], 2022, format),
    };
    fixture.transactionsStore.$state.transactions = fixture.transactions;

    let hasConsensus = false;
    const client = {
        waitForConsensusEstablished:
            options.consensus
            || (async () => {
                hasConsensus = true;
            }),
        getTransaction: async (hash: string) => {
            fixture.requested.push(hash);
            if (options.requireConsensus && !hasConsensus) throw new Error('Not connected');
            return options.lookup ? options.lookup(hash) : nimTx(hash);
        },
    };

    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
        fixture.fetchCalls++;
        fixture.signals.push(init?.signal);
        if (options.fetch) return options.fetch(url, init, fixture.fetchCalls);
        return { ok: true, json: async () => options.receipts || [] };
    });

    fixtures.current = fixture;
    return fixture;
}

type ModalBindings = {
    selectedYear: Ref<string>;
    isExporting: Ref<boolean>;
    exportError: Ref<string>;
    download: () => Promise<void>;
};

function setUpModal() {
    const { setup } = HistoryExportModal as unknown as { setup: (props: { type: string }) => ModalBindings };
    const modal = setup({ type: 'account' });
    modal.selectedYear.value = '2022';
    return modal;
}

async function expectPromptRejection(promise: Promise<unknown>) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        const outcome = await Promise.race([
            promise.then(
                () => 'downloaded',
                () => 'rejected',
            ),
            new Promise((resolve) => {
                timeout = setTimeout(() => resolve('still pending'), 400);
            }),
        ]);
        expect(outcome).toBe('rejected');
    } finally {
        clearTimeout(timeout);
    }
}

afterEach(() => {
    fixtures.current?.timers.forEach(clearTimeout);
    fixtures.current = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

test.each([
    ['GenericFormat', GenericFormat],
    ['BlockpitAppFormat', BlockpitAppFormat],
])('%s exports NIM to BTC swaps with the swap note', async (_, Format) => {
    const fixture = setUp({
        swap: {
            in: { asset: 'NIM', transactionHash: hashA },
            out: { asset: 'BTC', transactionHash: hashB },
        },
    });
    const btcTx = {
        transactionHash: hashB,
        inputs: [],
        outputs: [{ address: 'own-btc', value: 1000 }],
        timestamp: 1654041700,
    } as unknown as NimTx;
    new Format(['own'], { internal: [], external: ['own-btc'] }, [], [], [nimTx(hashA), btcTx], 2022).export();
    const csv = await fixture.downloads[0].text();
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toMatch(/BTC,0\.00001,NIM,1/);
    expect(csv).toMatch(/Swap NIM to BTC/);
});

test.each([
    ['GenericFormat', GenericFormat],
    ['BlockpitAppFormat', BlockpitAppFormat],
])('%s preserves ordinary NIM messages', async (_, Format) => {
    const fixture = setUp();
    new Format(['own'], { internal: [], external: [] }, [], [], [nimTx(hashA)], 2022).export();
    expect(await fixture.downloads[0].text()).toMatch(/Test message/);
});

test.each([
    [ExportFormat.GENERIC, 'all'],
    [ExportFormat.GENERIC, 'one'],
    [ExportFormat.BLOCKPIT, 'all'],
    [ExportFormat.BLOCKPIT, 'one'],
])('%s refuses a CSV when %s missing lookups fail', async (format, failing) => {
    const fixture = setUp({
        receipts: [receipt(hashA), receipt(hashB)],
        lookup: async (hash) => {
            if (failing === 'one' && hash === hashA) return nimTx(hash);
            throw new Error('Unavailable transaction');
        },
    });
    await expectPromptRejection(fixture.run(format));
    expect(fixture.downloads).toHaveLength(0);
});

test('waits for consensus and exports every retrieved transaction', async () => {
    const fixture = setUp({ receipts: [receipt(hashA), receipt(hashB)], requireConsensus: true });
    await fixture.run();
    expect(fixture.downloads).toHaveLength(1);
    expect((await fixture.downloads[0].text()).split('\r\n')).toHaveLength(3);
    expect(fixture.timers.size).toBe(0);
});

test('fetches a large history with bounded concurrency and deduplicates receipts', async () => {
    const hashes = Array.from({ length: 12 }, (_, i) => i.toString(16).padStart(64, '0'));
    let active = 0;
    let peak = 0;
    const fixture = setUp({
        receipts: [...hashes, ...hashes].map(receipt),
        lookup: async (hash) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => {
                setTimeout(resolve, 2);
            });
            active--;
            return nimTx(hash);
        },
    });
    await fixture.run();
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(5);
    expect(fixture.requested).toHaveLength(12);
    expect((await fixture.downloads[0].text()).split('\r\n')).toHaveLength(13);
});

test('a lookup returning the wrong transaction cannot produce an incomplete CSV', async () => {
    const fixture = setUp({ receipts: [receipt(hashA)], lookup: async () => nimTx(hashB) });
    await expectPromptRejection(fixture.run());
    expect(fixture.downloads).toHaveLength(0);
});

test('an empty receipt list exports headers without connecting to the network', async () => {
    const fixture = setUp({
        network: () => {
            throw new Error('Unnecessary connection');
        },
    });
    await fixture.run();
    expect((await fixture.downloads[0].text()).split('\r\n')).toHaveLength(1);
});

test.each<[string, Options['fetch']]>([
    ['HTTP error', async () => ({ ok: false, json: async () => [] })],
    ['invalid receipt list', async () => ({ ok: true, json: async () => ({ error: 'unavailable' }) })],
    ['malformed receipt', async () => ({ ok: true, json: async () => [{ hash: 123, block_height: 2 }] })],
    ['pending response body', async () => ({ ok: true, json: pending })],
    ['pending fetch', pending],
])('%s is retried then rejected without a download', async (name, fetch) => {
    const fixture = setUp({ fetch });
    await expectPromptRejection(fixture.run());
    expect(fixture.downloads).toHaveLength(0);
    expect(fixture.fetchCalls).toBe(5);
    expect(fixture.timers.size).toBe(0);
    if (name.startsWith('pending')) expect(fixture.signals.every((signal) => signal?.aborted)).toBe(true);
});

test('an address lookup failure prevents export even if another address succeeded', async () => {
    const fixture = setUp({
        fetch: async (url) => {
            if (url.includes('/other/')) throw new Error('Offline');
            return { ok: true, json: async () => [] };
        },
    });
    await expectPromptRejection(fixture.run(ExportFormat.GENERIC, ['own', 'other']));
    expect(fixture.downloads).toHaveLength(0);
});

test('transient receipt failure recovers and cached transactions need no network', async () => {
    const fixture = setUp({
        cached: [nimTx(hashA)],
        network: pending,
        fetch: async (_url, _init, call) => {
            if (call === 1) throw new Error('Temporary');
            return { ok: true, json: async () => [receipt(hashA)] };
        },
    });
    await fixture.run();
    expect(fixture.downloads).toHaveLength(1);
    expect(fixture.fetchCalls).toBe(2);
    expect(fixture.timers.size).toBe(0);
});

test.each(['network', 'consensus', 'lookup'] as const)('a pending %s times out without downloading', async (stage) => {
    const fixture = setUp({ receipts: [receipt(hashA)], [stage]: pending });
    await expectPromptRejection(fixture.run());
    expect(fixture.downloads).toHaveLength(0);
    expect(fixture.timers.size).toBe(0);
});

test('a lookup resolving after timeout cannot write transactions or download', async () => {
    let resolveLookup: (tx: NimTx) => void = () => {};
    const fixture = setUp({
        receipts: [receipt(hashA)],
        lookup: () =>
            new Promise((resolve) => {
                resolveLookup = resolve;
            }),
    });
    await expectPromptRejection(fixture.run());
    resolveLookup(nimTx(hashA));
    await new Promise((resolve) => {
        setTimeout(resolve, 10);
    });
    expect(fixture.downloads).toHaveLength(0);
    expect(Object.keys(fixture.transactions)).toHaveLength(0);
});

test('fiat readiness checks every fetched record', async () => {
    const fixture = setUp({
        receipts: [receipt(hashA), receipt(hashB)],
        lookup: async (hash) => ({
            ...nimTx(hash),
            fiatValue: hash === hashA ? { usd: 1 } : undefined,
        }),
        onAdd: (transactions) => {
            setTimeout(() => {
                transactions[hashB] = { ...transactions[hashB], fiatValue: { usd: 7 } };
            }, 15);
        },
    });
    await fixture.run();
    expect(await fixture.downloads[0].text()).toMatch(/USD,7\.00/);
});

test('zero and known-unavailable fiat values finish without the ten-second wait', async () => {
    const fixture = setUp({
        receipts: [receipt(hashA), receipt(hashB)],
        lookup: async (hash) => ({
            ...nimTx(hash),
            fiatValue: { usd: hash === hashA ? 0 : null },
        }),
    });
    await fixture.run();
    expect(fixture.delays.filter((milliseconds) => milliseconds === 100).length).toBeLessThan(2);
    expect(fixture.downloads).toHaveLength(1);
});

test('missing fiat prices stop waiting after ten seconds and leave fiat columns blank', async () => {
    const fixture = setUp({
        receipts: [receipt(hashA)],
        lookup: async () => ({
            ...nimTx(hashA),
            fiatValue: undefined,
        }),
    });
    await fixture.run();
    expect(fixture.delays.filter((milliseconds) => milliseconds === 100)).toHaveLength(100);
    expect(await fixture.downloads[0].text()).not.toMatch(/USD/);
    expect(fixture.timers.size).toBe(0);
});

test('modal resets loading, shows a safe error and allows a successful retry', async () => {
    let offline = true;
    const fixture = setUp({
        fetch: async () => {
            if (offline) throw new Error('sensitive internal failure');
            return { ok: true, json: async () => [] };
        },
    });
    const modal = setUpModal();
    await modal.download();
    expect(modal.isExporting.value).toBe(false);
    expect(modal.exportError.value).toBeTruthy();
    expect(modal.exportError.value).not.toMatch(/sensitive/);
    offline = false;
    const retry = modal.download();
    expect(modal.exportError.value).toBe('');
    await retry;
    expect(modal.isExporting.value).toBe(false);
    expect(fixture.downloads).toHaveLength(1);
});

test('duplicate modal invocations start only one export', async () => {
    const fixture = setUp();
    const modal = setUpModal();
    await Promise.all([modal.download(), modal.download()]);
    expect(fixture.downloads).toHaveLength(1);
});

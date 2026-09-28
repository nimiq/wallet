// Run with: node --test scripts/test-csv-export.cjs
// The wallet has no test runner. Compile its real export code with the existing TypeScript
// dependency, replacing browser/network/store boundaries with isolated fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const receipt = (hash) => ({ hash, block_height: 2000000 });
const nimTx = (hash) => ({
    transactionHash: hash, sender: 'own', recipient: 'recipient', senderType: 0, recipientType: 0,
    value: 100000, fee: 0, data: { raw: '' }, proof: {}, timestamp: 1654041600, fiatValue: { usd: 1 },
});
const pending = () => new Promise(() => {});

function harness(t, options = {}) {
    const timers = new Set();
    const delays = [];
    const setTimer = (fn, ms) => {
        delays.push(ms);
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms >= 15000 ? 30 : 1);
        timers.add(id);
        return id;
    };
    const clearTimer = (id) => { timers.delete(id); clearTimeout(id); };
    t.after(() => timers.forEach(clearTimeout));
    const state = { transactions: Object.fromEntries((options.cached || []).map((tx) => [tx.transactionHash, tx])) };
    const downloads = [];
    const requested = [];
    const signals = [];
    let consensus = false;
    let fetchCalls = 0;
    const blobs = new Map();
    const client = {
        waitForConsensusEstablished: options.consensus || (async () => { consensus = true; }),
        getTransaction: async (hash) => {
            requested.push(hash);
            if (options.requireConsensus && !consensus) throw new Error('Not connected');
            return options.lookup ? options.lookup(hash) : nimTx(hash);
        },
    };
    const emptyStore = () => ({ state: { transactions: {} } });
    const imports = {
        'promise.allsettled': { shim() {} },
        '@nimiq/utils': { isHistorySupportedFiatCurrency: () => true, CurrencyInfo: class { decimals = 2; } },
        '@nimiq/fastspot-api': { SwapAsset: { EUR: 'EUR' } },
        config: { nimiqPay: { cosignerPublicKeys: [] }, polygon: { usdc: {}, usdc_bridged: {}, usdt_bridged: {} } },
        '../../network': { getNetworkClient: options.network || (async () => client) },
        '../../stores/Transactions': {
            toSecs: (n) => n > 1e12 ? n / 1000 : n,
            toMs: (n) => n < 1e12 ? n * 1000 : n,
            useTransactionsStore: () => ({ state, addTransactions: (txs) => {
                txs.forEach((tx) => { state.transactions[tx.transactionHash] = tx; });
                options.onAdd?.(state);
            } }),
        },
        '../../stores/BtcTransactions': { useBtcTransactionsStore: emptyStore },
        '../../stores/UsdcTransactions': { useUsdcTransactionsStore: emptyStore },
        '../../stores/UsdtTransactions': { useUsdtTransactionsStore: emptyStore },
        '../../stores/Fiat': { useFiatStore: () => ({ state: { currency: 'usd' } }) },
        '../../composables/useConfig': { useConfig: () => ({ config: { environment: 'main' } }) },
        '../Constants': { FiatCurrency: { USD: 'usd' }, ENV_MAIN: 'main' },
        '../../stores/Address': { useAddressStore: () => ({ state: { addressInfos: { own: { label: 'Test' } } } }) },
        '../../stores/Proxy': { useProxyStore: () => ({ state: { hubCashlinks: {} } }) },
        '../../stores/Swaps': { useSwapsStore: () => ({ getSwapByTransactionHash: { value: () => options.swap } }) },
        '../DataFormatting': { parseData: () => 'Test message' },
        '../ProxyDetection': { isProxyData: () => false, ProxyType: {} },
        '../../stores/Account': { useAccountStore: () => ({
            state: { accountInfos: { test: { label: 'Test', addresses: ['own'] } } },
            activeAccountInfo: { value: {
                addresses: ['own'], btcAddresses: { internal: [], external: [] }, label: 'Test',
            } },
        }) },
        './TransactionExport': { ExportFormat: { GENERIC: 'generic', BLOCKPIT: 'blockpit' } },
    };
    function load(file) {
        let source = fs.readFileSync(path.join(root, file), 'utf8');
        if (file.endsWith('.vue')) source = source.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1];
        const exports = {};
        vm.runInNewContext(ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
        }).outputText, {
            exports, require: (id) => {
                assert.ok(id in imports, `Unexpected import ${id}`);
                return imports[id];
            },
            window: { setTimeout: setTimer, clearTimeout: clearTimer },
            AbortController, Blob,
            URL: { createObjectURL: (blob) => { const url = `blob:${blobs.size}`; blobs.set(url, blob); return url; } },
            document: { createElement: () => ({
                setAttribute() {}, click() { downloads.push(blobs.get(this.href)); },
            }) },
            fetch: async (url, init) => {
                fetchCalls++;
                signals.push(init?.signal);
                if (options.fetch) return options.fetch(url, init, fetchCalls);
                return { ok: true, json: async () => options.receipts || [] };
            },
        }, { filename: file });
        return exports;
    }
    imports['./Format'] = load('src/lib/export/Format.ts');
    imports['./GenericFormat'] = load('src/lib/export/GenericFormat.ts');
    imports['./BlockpitAppFormat'] = load('src/lib/export/BlockpitAppFormat.ts');
    const exporter = load('src/lib/export/TransactionExport.ts');
    Object.assign(imports, {
        '@vue/composition-api': { defineComponent: (v) => v, ref: (value) => ({ value }) },
        '@nimiq/vue-components': {},
        '@/lib/useI18n': { useI18n: () => ({ $t: (v) => v }) },
        '../../lib/export/TransactionExport': exporter,
        './Modal.vue': {}, '../../lib/Constants': {}, '../ButtonGroup.vue': {},
    });
    const modal = load('src/components/modals/HistoryExportModal.vue').default.setup({ type: 'account' });
    modal.selectedYear.value = '2022';
    return {
        run: (format = 'generic', addresses = ['own']) => exporter.exportTransactions(
            addresses, { internal: [], external: [] }, [], [], 2022, format,
        ),
        GenericFormat: imports['./GenericFormat'].GenericFormat,
        BlockpitAppFormat: imports['./BlockpitAppFormat'].BlockpitAppFormat,
        modal, downloads, requested, signals, timers, delays, state,
        get fetchCalls() { return fetchCalls; },
    };
}

async function rejectsPromptly(promise) {
    let timeout;
    try {
        const outcome = await Promise.race([
            promise.then(() => 'downloaded', () => 'rejected'),
            new Promise((resolve) => { timeout = setTimeout(() => resolve('still pending'), 400); }),
        ]);
        assert.equal(outcome, 'rejected');
    } finally { clearTimeout(timeout); }
}

for (const format of ['GenericFormat', 'BlockpitAppFormat']) {
    test(`${format} exports NIM to BTC swaps with the swap note`, async (t) => {
        const h = harness(t, { swap: {
            in: { asset: 'NIM', transactionHash: hashA }, out: { asset: 'BTC', transactionHash: hashB },
        } });
        const btc = { transactionHash: hashB, inputs: [],
            outputs: [{ address: 'own-btc', value: 1000 }], timestamp: 1654041700 };
        new h[format](['own'], { internal: [], external: ['own-btc'] }, [], [], [nimTx(hashA), btc], 2022).export();
        const csv = await h.downloads[0].text();
        assert.equal(csv.split('\r\n').length, 2);
        assert.match(csv, /BTC,0\.00001,NIM,1/);
        assert.match(csv, /Swap NIM to BTC/);
    });
    test(`${format} preserves ordinary NIM messages`, async (t) => {
        const h = harness(t);
        new h[format](['own'], { internal: [], external: [] }, [], [], [nimTx(hashA)], 2022).export();
        assert.match(await h.downloads[0].text(), /Test message/);
    });
}

for (const format of ['generic', 'blockpit']) {
    for (const partial of [false, true]) {
        test(`${format} refuses a CSV when ${partial ? 'one' : 'all'} missing lookups fail`, async (t) => {
            const h = harness(t, {
                receipts: [receipt(hashA), receipt(hashB)],
                lookup: async (hash) => {
                    if (partial && hash === hashA) return nimTx(hash);
                    throw new Error('Unavailable transaction');
                },
            });
            await rejectsPromptly(h.run(format));
            assert.equal(h.downloads.length, 0);
        });
    }
}

test('waits for consensus and exports every retrieved transaction', async (t) => {
    const h = harness(t, { receipts: [receipt(hashA), receipt(hashB)], requireConsensus: true });
    await h.run();
    assert.equal(h.downloads.length, 1);
    assert.equal((await h.downloads[0].text()).split('\r\n').length, 3);
    assert.equal(h.timers.size, 0);
});

test('fetches a large history with bounded concurrency and deduplicates receipts', async (t) => {
    const hashes = Array.from({ length: 12 }, (_, i) => i.toString(16).padStart(64, '0'));
    let active = 0;
    let peak = 0;
    const h = harness(t, { receipts: [...hashes, ...hashes].map(receipt), lookup: async (hash) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
        return nimTx(hash);
    } });
    await h.run();
    assert.ok(peak > 1 && peak <= 5, `Peak transaction requests: ${peak}`);
    assert.equal(h.requested.length, 12);
    assert.equal((await h.downloads[0].text()).split('\r\n').length, 13);
});

test('a lookup returning the wrong transaction cannot produce an incomplete CSV', async (t) => {
    const h = harness(t, { receipts: [receipt(hashA)], lookup: async () => nimTx(hashB) });
    await rejectsPromptly(h.run());
    assert.equal(h.downloads.length, 0);
});

test('an empty receipt list exports headers without connecting to the network', async (t) => {
    const h = harness(t, { network: () => { throw new Error('Unnecessary connection'); } });
    await h.run();
    assert.equal((await h.downloads[0].text()).split('\r\n').length, 1);
});

for (const [name, fetch] of [
    ['HTTP error', async () => ({ ok: false, json: async () => [] })],
    ['invalid receipt list', async () => ({ ok: true, json: async () => ({ error: 'unavailable' }) })],
    ['malformed receipt', async () => ({ ok: true, json: async () => [{ hash: 123, block_height: 2 }] })],
    ['pending response body', async () => ({ ok: true, json: pending })],
    ['pending fetch', pending],
]) {
    test(`${name} is retried then rejected without a download`, async (t) => {
        const h = harness(t, { fetch });
        await rejectsPromptly(h.run());
        assert.equal(h.downloads.length, 0);
        assert.equal(h.fetchCalls, 5);
        assert.equal(h.timers.size, 0);
        if (name.startsWith('pending')) assert.ok(h.signals.every((signal) => signal?.aborted));
    });
}

test('an address lookup failure prevents export even if another address succeeded', async (t) => {
    const h = harness(t, { fetch: async (url) => {
        if (url.includes('/other/')) throw new Error('Offline');
        return { ok: true, json: async () => [] };
    } });
    await rejectsPromptly(h.run('generic', ['own', 'other']));
    assert.equal(h.downloads.length, 0);
});

test('transient receipt failure recovers and cached transactions need no network', async (t) => {
    const h = harness(t, { cached: [nimTx(hashA)], network: pending,
        fetch: async (_url, _init, attempt) => {
            if (attempt === 1) throw new Error('Temporary');
            return { ok: true, json: async () => [receipt(hashA)] };
        } });
    await h.run();
    assert.equal(h.downloads.length, 1);
    assert.equal(h.fetchCalls, 2);
    assert.equal(h.timers.size, 0);
});

for (const stage of ['network', 'consensus', 'lookup']) {
    test(`a pending ${stage} times out without downloading`, async (t) => {
        const h = harness(t, { receipts: [receipt(hashA)], [stage]: pending });
        await rejectsPromptly(h.run());
        assert.equal(h.downloads.length, 0);
        assert.equal(h.timers.size, 0);
    });
}

test('a lookup resolving after timeout cannot write transactions or download', async (t) => {
    let resolveLookup;
    const h = harness(t, { receipts: [receipt(hashA)], lookup: () => new Promise((resolve) => { resolveLookup = resolve; }) });
    await rejectsPromptly(h.run());
    resolveLookup(nimTx(hashA));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.downloads.length, 0);
    assert.equal(Object.keys(h.state.transactions).length, 0);
});

test('fiat readiness checks every fetched record', async (t) => {
    const h = harness(t, { receipts: [receipt(hashA), receipt(hashB)], lookup: async (hash) => ({
        ...nimTx(hash), fiatValue: hash === hashA ? { usd: 1 } : undefined,
    }), onAdd: (state) => {
        setTimeout(() => { state.transactions[hashB] = { ...state.transactions[hashB], fiatValue: { usd: 7 } }; }, 15);
    } });
    await h.run();
    const csv = await h.downloads[0].text();
    assert.match(csv, /USD,7\.00/);
});

test('zero and known-unavailable fiat values finish without the ten-second wait', async (t) => {
    const h = harness(t, { receipts: [receipt(hashA), receipt(hashB)], lookup: async (hash) => ({
        ...nimTx(hash), fiatValue: { usd: hash === hashA ? 0 : null },
    }) });
    await h.run();
    assert.ok(h.delays.filter((ms) => ms === 100).length < 2);
    assert.equal(h.downloads.length, 1);
});

test('missing fiat prices stop waiting after ten seconds and leave fiat columns blank', async (t) => {
    const h = harness(t, { receipts: [receipt(hashA)], lookup: async () => ({
        ...nimTx(hashA), fiatValue: undefined,
    }) });
    await h.run();
    assert.equal(h.delays.filter((ms) => ms === 100).length, 100);
    assert.doesNotMatch(await h.downloads[0].text(), /USD/);
    assert.equal(h.timers.size, 0);
});

test('modal resets loading, shows a safe error and allows a successful retry', async (t) => {
    let offline = true;
    const h = harness(t, { fetch: async () => {
        if (offline) throw new Error('sensitive internal failure');
        return { ok: true, json: async () => [] };
    } });
    await h.modal.download();
    assert.equal(h.modal.isExporting.value, false);
    assert.ok(h.modal.exportError.value);
    assert.doesNotMatch(h.modal.exportError.value, /sensitive/);
    offline = false;
    const retry = h.modal.download();
    assert.equal(h.modal.exportError.value, '');
    await retry;
    assert.equal(h.modal.isExporting.value, false);
    assert.equal(h.downloads.length, 1);
});

test('duplicate modal invocations start only one export', async (t) => {
    const h = harness(t);
    await Promise.all([h.modal.download(), h.modal.download()]);
    assert.equal(h.downloads.length, 1);
});

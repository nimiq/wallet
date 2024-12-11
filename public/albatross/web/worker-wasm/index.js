let wasm_bindgen;
(function() {
    const __exports = {};
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }
    let wasm = undefined;

    let WASM_VECTOR_LEN = 0;

    let cachedUint8ArrayMemory0 = null;

    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

    const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
        ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
        : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });

    function passStringToWasm0(arg, malloc, realloc) {

        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }

        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = encodeString(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    let cachedDataViewMemory0 = null;

    function getDataViewMemory0() {
        if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
            cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
        }
        return cachedDataViewMemory0;
    }

    const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

    if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    function addToExternrefTable0(obj) {
        const idx = wasm.__externref_table_alloc();
        wasm.__wbindgen_export_4.set(idx, obj);
        return idx;
    }

    function handleError(f, args) {
        try {
            return f.apply(this, args);
        } catch (e) {
            const idx = addToExternrefTable0(e);
            wasm.__wbindgen_exn_store(idx);
        }
    }

    function getArrayU8FromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
    }

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(state => {
        wasm.__wbindgen_export_5.get(state.dtor)(state.a, state.b)
    });

    function makeMutClosure(arg0, arg1, dtor, f) {
        const state = { a: arg0, b: arg1, cnt: 1, dtor };
        const real = (...args) => {
            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            const a = state.a;
            state.a = 0;
            try {
                return f(a, state.b, ...args);
            } finally {
                if (--state.cnt === 0) {
                    wasm.__wbindgen_export_5.get(state.dtor)(a, state.b);
                    CLOSURE_DTORS.unregister(state);
                } else {
                    state.a = a;
                }
            }
        };
        real.original = state;
        CLOSURE_DTORS.register(real, state, state);
        return real;
    }

    function makeClosure(arg0, arg1, dtor, f) {
        const state = { a: arg0, b: arg1, cnt: 1, dtor };
        const real = (...args) => {
            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            try {
                return f(state.a, state.b, ...args);
            } finally {
                if (--state.cnt === 0) {
                    wasm.__wbindgen_export_5.get(state.dtor)(state.a, state.b);
                    state.a = 0;
                    CLOSURE_DTORS.unregister(state);
                }
            }
        };
        real.original = state;
        CLOSURE_DTORS.register(real, state, state);
        return real;
    }

    function debugString(val) {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debugString(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debugString(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches && builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
            return `${val.name}: ${val.message}\n${val.stack}`;
        }
        // TODO we could test for more things here, like `Set`s and `Map`s.
        return className;
    }

    function passArray8ToWasm0(arg, malloc) {
        const ptr = malloc(arg.length * 1, 1) >>> 0;
        getUint8ArrayMemory0().set(arg, ptr / 1);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    function takeFromExternrefTable0(idx) {
        const value = wasm.__wbindgen_export_4.get(idx);
        wasm.__externref_table_dealloc(idx);
        return value;
    }

    function _assertClass(instance, klass) {
        if (!(instance instanceof klass)) {
            throw new Error(`expected instance of ${klass.name}`);
        }
    }
    function __wbg_adapter_52(arg0, arg1, arg2) {
        wasm.closure649_externref_shim(arg0, arg1, arg2);
    }

    function __wbg_adapter_55(arg0, arg1, arg2) {
        wasm.closure1713_externref_shim(arg0, arg1, arg2);
    }

    function __wbg_adapter_62(arg0, arg1) {
        wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hd7899ddf60e50ca1(arg0, arg1);
    }

    function __wbg_adapter_65(arg0, arg1) {
        wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h27e2e55155cec891(arg0, arg1);
    }

    function __wbg_adapter_68(arg0, arg1, arg2) {
        wasm.closure2644_externref_shim(arg0, arg1, arg2);
    }

    function __wbg_adapter_324(arg0, arg1, arg2, arg3) {
        wasm.closure2846_externref_shim(arg0, arg1, arg2, arg3);
    }

    /**
     * @enum {0 | 1 | 2 | 3}
     */
    __exports.AccountType = Object.freeze({
        Basic: 0, "0": "Basic",
        Vesting: 1, "1": "Vesting",
        HTLC: 2, "2": "HTLC",
        Staking: 3, "3": "Staking",
    });
    /**
     * A transaction flag signals a special purpose of the transaction. `ContractCreation` must be set
     * to create new vesting contracts or HTLCs. `Signaling` must be set to interact with the staking
     * contract for non-value transactions. All other transactions' flag is set to `None`.
     * @enum {0 | 1 | 2}
     */
    __exports.TransactionFlag = Object.freeze({
        None: 0, "0": "None",
        ContractCreation: 1, "1": "ContractCreation",
        Signaling: 2, "2": "Signaling",
    });
    /**
     * @enum {0 | 1}
     */
    __exports.TransactionFormat = Object.freeze({
        Basic: 0, "0": "Basic",
        Extended: 1, "1": "Extended",
    });

    const __wbindgen_enum_BinaryType = ["blob", "arraybuffer"];

    const AddressFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_address_free(ptr >>> 0, 1));
    /**
     * An object representing a Nimiq address.
     * Offers methods to parse and format addresses from and to strings.
     */
    class Address {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(Address.prototype);
            obj.__wbg_ptr = ptr;
            AddressFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            AddressFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_address_free(ptr, 0);
        }
        /**
         * @param {Uint8Array} bytes
         */
        constructor(bytes) {
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.address_new(ptr0, len0);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            this.__wbg_ptr = ret[0] >>> 0;
            AddressFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * Deserializes an address from a byte array.
         * @param {Uint8Array} bytes
         * @returns {Address}
         */
        static deserialize(bytes) {
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.address_deserialize(ptr0, len0);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Address.__wrap(ret[0]);
        }
        /**
         * Parses an address from an {@link Address} instance, a hex string representation, or a byte array.
         *
         * Throws when an address cannot be parsed from the argument.
         * @param {string | Uint8Array} addr
         * @returns {Address}
         */
        static fromAny(addr) {
            const ret = wasm.address_fromAny(addr);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Address.__wrap(ret[0]);
        }
        /**
         * Parses an address from a string representation, either user-friendly or hex format.
         *
         * Throws when an address cannot be parsed from the string.
         * @param {string} str
         * @returns {Address}
         */
        static fromString(str) {
            const ptr0 = passStringToWasm0(str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.address_fromString(ptr0, len0);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Address.__wrap(ret[0]);
        }
        /**
         * Formats the address into a plain string format.
         * @returns {string}
         */
        toPlain() {
            let deferred1_0;
            let deferred1_1;
            try {
                const ret = wasm.address_toPlain(this.__wbg_ptr);
                deferred1_0 = ret[0];
                deferred1_1 = ret[1];
                return getStringFromWasm0(ret[0], ret[1]);
            } finally {
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }
    }
    __exports.Address = Address;

    const ClientFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_client_free(ptr >>> 0, 1));
    /**
     * Nimiq Albatross client that runs in browsers via WASM and is exposed to Javascript.
     *
     * ### Usage:
     *
     * ```js
     * import init, * as Nimiq from "./pkg/nimiq_web_client.js";
     *
     * init().then(async () => {
     *     const config = new Nimiq.ClientConfiguration();
     *     const client = await config.instantiateClient();
     *     // ...
     * });
     * ```
     */
    class Client {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(Client.prototype);
            obj.__wbg_ptr = ptr;
            ClientFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ClientFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_client_free(ptr, 0);
        }
        /**
         * Creates a new Client that automatically starts connecting to the network.
         * @param {PlainClientConfiguration} config
         * @returns {Promise<Client>}
         */
        static create(config) {
            const ret = wasm.client_create(config);
            return ret;
        }
        /**
         * Adds an event listener for consensus-change events, such as when consensus is established or lost.
         * @param {(state: ConsensusState) => any} listener
         * @returns {Promise<number>}
         */
        addConsensusChangedListener(listener) {
            const ret = wasm.client_addConsensusChangedListener(this.__wbg_ptr, listener);
            return ret;
        }
        /**
         * Adds an event listener for new blocks added to the blockchain.
         * @param {(hash: string, reason: string, reverted_blocks: string[], adopted_blocks: string[]) => any} listener
         * @returns {Promise<number>}
         */
        addHeadChangedListener(listener) {
            const ret = wasm.client_addHeadChangedListener(this.__wbg_ptr, listener);
            return ret;
        }
        /**
         * Adds an event listener for peer-change events, such as when a new peer joins, or a peer leaves.
         * @param {(peer_id: string, reason: 'joined' | 'left', peer_count: number, peer_info?: PlainPeerInfo) => any} listener
         * @returns {Promise<number>}
         */
        addPeerChangedListener(listener) {
            const ret = wasm.client_addPeerChangedListener(this.__wbg_ptr, listener);
            return ret;
        }
        /**
         * Adds an event listener for transactions to and from the provided addresses.
         *
         * The listener is called for transactions when they are _included_ in the blockchain.
         * @param {(transaction: PlainTransactionDetails) => any} listener
         * @param {(string | Uint8Array)[]} addresses
         * @returns {Promise<number>}
         */
        addTransactionListener(listener, addresses) {
            const ret = wasm.client_addTransactionListener(this.__wbg_ptr, listener, addresses);
            return ret;
        }
        /**
         * Removes an event listener by its handle.
         * @param {number} handle
         * @returns {Promise<void>}
         */
        removeListener(handle) {
            const ret = wasm.client_removeListener(this.__wbg_ptr, handle);
            return ret;
        }
        /**
         * Returns the network ID that the client is connecting to.
         * @returns {Promise<number>}
         */
        getNetworkId() {
            const ret = wasm.client_getNetworkId(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns if the client currently has consensus with the network.
         * @returns {Promise<boolean>}
         */
        isConsensusEstablished() {
            const ret = wasm.client_isConsensusEstablished(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns a promise that resolves when the client has established consensus with the network.
         * @returns {Promise<void>}
         */
        waitForConsensusEstablished() {
            const ret = wasm.client_waitForConsensusEstablished(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns the block hash of the current blockchain head.
         * @returns {Promise<string>}
         */
        getHeadHash() {
            const ret = wasm.client_getHeadHash(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns the block number of the current blockchain head.
         * @returns {Promise<number>}
         */
        getHeadHeight() {
            const ret = wasm.client_getHeadHeight(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns the current blockchain head block.
         * Note that the web client is a light client and does not have block bodies, i.e. no transactions.
         * @returns {Promise<PlainBlock>}
         */
        getHeadBlock() {
            const ret = wasm.client_getHeadBlock(this.__wbg_ptr);
            return ret;
        }
        /**
         * Returns the current address books peers.
         * Each peer will have one address and currently no guarantee for the usefulness of that address can be given.
         *
         * The resulting Array may be empty if there is no peers in the address book.
         * @returns {Promise<PlainPeerInfo[]>}
         */
        getAddressBook() {
            const ret = wasm.client_getAddressBook(this.__wbg_ptr);
            return ret;
        }
        /**
         * Fetches a block by its hash.
         *
         * Throws if the client does not have the block.
         *
         * Fetching blocks from the network is not yet available.
         * @param {string} hash
         * @returns {Promise<PlainBlock>}
         */
        getBlock(hash) {
            const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.client_getBlock(this.__wbg_ptr, ptr0, len0);
            return ret;
        }
        /**
         * Fetches a block by its height (block number).
         *
         * Throws if the client does not have the block.
         *
         * Fetching blocks from the network is not yet available.
         * @param {number} height
         * @returns {Promise<PlainBlock>}
         */
        getBlockAt(height) {
            const ret = wasm.client_getBlockAt(this.__wbg_ptr, height);
            return ret;
        }
        /**
         * Fetches the account for the provided address from the network.
         *
         * Throws if the address cannot be parsed and on network errors.
         * @param {string | Uint8Array} address
         * @returns {Promise<PlainAccount>}
         */
        getAccount(address) {
            const ret = wasm.client_getAccount(this.__wbg_ptr, address);
            return ret;
        }
        /**
         * Fetches the accounts for the provided addresses from the network.
         *
         * Throws if an address cannot be parsed and on network errors.
         * @param {(string | Uint8Array)[]} addresses
         * @returns {Promise<PlainAccount[]>}
         */
        getAccounts(addresses) {
            const ret = wasm.client_getAccounts(this.__wbg_ptr, addresses);
            return ret;
        }
        /**
         * Fetches the staker for the provided address from the network.
         *
         * Throws if the address cannot be parsed and on network errors.
         * @param {string | Uint8Array} address
         * @returns {Promise<PlainStaker | undefined>}
         */
        getStaker(address) {
            const ret = wasm.client_getStaker(this.__wbg_ptr, address);
            return ret;
        }
        /**
         * Fetches the stakers for the provided addresses from the network.
         *
         * Throws if an address cannot be parsed and on network errors.
         * @param {(string | Uint8Array)[]} addresses
         * @returns {Promise<(PlainStaker | undefined)[]>}
         */
        getStakers(addresses) {
            const ret = wasm.client_getStakers(this.__wbg_ptr, addresses);
            return ret;
        }
        /**
         * Fetches the validator for the provided address from the network.
         *
         * Throws if the address cannot be parsed and on network errors.
         * @param {string | Uint8Array} address
         * @returns {Promise<PlainValidator | undefined>}
         */
        getValidator(address) {
            const ret = wasm.client_getValidator(this.__wbg_ptr, address);
            return ret;
        }
        /**
         * Fetches the validators for the provided addresses from the network.
         *
         * Throws if an address cannot be parsed and on network errors.
         * @param {(string | Uint8Array)[]} addresses
         * @returns {Promise<(PlainValidator | undefined)[]>}
         */
        getValidators(addresses) {
            const ret = wasm.client_getValidators(this.__wbg_ptr, addresses);
            return ret;
        }
        /**
         * Sends a transaction to the network and returns {@link PlainTransactionDetails}.
         *
         * Throws in case of network errors.
         * @param {PlainTransaction | string | Uint8Array} transaction
         * @returns {Promise<PlainTransactionDetails>}
         */
        sendTransaction(transaction) {
            const ret = wasm.client_sendTransaction(this.__wbg_ptr, transaction);
            return ret;
        }
        /**
         * Fetches the transaction details for the given transaction hash.
         * @param {string} hash
         * @returns {Promise<PlainTransactionDetails>}
         */
        getTransaction(hash) {
            const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.client_getTransaction(this.__wbg_ptr, ptr0, len0);
            return ret;
        }
        /**
         * This function is used to query the network for transaction receipts from and to a
         * specific address, that have been included in the chain.
         *
         * The obtained receipts are _not_ verified before being returned.
         *
         * Up to a `limit` number of transaction receipts are returned from newest to oldest.
         * It starts at the `start_at` transaction and goes backwards. If this hash does not exist
         * or does not belong to the address, an empty list is returned.
         * If the network does not have at least `min_peers` to query, then an error is returned.
         * @param {string | Uint8Array} address
         * @param {number | undefined} [limit]
         * @param {string | undefined} [start_at]
         * @param {number | undefined} [min_peers]
         * @returns {Promise<PlainTransactionReceipt[]>}
         */
        getTransactionReceiptsByAddress(address, limit, start_at, min_peers) {
            var ptr0 = isLikeNone(start_at) ? 0 : passStringToWasm0(start_at, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.client_getTransactionReceiptsByAddress(this.__wbg_ptr, address, isLikeNone(limit) ? 0xFFFFFF : limit, ptr0, len0, isLikeNone(min_peers) ? 0x100000001 : (min_peers) >>> 0);
            return ret;
        }
        /**
         * This function is used to query the network for transactions from and to a specific
         * address, that have been included in the chain.
         *
         * The obtained transactions are verified before being returned.
         *
         * If you already have transactions belonging to this address, you can provide some of that
         * information to reduce the amount of network requests made:
         * - Provide the `since_block_height` parameter to exclude any history from before
         *   that block height. You should be completely certain about its state. This should not be
         *   the last known block height, but an earlier block height that could not have been forked
         *   from (e.g. the last known election or checkpoint block).
         * - Provide a list of `known_transaction_details` to have them verified and/or broadcasted
         *   again.
         * - Provide a `start_at` parameter to start the query at a specific transaction hash
         *   (which will not be included). This hash must exist and the corresponding transaction
         *   must involve this address for the query to work correctly.
         *
         * Up to a `limit` number of transactions are returned from newest to oldest.
         * If the network does not have at least `min_peers` to query, an error is returned.
         * @param {string | Uint8Array} address
         * @param {number | undefined} [since_block_height]
         * @param {PlainTransactionDetails[] | undefined} [known_transaction_details]
         * @param {string | undefined} [start_at]
         * @param {number | undefined} [limit]
         * @param {number | undefined} [min_peers]
         * @returns {Promise<PlainTransactionDetails[]>}
         */
        getTransactionsByAddress(address, since_block_height, known_transaction_details, start_at, limit, min_peers) {
            var ptr0 = isLikeNone(start_at) ? 0 : passStringToWasm0(start_at, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.client_getTransactionsByAddress(this.__wbg_ptr, address, isLikeNone(since_block_height) ? 0x100000001 : (since_block_height) >>> 0, isLikeNone(known_transaction_details) ? 0 : addToExternrefTable0(known_transaction_details), ptr0, len0, isLikeNone(limit) ? 0xFFFFFF : limit, isLikeNone(min_peers) ? 0x100000001 : (min_peers) >>> 0);
            return ret;
        }
        /**
         * This function is used to tell the network to disconnect from every connected
         * peer and stop trying to connect to other peers.
         *
         * **Important**: this function returns when the signal to disconnect was sent,
         * before all peers actually disconnect. This means that in order to ensure the
         * network is disconnected, wait for all peers to disappear after calling.
         * @returns {Promise<void>}
         */
        disconnectNetwork() {
            const ret = wasm.client_disconnectNetwork(this.__wbg_ptr);
            return ret;
        }
        /**
         * This function is used to tell the network to (re)start connecting to peers.
         * This is could be used to tell the network to restart connection operations after
         * disconnect network is called.
         * @returns {Promise<void>}
         */
        connectNetwork() {
            const ret = wasm.client_connectNetwork(this.__wbg_ptr);
            return ret;
        }
    }
    __exports.Client = Client;

    const ClientConfigurationFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_clientconfiguration_free(ptr >>> 0, 1));
    /**
     * Use this to provide initialization-time configuration to the Client.
     * This is a simplified version of the configuration that is used for regular nodes,
     * since not all configuration knobs are available when running inside a browser.
     */
    class ClientConfiguration {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ClientConfigurationFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_clientconfiguration_free(ptr, 0);
        }
    }
    __exports.ClientConfiguration = ClientConfiguration;

    const HashedTimeLockedContractFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_hashedtimelockedcontract_free(ptr >>> 0, 1));
    /**
     * Utility class providing methods to parse Hashed Time Locked Contract transaction data and proofs.
     */
    class HashedTimeLockedContract {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            HashedTimeLockedContractFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_hashedtimelockedcontract_free(ptr, 0);
        }
    }
    __exports.HashedTimeLockedContract = HashedTimeLockedContract;

    const PolicyFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_policy_free(ptr >>> 0, 1));

    class Policy {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            PolicyFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_policy_free(ptr, 0);
        }
        /**
         * Number of batches a transaction is valid with Albatross consensus.
         * @returns {number}
         */
        static get TRANSACTION_VALIDITY_WINDOW() {
            const ret = wasm.policy_transaction_validity_window();
            return ret >>> 0;
        }
        /**
         * Number of blocks a transaction is valid with Albatross consensus.
         * @returns {number}
         */
        static get TRANSACTION_VALIDITY_WINDOW_BLOCKS() {
            const ret = wasm.policy_transaction_validity_window_blocks();
            return ret >>> 0;
        }
        /**
         * How many batches constitute an epoch
         * @returns {number}
         */
        static get BATCHES_PER_EPOCH() {
            const ret = wasm.policy_batches_per_epoch();
            return ret;
        }
        /**
         * Length of a batch including the macro block
         * @returns {number}
         */
        static get BLOCKS_PER_BATCH() {
            const ret = wasm.policy_blocks_per_batch();
            return ret >>> 0;
        }
        /**
         * Length of an epoch including the election block
         * @returns {number}
         */
        static get BLOCKS_PER_EPOCH() {
            const ret = wasm.policy_blocks_per_epoch();
            return ret >>> 0;
        }
        /**
         * Genesis block number
         * @returns {number}
         */
        static get GENESIS_BLOCK_NUMBER() {
            const ret = wasm.policy_genesis_block_number();
            return ret >>> 0;
        }
        /**
         * Maximum size of accounts trie chunks.
         * @returns {number}
         */
        static get STATE_CHUNKS_MAX_SIZE() {
            const ret = wasm.policy_state_chunks_max_size();
            return ret >>> 0;
        }
        /**
         * Returns the epoch number at a given block number (height).
         * @param {number} block_number
         * @returns {number}
         */
        static epochAt(block_number) {
            const ret = wasm.policy_epochAt(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the epoch index at a given block number. The epoch index is the number of a block relative
         * to the epoch it is in. For example, the first block of any epoch always has an epoch index of 0.
         * @param {number} block_number
         * @returns {number}
         */
        static epochIndexAt(block_number) {
            const ret = wasm.policy_epochIndexAt(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the batch number at a given `block_number` (height)
         * @param {number} block_number
         * @returns {number}
         */
        static batchAt(block_number) {
            const ret = wasm.policy_batchAt(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the batch index at a given block number. The batch index is the number of a block relative
         * to the batch it is in. For example, the first block of any batch always has an batch index of 0.
         * @param {number} block_number
         * @returns {number}
         */
        static batchIndexAt(block_number) {
            const ret = wasm.policy_batchIndexAt(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the number (height) of the next election macro block after a given block number (height).
         * @param {number} block_number
         * @returns {number}
         */
        static electionBlockAfter(block_number) {
            const ret = wasm.policy_electionBlockAfter(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the block number (height) of the preceding election macro block before a given block number (height).
         * If the given block number is an election macro block, it returns the election macro block before it.
         * @param {number} block_number
         * @returns {number}
         */
        static electionBlockBefore(block_number) {
            const ret = wasm.policy_electionBlockBefore(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the block number (height) of the last election macro block at a given block number (height).
         * If the given block number is an election macro block, then it returns that block number.
         * @param {number} block_number
         * @returns {number}
         */
        static lastElectionBlock(block_number) {
            const ret = wasm.policy_lastElectionBlock(block_number);
            return ret >>> 0;
        }
        /**
         * Returns a boolean expressing if the block at a given block number (height) is an election macro block.
         * @param {number} block_number
         * @returns {boolean}
         */
        static isElectionBlockAt(block_number) {
            const ret = wasm.policy_isElectionBlockAt(block_number);
            return ret !== 0;
        }
        /**
         * Returns the block number (height) of the next macro block after a given block number (height).
         * If the given block number is a macro block, it returns the macro block after it.
         * @param {number} block_number
         * @returns {number}
         */
        static macroBlockAfter(block_number) {
            const ret = wasm.policy_macroBlockAfter(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the block number (height) of the preceding macro block before a given block number (height).
         * If the given block number is a macro block, it returns the macro block before it.
         * @param {number} block_number
         * @returns {number}
         */
        static macroBlockBefore(block_number) {
            const ret = wasm.policy_macroBlockBefore(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the block number (height) of the last macro block at a given block number (height).
         * If the given block number is a macro block, then it returns that block number.
         * @param {number} block_number
         * @returns {number}
         */
        static lastMacroBlock(block_number) {
            const ret = wasm.policy_lastMacroBlock(block_number);
            return ret >>> 0;
        }
        /**
         * Returns a boolean expressing if the block at a given block number (height) is a macro block.
         * @param {number} block_number
         * @returns {boolean}
         */
        static isMacroBlockAt(block_number) {
            const ret = wasm.policy_isMacroBlockAt(block_number);
            return ret !== 0;
        }
        /**
         * Returns a boolean expressing if the block at a given block number (height) is a micro block.
         * @param {number} block_number
         * @returns {boolean}
         */
        static isMicroBlockAt(block_number) {
            const ret = wasm.policy_isMicroBlockAt(block_number);
            return ret !== 0;
        }
        /**
         * Returns the block number of the first block of the given epoch (which is always a micro block).
         * If the index is out of bounds, None is returned
         * @param {number} epoch
         * @returns {number | undefined}
         */
        static firstBlockOf(epoch) {
            const ret = wasm.policy_firstBlockOf(epoch);
            return ret === 0x100000001 ? undefined : ret;
        }
        /**
         * Returns the block number of the first block of the given batch (which is always a micro block).
         * If the index is out of bounds, None is returned
         * @param {number} batch
         * @returns {number | undefined}
         */
        static firstBlockOfBatch(batch) {
            const ret = wasm.policy_firstBlockOfBatch(batch);
            return ret === 0x100000001 ? undefined : ret;
        }
        /**
         * Returns the block number of the election macro block of the given epoch (which is always the last block).
         * If the index is out of bounds, None is returned
         * @param {number} epoch
         * @returns {number | undefined}
         */
        static electionBlockOf(epoch) {
            const ret = wasm.policy_electionBlockOf(epoch);
            return ret === 0x100000001 ? undefined : ret;
        }
        /**
         * Returns the block number of the macro block (checkpoint or election) of the given batch (which
         * is always the last block).
         * If the index is out of bounds, None is returned
         * @param {number} batch
         * @returns {number | undefined}
         */
        static macroBlockOf(batch) {
            const ret = wasm.policy_macroBlockOf(batch);
            return ret === 0x100000001 ? undefined : ret;
        }
        /**
         * Returns a boolean expressing if the batch at a given block number (height) is the first batch
         * of the epoch.
         * @param {number} block_number
         * @returns {boolean}
         */
        static firstBatchOfEpoch(block_number) {
            const ret = wasm.policy_firstBatchOfEpoch(block_number);
            return ret !== 0;
        }
        /**
         * Returns the block height for the last block of the reporting window of a given block number.
         * Note: This window is meant for reporting malicious behaviour (aka `jailable` behaviour).
         * @param {number} block_number
         * @returns {number}
         */
        static lastBlockOfReportingWindow(block_number) {
            const ret = wasm.policy_lastBlockOfReportingWindow(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the first block after the reporting window of a given block number has ended.
         * @param {number} block_number
         * @returns {number}
         */
        static blockAfterReportingWindow(block_number) {
            const ret = wasm.policy_blockAfterReportingWindow(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the first block after the jail period of a given block number has ended.
         * @param {number} block_number
         * @returns {number}
         */
        static blockAfterJail(block_number) {
            const ret = wasm.policy_blockAfterJail(block_number);
            return ret >>> 0;
        }
        /**
         * Returns the supply at a given time (as Unix time) in Lunas (1 NIM = 100,000 Lunas). It is
         * calculated using the following formula:
         * ```text
         * supply(t) = total_supply - (total_supply - genesis_supply) * supply_decay^t
         * ```
         * Where t is the time in milliseconds since the PoS genesis block and `genesis_supply` is the supply at
         * the genesis of the Nimiq 2.0 chain.
         * @param {bigint} genesis_supply
         * @param {bigint} genesis_time
         * @param {bigint} current_time
         * @returns {bigint}
         */
        static supplyAt(genesis_supply, genesis_time, current_time) {
            const ret = wasm.policy_supplyAt(genesis_supply, genesis_time, current_time);
            return BigInt.asUintN(64, ret);
        }
        /**
         * Returns the percentage reduction that should be applied to the rewards due to a delayed batch.
         * This function returns a float in the range [0, 1]
         * I.e 1 means that the full rewards should be given, whereas 0.5 means that half of the rewards should be given
         * The input to this function is the batch delay, in milliseconds
         * The function is: [(1 - MINIMUM_REWARDS_PERCENTAGE) * BLOCKS_DELAY_DECAY ^ (t^2)] + MINIMUM_REWARDS_PERCENTAGE
         * @param {bigint} delay
         * @returns {number}
         */
        static batchDelayPenalty(delay) {
            const ret = wasm.policy_batchDelayPenalty(delay);
            return ret;
        }
        /**
         * This is the address for the staking contract.
         * @returns {string}
         */
        static get STAKING_CONTRACT_ADDRESS() {
            let deferred1_0;
            let deferred1_1;
            try {
                const ret = wasm.policy_wasm_staking_contract_address();
                deferred1_0 = ret[0];
                deferred1_1 = ret[1];
                return getStringFromWasm0(ret[0], ret[1]);
            } finally {
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * This is the address for the coinbase. Note that this is not a real account, it is just the
         * address we use to denote that some coins originated from a coinbase event.
         * @returns {string}
         */
        static get COINBASE_ADDRESS() {
            let deferred1_0;
            let deferred1_1;
            try {
                const ret = wasm.policy_wasm_coinbase_address();
                deferred1_0 = ret[0];
                deferred1_1 = ret[1];
                return getStringFromWasm0(ret[0], ret[1]);
            } finally {
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * The maximum allowed size, in bytes, for a micro block body.
         * @returns {number}
         */
        static get MAX_SIZE_MICRO_BODY() {
            const ret = wasm.policy_wasm_max_size_micro_body();
            return ret >>> 0;
        }
        /**
         * The current version number of the protocol. Changing this always results in a hard fork.
         * @returns {number}
         */
        static get VERSION() {
            const ret = wasm.policy_wasm_min_epochs_stored();
            return ret;
        }
        /**
         * Number of available validator slots. Note that a single validator may own several validator slots.
         * @returns {number}
         */
        static get SLOTS() {
            const ret = wasm.policy_wasm_slots();
            return ret;
        }
        /**
         * Calculates 2f+1 slots which is the minimum number of slots necessary to produce a macro block,
         * a skip block and other actions.
         * It is also the minimum number of slots necessary to be guaranteed to have a majority of honest
         * slots. That's because from a total of 3f+1 slots at most f will be malicious. If in a group of
         * 2f+1 slots we have f malicious ones (which is the worst case scenario), that still leaves us
         * with f+1 honest slots. Which is more than the f slots that are not in this group (which must all
         * be honest).
         * It is calculated as `ceil(SLOTS*2/3)` and we use the formula `ceil(x/y) = (x+y-1)/y` for the
         * ceiling division.
         * @returns {number}
         */
        static get TWO_F_PLUS_ONE() {
            const ret = wasm.policy_wasm_two_f_plus_one();
            return ret;
        }
        /**
         * Calculates f+1 slots which is the minimum number of slots necessary to be guaranteed to have at
         * least one honest slots. That's because from a total of 3f+1 slots at most f will be malicious.
         * It is calculated as `ceil(SLOTS/3)` and we use the formula `ceil(x/y) = (x+y-1)/y` for the
         * ceiling division.
         * @returns {number}
         */
        static get F_PLUS_ONE() {
            const ret = wasm.policy_wasm_f_plus_one();
            return ret;
        }
        /**
         * The minimum timeout in milliseconds for a validator to produce a block (4s)
         * @returns {bigint}
         */
        static get MIN_PRODUCER_TIMEOUT() {
            const ret = wasm.policy_wasm_min_block_producer_timeout();
            return BigInt.asUintN(64, ret);
        }
        /**
         * The optimal time in milliseconds between blocks (1s)
         * @returns {bigint}
         */
        static get BLOCK_SEPARATION_TIME() {
            const ret = wasm.policy_wasm_block_separation_time();
            return BigInt.asUintN(64, ret);
        }
        /**
         * Minimum number of epochs that the ChainStore will store fully
         * @returns {number}
         */
        static get MIN_EPOCHS_STORED() {
            const ret = wasm.policy_wasm_min_epochs_stored();
            return ret >>> 0;
        }
        /**
         * The maximum drift, in milliseconds, that is allowed between any block's timestamp and the node's
         * system time. We only care about drifting to the future.
         * @returns {bigint}
         */
        static get TIMESTAMP_MAX_DRIFT() {
            const ret = wasm.policy_wasm_timestamp_max_drift();
            return BigInt.asUintN(64, ret);
        }
        /**
         * The minimum rewards percentage that we allow
         * @returns {number}
         */
        static get MINIMUM_REWARDS_PERCENTAGE() {
            const ret = wasm.policy_wasm_minimum_rewards_percentage();
            return ret;
        }
        /**
         * The deposit necessary to create a validator in Lunas (1 NIM = 100,000 Lunas).
         * A validator is someone who actually participates in block production. They are akin to miners
         * in proof-of-work.
         * @returns {bigint}
         */
        static get VALIDATOR_DEPOSIT() {
            const ret = wasm.policy_wasm_validator_deposit();
            return BigInt.asUintN(64, ret);
        }
        /**
         * The number of epochs a validator is put in jail for. The jailing only happens for severe offenses.
         * @returns {number}
         */
        static get JAIL_EPOCHS() {
            const ret = wasm.policy_wasm_jail_epochs();
            return ret >>> 0;
        }
        /**
         * Total supply in units.
         * @returns {bigint}
         */
        static get TOTAL_SUPPLY() {
            const ret = wasm.policy_wasm_total_supply();
            return BigInt.asUintN(64, ret);
        }
        /**
         * The maximum size of the BLS public key cache.
         * @returns {number}
         */
        static get BLS_CACHE_MAX_CAPACITY() {
            const ret = wasm.policy_wasm_bls_cache_max_capacity();
            return ret >>> 0;
        }
        /**
         * Maximum size of history chunks.
         * 25 MB.
         * @returns {bigint}
         */
        static get HISTORY_CHUNKS_MAX_SIZE() {
            const ret = wasm.policy_wasm_history_chunks_max_size();
            return BigInt.asUintN(64, ret);
        }
    }
    __exports.Policy = Policy;

    const SignatureProofFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_signatureproof_free(ptr >>> 0, 1));
    /**
     * A signature proof represents a signature together with its public key and the public key's merkle path.
     * It is used as the proof for transactions.
     */
    class SignatureProof {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(SignatureProof.prototype);
            obj.__wbg_ptr = ptr;
            SignatureProofFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            SignatureProofFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_signatureproof_free(ptr, 0);
        }
        /**
         * Deserializes a signature proof from a byte array.
         * @param {Uint8Array} bytes
         * @returns {SignatureProof}
         */
        static deserialize(bytes) {
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.signatureproof_deserialize(ptr0, len0);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return SignatureProof.__wrap(ret[0]);
        }
    }
    __exports.SignatureProof = SignatureProof;

    const StakingContractFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_stakingcontract_free(ptr >>> 0, 1));
    /**
     * Utility class providing methods to parse Staking Contract transaction data and proofs.
     */
    class StakingContract {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            StakingContractFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_stakingcontract_free(ptr, 0);
        }
    }
    __exports.StakingContract = StakingContract;

    const TransactionFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_transaction_free(ptr >>> 0, 1));
    /**
     * Transactions describe a transfer of value, usually from the sender to the recipient.
     * However, transactions can also have no value, when they are used to _signal_ a change in the staking contract.
     *
     * Transactions can be used to create contracts, such as vesting contracts and HTLCs.
     *
     * Transactions require a valid signature proof over their serialized content.
     * Furthermore, transactions are only valid for 2 hours after their validity-start block height.
     */
    class Transaction {

        static __wrap(ptr) {
            ptr = ptr >>> 0;
            const obj = Object.create(Transaction.prototype);
            obj.__wbg_ptr = ptr;
            TransactionFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            TransactionFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_transaction_free(ptr, 0);
        }
        /**
         * Creates a new unsigned transaction that transfers `value` amount of luna (NIM's smallest unit)
         * from the sender to the recipient, where both sender and recipient can be any account type,
         * and custom extra data can be added to the transaction.
         *
         * ### Basic transactions
         * If both the sender and recipient types are omitted or `0` and both data and flags are empty,
         * a smaller basic transaction is created.
         *
         * ### Extended transactions
         * If no flags are given, but sender type is not basic (`0`) or data is set, an extended
         * transaction is created.
         *
         * ### Contract creation transactions
         * To create a new vesting or HTLC contract, set `flags` to `0b1` and specify the contract
         * type as the `recipient_type`: `1` for vesting, `2` for HTLC. The `data` bytes must have
         * the correct format of contract creation data for the respective contract type.
         *
         * ### Signaling transactions
         * To interact with the staking contract, signaling transaction are often used to not
         * transfer any value, but to simply _signal_ a state change instead, such as changing one's
         * delegation from one validator to another. To create such a transaction, set `flags` to `
         * 0b10` and populate the `data` bytes accordingly.
         *
         * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
         *
         * Throws when an account type is unknown, the numbers given for value and fee do not fit
         * within a u64 or the networkId is unknown. Also throws when no data or recipient type is
         * given for contract creation transactions, or no data is given for signaling transactions.
         * @param {Address} sender
         * @param {number | undefined} sender_type
         * @param {Uint8Array | undefined} sender_data
         * @param {Address} recipient
         * @param {number | undefined} recipient_type
         * @param {Uint8Array | undefined} recipient_data
         * @param {bigint} value
         * @param {bigint} fee
         * @param {number | undefined} flags
         * @param {number} validity_start_height
         * @param {number} network_id
         */
        constructor(sender, sender_type, sender_data, recipient, recipient_type, recipient_data, value, fee, flags, validity_start_height, network_id) {
            _assertClass(sender, Address);
            var ptr0 = isLikeNone(sender_data) ? 0 : passArray8ToWasm0(sender_data, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            _assertClass(recipient, Address);
            var ptr1 = isLikeNone(recipient_data) ? 0 : passArray8ToWasm0(recipient_data, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.transaction_new(sender.__wbg_ptr, isLikeNone(sender_type) ? 0xFFFFFF : sender_type, ptr0, len0, recipient.__wbg_ptr, isLikeNone(recipient_type) ? 0xFFFFFF : recipient_type, ptr1, len1, value, fee, isLikeNone(flags) ? 0xFFFFFF : flags, validity_start_height, network_id);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            this.__wbg_ptr = ret[0] >>> 0;
            TransactionFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * Computes the transaction's hash, which is used as its unique identifier on the blockchain.
         * @returns {string}
         */
        hash() {
            let deferred1_0;
            let deferred1_1;
            try {
                const ret = wasm.transaction_hash(this.__wbg_ptr);
                deferred1_0 = ret[0];
                deferred1_1 = ret[1];
                return getStringFromWasm0(ret[0], ret[1]);
            } finally {
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * Verifies that a transaction has valid properties and a valid signature proof.
         * Optionally checks if the transaction is valid on the provided network.
         *
         * **Throws with any transaction validity error.** Returns without exception if the transaction is valid.
         *
         * Throws when the given networkId is unknown.
         * @param {number | undefined} [network_id]
         */
        verify(network_id) {
            const ret = wasm.transaction_verify(this.__wbg_ptr, isLikeNone(network_id) ? 0xFFFFFF : network_id);
            if (ret[1]) {
                throw takeFromExternrefTable0(ret[0]);
            }
        }
        /**
         * Tests if the transaction is valid at the specified block height.
         * @param {number} block_height
         * @returns {boolean}
         */
        isValidAt(block_height) {
            const ret = wasm.transaction_isValidAt(this.__wbg_ptr, block_height);
            return ret !== 0;
        }
        /**
         * Returns the address of the contract that is created with this transaction.
         * @returns {Address}
         */
        getContractCreationAddress() {
            const ret = wasm.transaction_getContractCreationAddress(this.__wbg_ptr);
            return Address.__wrap(ret);
        }
        /**
         * Serializes the transaction's content to be used for creating its signature.
         * @returns {Uint8Array}
         */
        serializeContent() {
            const ret = wasm.transaction_serializeContent(this.__wbg_ptr);
            var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
            return v1;
        }
        /**
         * Serializes the transaction to a byte array.
         * @returns {Uint8Array}
         */
        serialize() {
            const ret = wasm.transaction_serialize(this.__wbg_ptr);
            var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
            return v1;
        }
        /**
         * The transaction's {@link TransactionFormat}.
         * @returns {TransactionFormat}
         */
        get format() {
            const ret = wasm.transaction_format(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's sender address.
         * @returns {Address}
         */
        get sender() {
            const ret = wasm.transaction_sender(this.__wbg_ptr);
            return Address.__wrap(ret);
        }
        /**
         * The transaction's sender {@link AccountType}.
         * @returns {AccountType}
         */
        get senderType() {
            const ret = wasm.transaction_senderType(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's recipient address.
         * @returns {Address}
         */
        get recipient() {
            const ret = wasm.transaction_recipient(this.__wbg_ptr);
            return Address.__wrap(ret);
        }
        /**
         * The transaction's recipient {@link AccountType}.
         * @returns {AccountType}
         */
        get recipientType() {
            const ret = wasm.transaction_recipientType(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's value in luna (NIM's smallest unit).
         * @returns {bigint}
         */
        get value() {
            const ret = wasm.transaction_value(this.__wbg_ptr);
            return BigInt.asUintN(64, ret);
        }
        /**
         * The transaction's fee in luna (NIM's smallest unit).
         * @returns {bigint}
         */
        get fee() {
            const ret = wasm.transaction_fee(this.__wbg_ptr);
            return BigInt.asUintN(64, ret);
        }
        /**
         * The transaction's fee per byte in luna (NIM's smallest unit).
         * @returns {number}
         */
        get feePerByte() {
            const ret = wasm.transaction_feePerByte(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's validity-start height. The transaction is valid for 2 hours after this block height.
         * @returns {number}
         */
        get validityStartHeight() {
            const ret = wasm.transaction_validityStartHeight(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * The transaction's network ID.
         * @returns {number}
         */
        get networkId() {
            const ret = wasm.transaction_networkId(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's flags: `0b1` = contract creation, `0b10` = signaling.
         * @returns {TransactionFlag}
         */
        get flags() {
            const ret = wasm.transaction_flags(this.__wbg_ptr);
            return ret;
        }
        /**
         * The transaction's data as a byte array.
         * @returns {Uint8Array}
         */
        get data() {
            const ret = wasm.transaction_data(this.__wbg_ptr);
            var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
            return v1;
        }
        /**
         * Set the transaction's data
         * @param {Uint8Array} data
         */
        set data(data) {
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.transaction_set_data(this.__wbg_ptr, ptr0, len0);
        }
        /**
         * The transaction's sender data as a byte array.
         * @returns {Uint8Array}
         */
        get senderData() {
            const ret = wasm.transaction_senderData(this.__wbg_ptr);
            var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
            return v1;
        }
        /**
         * The transaction's signature proof as a byte array.
         * @returns {Uint8Array}
         */
        get proof() {
            const ret = wasm.transaction_proof(this.__wbg_ptr);
            var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
            return v1;
        }
        /**
         * Set the transaction's signature proof.
         * @param {Uint8Array} proof
         */
        set proof(proof) {
            const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.transaction_set_proof(this.__wbg_ptr, ptr0, len0);
        }
        /**
         * The transaction's byte size.
         * @returns {number}
         */
        get serializedSize() {
            const ret = wasm.transaction_serializedSize(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * Serializes the transaction into a HEX string.
         * @returns {string}
         */
        toHex() {
            let deferred1_0;
            let deferred1_1;
            try {
                const ret = wasm.transaction_toHex(this.__wbg_ptr);
                deferred1_0 = ret[0];
                deferred1_1 = ret[1];
                return getStringFromWasm0(ret[0], ret[1]);
            } finally {
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * Creates a JSON-compatible plain object representing the transaction.
         * @param {number | undefined} [genesis_number]
         * @param {bigint | undefined} [genesis_timestamp]
         * @returns {PlainTransaction}
         */
        toPlain(genesis_number, genesis_timestamp) {
            const ret = wasm.transaction_toPlain(this.__wbg_ptr, isLikeNone(genesis_number) ? 0x100000001 : (genesis_number) >>> 0, !isLikeNone(genesis_timestamp), isLikeNone(genesis_timestamp) ? BigInt(0) : genesis_timestamp);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return takeFromExternrefTable0(ret[0]);
        }
        /**
         * Deserializes a transaction from a byte array.
         * @param {Uint8Array} bytes
         * @returns {Transaction}
         */
        static deserialize(bytes) {
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.transaction_deserialize(ptr0, len0);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Transaction.__wrap(ret[0]);
        }
        /**
         * Parses a transaction from a {@link Transaction} instance, a plain object, a hex string
         * representation, or a byte array.
         *
         * Throws when a transaction cannot be parsed from the argument.
         * @param {PlainTransaction | string | Uint8Array} tx
         * @returns {Transaction}
         */
        static fromAny(tx) {
            const ret = wasm.transaction_fromAny(tx);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Transaction.__wrap(ret[0]);
        }
        /**
         * Parses a transaction from a plain object.
         *
         * Throws when a transaction cannot be parsed from the argument.
         * @param {PlainTransaction} plain
         * @returns {Transaction}
         */
        static fromPlain(plain) {
            const ret = wasm.transaction_fromPlain(plain);
            if (ret[2]) {
                throw takeFromExternrefTable0(ret[1]);
            }
            return Transaction.__wrap(ret[0]);
        }
    }
    __exports.Transaction = Transaction;

    const VestingContractFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_vestingcontract_free(ptr >>> 0, 1));
    /**
     * Utility class providing methods to parse Vesting Contract transaction data and proofs.
     */
    class VestingContract {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            VestingContractFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_vestingcontract_free(ptr, 0);
        }
    }
    __exports.VestingContract = VestingContract;

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    if (module.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    function __wbg_get_imports() {
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbg_WorkerGlobalScope_4cdac01f57bb97d1 = function(arg0) {
            const ret = arg0.WorkerGlobalScope;
            return ret;
        };
        imports.wbg.__wbg_addEventListener_0aa6c9470895f584 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.addEventListener(getStringFromWasm0(arg1, arg2), arg3);
        }, arguments) };
        imports.wbg.__wbg_apply_e561e3b9b5a01b05 = function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.apply(arg1, arg2);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_buffer_6e1d53ff183194fc = function(arg0) {
            const ret = arg0.buffer;
            return ret;
        };
        imports.wbg.__wbg_bufferedAmount_ee5f3d464214e678 = function(arg0) {
            const ret = arg0.bufferedAmount;
            return ret;
        };
        imports.wbg.__wbg_call_0411c0c3c424db9a = function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_call_3114932863209ca6 = function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_clearInterval_5bbcdf9491cea345 = function(arg0, arg1) {
            arg0.clearInterval(arg1);
        };
        imports.wbg.__wbg_clearInterval_b4e165e64357b104 = function(arg0, arg1) {
            arg0.clearInterval(arg1);
        };
        imports.wbg.__wbg_clearInterval_dd1e598f425db353 = function(arg0) {
            const ret = clearInterval(arg0);
            return ret;
        };
        imports.wbg.__wbg_clearTimeout_5a54f8841c30079a = function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        };
        imports.wbg.__wbg_clearTimeout_96804de0ab838f26 = function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        };
        imports.wbg.__wbg_client_new = function(arg0) {
            const ret = Client.__wrap(arg0);
            return ret;
        };
        imports.wbg.__wbg_close_390354f70a3f15a7 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.close(arg1, getStringFromWasm0(arg2, arg3));
        }, arguments) };
        imports.wbg.__wbg_crypto_ed58b8e10a292839 = function(arg0) {
            const ret = arg0.crypto;
            return ret;
        };
        imports.wbg.__wbg_data_6f313bee9ecc3082 = function(arg0) {
            const ret = arg0.data;
            return ret;
        };
        imports.wbg.__wbg_debug_27dd03b8945e39d7 = function(arg0, arg1, arg2, arg3) {
            console.debug(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_debug_347b3d1f33e1c28e = function(arg0) {
            console.debug(arg0);
        };
        imports.wbg.__wbg_done_adfd3f40364def50 = function(arg0) {
            const ret = arg0.done;
            return ret;
        };
        imports.wbg.__wbg_entries_ce82e236f8300a53 = function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        };
        imports.wbg.__wbg_error_2a6b93fdada7ff11 = function(arg0) {
            console.error(arg0);
        };
        imports.wbg.__wbg_error_818ac809371bfd77 = function(arg0, arg1, arg2, arg3) {
            console.error(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_getRandomValues_bcb4912f16000dc4 = function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments) };
        imports.wbg.__wbg_getTime_701326a7a826723f = function(arg0) {
            const ret = arg0.getTime();
            return ret;
        };
        imports.wbg.__wbg_get_68aa371864aa301a = function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        };
        imports.wbg.__wbg_get_92a4780a3beb5fe9 = function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        };
        imports.wbg.__wbg_globalThis_1e2ac1d6eee845b3 = function() { return handleError(function () {
            const ret = globalThis.globalThis;
            return ret;
        }, arguments) };
        imports.wbg.__wbg_global_f25a574ae080367c = function() { return handleError(function () {
            const ret = global.global;
            return ret;
        }, arguments) };
        imports.wbg.__wbg_info_ab0093df83f380f1 = function(arg0, arg1, arg2, arg3) {
            console.info(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_info_b6bd3cb6471c2b4c = function(arg0) {
            console.info(arg0);
        };
        imports.wbg.__wbg_instanceof_ArrayBuffer_435fcead703e2827 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_Map_77fd223783fe0068 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_Uint8Array_9b67296cab48238f = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_instanceof_Window_a959820eb267fe22 = function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        };
        imports.wbg.__wbg_isArray_fcd559a3bcfde1e9 = function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        };
        imports.wbg.__wbg_isSafeInteger_4de146aa53f6e470 = function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        };
        imports.wbg.__wbg_is_20768e55ad2a7c3f = function(arg0, arg1) {
            const ret = Object.is(arg0, arg1);
            return ret;
        };
        imports.wbg.__wbg_iterator_7a20c20ce22add0f = function() {
            const ret = Symbol.iterator;
            return ret;
        };
        imports.wbg.__wbg_length_2e63ba34c4121df5 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbg_length_e74df4881604f1d9 = function(arg0) {
            const ret = arg0.length;
            return ret;
        };
        imports.wbg.__wbg_msCrypto_0a36e2ec3a343d26 = function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        };
        imports.wbg.__wbg_new0_207938728f108bf6 = function() {
            const ret = new Date();
            return ret;
        };
        imports.wbg.__wbg_new_076cac58bb698dd4 = function() {
            const ret = new Object();
            return ret;
        };
        imports.wbg.__wbg_new_0c28e72025e00594 = function() {
            const ret = new Array();
            return ret;
        };
        imports.wbg.__wbg_new_1e8ca58d170d6ad0 = function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wbg_adapter_324(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = state0.b = 0;
            }
        };
        imports.wbg.__wbg_new_23362fa370a0a372 = function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        };
        imports.wbg.__wbg_new_789d26a8cd0beaf6 = function() { return handleError(function (arg0, arg1) {
            const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments) };
        imports.wbg.__wbg_newnoargs_19a249f4eceaaac3 = function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbg_newwithbyteoffsetandlength_ee8def7000b7b2be = function(arg0, arg1, arg2) {
            const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        };
        imports.wbg.__wbg_newwithlength_91de49dea5643c87 = function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        };
        imports.wbg.__wbg_next_c591766a7286b02a = function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments) };
        imports.wbg.__wbg_next_f387ecc56a94ba00 = function(arg0) {
            const ret = arg0.next;
            return ret;
        };
        imports.wbg.__wbg_node_02999533c4ea02e3 = function(arg0) {
            const ret = arg0.node;
            return ret;
        };
        imports.wbg.__wbg_now_2c95c9de01293173 = function(arg0) {
            const ret = arg0.now();
            return ret;
        };
        imports.wbg.__wbg_now_5b0cbad8de553ec4 = function(arg0) {
            const ret = arg0.now();
            return ret;
        };
        imports.wbg.__wbg_now_5cf792f3426feb88 = function() {
            const ret = Date.now();
            return ret;
        };
        imports.wbg.__wbg_performance_7a3ffd0b17f663ad = function(arg0) {
            const ret = arg0.performance;
            return ret;
        };
        imports.wbg.__wbg_process_5c1d670bc53614b8 = function(arg0) {
            const ret = arg0.process;
            return ret;
        };
        imports.wbg.__wbg_push_3e9ce81246ef1d1b = function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        };
        imports.wbg.__wbg_queueMicrotask_3d422e1ba49c2500 = function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        };
        imports.wbg.__wbg_queueMicrotask_f301663ccadbb7d0 = function(arg0) {
            queueMicrotask(arg0);
        };
        imports.wbg.__wbg_randomFillSync_ab2cfe79ebbf2740 = function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments) };
        imports.wbg.__wbg_readyState_bb59e8f3ca88bf33 = function(arg0) {
            const ret = arg0.readyState;
            return ret;
        };
        imports.wbg.__wbg_require_79b1e9274cde3c87 = function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments) };
        imports.wbg.__wbg_resolve_6a311e8bb26423ab = function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        };
        imports.wbg.__wbg_self_ac4343e4047b83cc = function() { return handleError(function () {
            const ret = self.self;
            return ret;
        }, arguments) };
        imports.wbg.__wbg_send_c7dc9a93fb67d64a = function() { return handleError(function (arg0, arg1, arg2) {
            arg0.send(getArrayU8FromWasm0(arg1, arg2));
        }, arguments) };
        imports.wbg.__wbg_setInterval_ed3b5e3c3ebb8a6d = function() { return handleError(function (arg0, arg1) {
            const ret = setInterval(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_setInterval_ee98dc1e6d169e47 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.setInterval(arg1, arg2, ...arg3);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_setInterval_fff3494d956a67e1 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.setInterval(arg1, arg2, ...arg3);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_setTimeout_db2dbaeefb6f39c7 = function() { return handleError(function (arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_setTimeout_eefe7f4c234b0c6b = function() { return handleError(function (arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        }, arguments) };
        imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        };
        imports.wbg.__wbg_set_7b70226104a82921 = function(arg0, arg1, arg2) {
            arg0.set(arg1, arg2 >>> 0);
        };
        imports.wbg.__wbg_set_a1fb6291729caffb = function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        };
        imports.wbg.__wbg_setbinaryType_a14c2d713cda3a76 = function(arg0, arg1) {
            arg0.binaryType = __wbindgen_enum_BinaryType[arg1];
        };
        imports.wbg.__wbg_setonclose_56cab8b0dca39584 = function(arg0, arg1) {
            arg0.onclose = arg1;
        };
        imports.wbg.__wbg_setonerror_b89f06e280aad698 = function(arg0, arg1) {
            arg0.onerror = arg1;
        };
        imports.wbg.__wbg_setonmessage_0096de047fd76d58 = function(arg0, arg1) {
            arg0.onmessage = arg1;
        };
        imports.wbg.__wbg_setonopen_027cab001d09f6a8 = function(arg0, arg1) {
            arg0.onopen = arg1;
        };
        imports.wbg.__wbg_subarray_b4e9772c34a7f5ba = function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        };
        imports.wbg.__wbg_then_5c6469c1e1da9e59 = function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        };
        imports.wbg.__wbg_value_30db1d77772f3236 = function(arg0) {
            const ret = arg0.value;
            return ret;
        };
        imports.wbg.__wbg_versions_c71aa1626a93e0a1 = function(arg0) {
            const ret = arg0.versions;
            return ret;
        };
        imports.wbg.__wbg_warn_43ba5f40fc329fe9 = function(arg0, arg1, arg2, arg3) {
            console.warn(arg0, arg1, arg2, arg3);
        };
        imports.wbg.__wbg_warn_a6963915e4da61f6 = function(arg0) {
            console.warn(arg0);
        };
        imports.wbg.__wbg_window_1a23defd102c72f4 = function() { return handleError(function () {
            const ret = window.window;
            return ret;
        }, arguments) };
        imports.wbg.__wbindgen_as_number = function(arg0) {
            const ret = +arg0;
            return ret;
        };
        imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
            const ret = arg0;
            return ret;
        };
        imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        };
        imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        };
        imports.wbg.__wbindgen_boolean_get = function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            return ret;
        };
        imports.wbg.__wbindgen_cb_drop = function(arg0) {
            const obj = arg0.original;
            if (obj.cnt-- == 1) {
                obj.a = 0;
                return true;
            }
            const ret = false;
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper13017 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 2645, __wbg_adapter_68);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper3710 = function(arg0, arg1, arg2) {
            const ret = makeClosure(arg0, arg1, 650, __wbg_adapter_52);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper7592 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 1714, __wbg_adapter_55);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper7594 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 1714, __wbg_adapter_55);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper7597 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 1714, __wbg_adapter_55);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper9726 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 2229, __wbg_adapter_62);
            return ret;
        };
        imports.wbg.__wbindgen_closure_wrapper9885 = function(arg0, arg1, arg2) {
            const ret = makeMutClosure(arg0, arg1, 2264, __wbg_adapter_65);
            return ret;
        };
        imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        };
        imports.wbg.__wbindgen_in = function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        };
        imports.wbg.__wbindgen_init_externref_table = function() {
            const table = wasm.__wbindgen_export_4;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
            ;
        };
        imports.wbg.__wbindgen_is_bigint = function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        };
        imports.wbg.__wbindgen_is_function = function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        };
        imports.wbg.__wbindgen_is_object = function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        };
        imports.wbg.__wbindgen_is_string = function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        };
        imports.wbg.__wbindgen_is_undefined = function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        };
        imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        };
        imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        };
        imports.wbg.__wbindgen_memory = function() {
            const ret = wasm.memory;
            return ret;
        };
        imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        };
        imports.wbg.__wbindgen_number_new = function(arg0) {
            const ret = arg0;
            return ret;
        };
        imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        };
        imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        };
        imports.wbg.__wbindgen_throw = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };

        return imports;
    }

    function __wbg_init_memory(imports, memory) {

    }

    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        __wbg_init.__wbindgen_wasm_module = module;
        cachedDataViewMemory0 = null;
        cachedUint8ArrayMemory0 = null;


        wasm.__wbindgen_start();
        return wasm;
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (typeof module !== 'undefined') {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();

        __wbg_init_memory(imports);

        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }

        const instance = new WebAssembly.Instance(module, imports);

        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (typeof module_or_path !== 'undefined') {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (typeof module_or_path === 'undefined' && typeof script_src !== 'undefined') {
            module_or_path = script_src.replace(/\.js$/, '_bg.wasm');
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        __wbg_init_memory(imports);

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    wasm_bindgen = Object.assign(__wbg_init, { initSync }, __exports);

})();

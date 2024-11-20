let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

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

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
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
    if (builtInMatches.length > 1) {
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

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getDataViewMemory0();
    for (let i = 0; i < array.length; i++) {
        mem.setUint32(ptr + 4 * i, addHeapObject(array[i]), true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

export const AccountType = Object.freeze({ Basic:0,"0":"Basic",Vesting:1,"1":"Vesting",HTLC:2,"2":"HTLC",Staking:3,"3":"Staking", });

export const TransactionFormat = Object.freeze({ Basic:0,"0":"Basic",Extended:1,"1":"Extended", });

const AddressFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_address_free(ptr >>> 0, 1));
/**
 * An object representing a Nimiq address.
 * Offers methods to parse and format addresses from and to strings.
 */
export class Address {

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
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.address_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            AddressFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses an address from an {@link Address} instance, a hex string representation, or a byte array.
     *
     * Throws when an address cannot be parsed from the argument.
     * @param {Address | string | Uint8Array} addr
     * @returns {Address}
     */
    static fromAny(addr) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address_fromAny(retptr, addBorrowedObject(addr));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Address.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Parses an address from a string representation, either user-friendly or hex format.
     *
     * Throws when an address cannot be parsed from the string.
     * @param {string} str
     * @returns {Address}
     */
    static fromString(str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.address_fromString(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Address.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses an address from its user-friendly string representation.
     *
     * Throws when an address cannot be parsed from the string.
     * @param {string} str
     * @returns {Address}
     */
    static fromUserFriendlyAddress(str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.address_fromUserFriendlyAddress(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Address.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the address into a plain string format.
     * @returns {string}
     */
    toPlain() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address_toPlain(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Formats the address into user-friendly IBAN format.
     * @returns {string}
     */
    toUserFriendlyAddress() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address_toPlain(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Formats the address into hex format.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns the byte representation of the address.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.address_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Returns if this address is equal to the other address.
     * @param {Address} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Address);
        const ret = wasm.address_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Compares this address to the other address.
     *
     * Returns -1 if this address is smaller than the other address, 0 if they are equal,
     * and 1 if this address is larger than the other address.
     * @param {Address} other
     * @returns {number}
     */
    compare(other) {
        _assertClass(other, Address);
        const ret = wasm.address_compare(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
}

const BLSKeyPairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blskeypair_free(ptr >>> 0, 1));
/**
 * A BLS keypair
 * It is used by validators to vote during Tendermint rounds.
 * This is just a wrapper around our internal BLS structs
 */
export class BLSKeyPair {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BLSKeyPair.prototype);
        obj.__wbg_ptr = ptr;
        BLSKeyPairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BLSKeyPairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blskeypair_free(ptr, 0);
    }
    /**
     * Generates a new keypair from secure randomness.
     * @returns {BLSKeyPair}
     */
    static generate() {
        const ret = wasm.blskeypair_generate();
        return BLSKeyPair.__wrap(ret);
    }
    /**
     * Derives a keypair from an existing private key.
     * @param {BLSSecretKey} private_key
     * @returns {BLSKeyPair}
     */
    static derive(private_key) {
        _assertClass(private_key, BLSSecretKey);
        const ret = wasm.blskeypair_derive(private_key.__wbg_ptr);
        return BLSKeyPair.__wrap(ret);
    }
    /**
     * Deserializes a keypair from a byte array.
     * @param {Uint8Array} bytes
     * @returns {BLSKeyPair}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blskeypair_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BLSKeyPair.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {BLSSecretKey} secret_key
     * @param {BLSPublicKey} public_key
     */
    constructor(secret_key, public_key) {
        _assertClass(secret_key, BLSSecretKey);
        _assertClass(public_key, BLSPublicKey);
        const ret = wasm.blskeypair_new(secret_key.__wbg_ptr, public_key.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        BLSKeyPairFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Serializes to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blskeypair_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Gets the keypair's secret key.
     * @returns {BLSSecretKey}
     */
    get secretKey() {
        const ret = wasm.blskeypair_secretKey(this.__wbg_ptr);
        return BLSSecretKey.__wrap(ret);
    }
    /**
     * Gets the keypair's public key.
     * @returns {BLSPublicKey}
     */
    get publicKey() {
        const ret = wasm.blskeypair_publicKey(this.__wbg_ptr);
        return BLSPublicKey.__wrap(ret);
    }
    /**
     * Formats the keypair into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blskeypair_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const BLSPublicKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blspublickey_free(ptr >>> 0, 1));
/**
 * The public part of the BLS keypair.
 * This is specified in the staking contract to verify votes from Validators.
 */
export class BLSPublicKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BLSPublicKey.prototype);
        obj.__wbg_ptr = ptr;
        BLSPublicKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BLSPublicKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blspublickey_free(ptr, 0);
    }
    /**
     * Derives a public key from an existing private key.
     * @param {BLSSecretKey} secret_key
     * @returns {BLSPublicKey}
     */
    static derive(secret_key) {
        _assertClass(secret_key, BLSSecretKey);
        const ret = wasm.blspublickey_derive(secret_key.__wbg_ptr);
        return BLSPublicKey.__wrap(ret);
    }
    /**
     * Deserializes a public key from a byte array.
     * @param {Uint8Array} bytes
     * @returns {BLSPublicKey}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blspublickey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BLSPublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new public key from a byte array.
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blspublickey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            BLSPublicKeyFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the public key to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blspublickey_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a public key from its hex representation.
     * @param {string} hex
     * @returns {BLSPublicKey}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blspublickey_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BLSPublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the public key into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blspublickey_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const BLSSecretKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blssecretkey_free(ptr >>> 0, 1));
/**
 * The secret part of the BLS keypair.
 * This is specified in the config file, and is used by Validators to vote.
 */
export class BLSSecretKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BLSSecretKey.prototype);
        obj.__wbg_ptr = ptr;
        BLSSecretKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BLSSecretKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blssecretkey_free(ptr, 0);
    }
    /**
     * Generates a new private key from secure randomness.
     * @returns {BLSSecretKey}
     */
    static generate() {
        const ret = wasm.blssecretkey_generate();
        return BLSSecretKey.__wrap(ret);
    }
    /**
     * Deserializes a private key from a byte array.
     * @param {Uint8Array} bytes
     * @returns {BLSSecretKey}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blssecretkey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BLSSecretKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new private key from a byte array.
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blssecretkey_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            BLSSecretKeyFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the private key to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blssecretkey_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a private key from its hex representation.
     * @param {string} hex
     * @returns {BLSSecretKey}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.blssecretkey_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return BLSSecretKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the private key into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.blssecretkey_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const ClientConfigurationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_clientconfiguration_free(ptr >>> 0, 1));
/**
 * Use this to provide initialization-time configuration to the Client.
 * This is a simplified version of the configuration that is used for regular nodes,
 * since not all configuration knobs are available when running inside a browser.
 */
export class ClientConfiguration {

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
    /**
     * Creates a default client configuration that can be used to change the client's configuration.
     *
     * Use its `instantiateClient()` method to launch the client and connect to the network.
     */
    constructor() {
        const ret = wasm.clientconfiguration_new();
        this.__wbg_ptr = ret >>> 0;
        ClientConfigurationFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Sets the network ID the client should use. Input is case-insensitive.
     *
     * Possible values are `'MainAlbatross' | 'TestAlbatross' | 'DevAlbatross'`.
     * Default is `'MainAlbatross'`.
     * @param {string} network
     */
    network(network) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.clientconfiguration_network(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Sets the list of seed nodes that are used to connect to the Nimiq Albatross network.
     *
     * Each array entry must be a proper Multiaddr format string.
     * @param {any[]} seeds
     */
    seedNodes(seeds) {
        const ptr0 = passArrayJsValueToWasm0(seeds, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.clientconfiguration_seedNodes(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Sets the log level that is used when logging to the console.
     *
     * Possible values are `'trace' | 'debug' | 'info' | 'warn' | 'error'`.
     * Default is `'info'`.
     * @param {string} log_level
     */
    logLevel(log_level) {
        const ptr0 = passStringToWasm0(log_level, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.clientconfiguration_logLevel(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Returns a plain configuration object to be passed to `Client.create`.
     * @returns {PlainClientConfiguration}
     */
    build() {
        const ret = wasm.clientconfiguration_build(this.__wbg_ptr);
        return takeObject(ret);
    }
}

const CryptoUtilsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cryptoutils_free(ptr >>> 0, 1));

export class CryptoUtils {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CryptoUtilsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cryptoutils_free(ptr, 0);
    }
    /**
     * Generates a secure random byte array of the given length.
     * @param {number} length
     * @returns {Uint8Array}
     */
    static getRandomValues(length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.cryptoutils_getRandomValues(retptr, length);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes a 64-byte [HMAC]-SHA512 hash from the input key and data.
     *
     * [HMAC]: https://en.wikipedia.org/wiki/HMAC
     * @param {Uint8Array} key
     * @param {Uint8Array} data
     * @returns {Uint8Array}
     */
    static computeHmacSha512(key, data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.cryptoutils_computeHmacSha512(retptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v3 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v3;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes a [PBKDF2]-over-SHA512 key from the password with the given parameters.
     *
     * [PBKDF2]: https://en.wikipedia.org/wiki/PBKDF2
     * @param {Uint8Array} password
     * @param {Uint8Array} salt
     * @param {number} iterations
     * @param {number} derived_key_length
     * @returns {Uint8Array}
     */
    static computePBKDF2sha512(password, salt, iterations, derived_key_length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.cryptoutils_computePBKDF2sha512(retptr, ptr0, len0, ptr1, len1, iterations, derived_key_length);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v3 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v3;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const ES256PublicKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_es256publickey_free(ptr >>> 0, 1));
/**
 * The non-secret (public) part of an ES256 asymmetric key pair that is typically used to digitally verify or encrypt data.
 */
export class ES256PublicKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ES256PublicKey.prototype);
        obj.__wbg_ptr = ptr;
        ES256PublicKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ES256PublicKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_es256publickey_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256publickey___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Verifies that a signature is valid for this public key and the provided data.
     * @param {ES256Signature} signature
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    verify(signature, data) {
        _assertClass(signature, ES256Signature);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.es256publickey_verify(this.__wbg_ptr, signature.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Deserializes a public key from a byte array.
     *
     * Throws when the byte array contains less than 33 bytes.
     * @param {Uint8Array} bytes
     * @returns {ES256PublicKey}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256publickey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a public key from its SPKI representation.
     * @param {Uint8Array} spki_bytes
     * @returns {ES256PublicKey}
     */
    static fromSpki(spki_bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(spki_bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256publickey_fromSpki(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a public key from its raw representation.
     * @param {Uint8Array} raw_bytes
     * @returns {ES256PublicKey}
     */
    static fromRaw(raw_bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(raw_bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256publickey_fromRaw(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new public key from a byte array.
     *
     * Compatible with the `-7` COSE algorithm identifier.
     *
     * ## Example
     *
     * ```javascript
     * // Create/register a credential with the Webauthn API:
     * const cred = await navigator.credentials.create({
     *     publicKey: {
     *         pubKeyCredParams: [{
     *             type: "public-key",
     *             alg: -7, // ES256 = ECDSA over P-256 with SHA-256
     *        }],
     *        // ...
     *     },
     * });
     *
     * // Then create an instance of ES256PublicKey from the credential response:
     * const publicKey = new Nimiq.ES256PublicKey(new Uint8Array(cred.response.getPublicKey()));
     * ```
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256publickey_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            ES256PublicKeyFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the public key to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256publickey_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a public key from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 33 bytes.
     * @param {string} hex
     * @returns {ES256PublicKey}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256publickey_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the public key into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256publickey_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Gets the public key's address.
     * @returns {Address}
     */
    toAddress() {
        const ret = wasm.es256publickey_toAddress(this.__wbg_ptr);
        return Address.__wrap(ret);
    }
    /**
     * Returns if this public key is equal to the other public key.
     * @param {ES256PublicKey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, ES256PublicKey);
        const ret = wasm.es256publickey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Compares this public key to the other public key.
     *
     * Returns -1 if this public key is smaller than the other public key, 0 if they are equal,
     * and 1 if this public key is larger than the other public key.
     * @param {ES256PublicKey} other
     * @returns {number}
     */
    compare(other) {
        _assertClass(other, ES256PublicKey);
        const ret = wasm.es256publickey_compare(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
}

const ES256SignatureFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_es256signature_free(ptr >>> 0, 1));
/**
 * An ES256 Signature represents a cryptographic proof that an ES256 private key signed some data.
 * It can be verified with the private key's public key.
 */
export class ES256Signature {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ES256Signature.prototype);
        obj.__wbg_ptr = ptr;
        ES256SignatureFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ES256SignatureFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_es256signature_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256signature___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Deserializes an ES256 signature from a byte array.
     *
     * Throws when the byte array contains less than 64 bytes.
     * @param {Uint8Array} bytes
     * @returns {ES256Signature}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256signature_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the signature to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256signature_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses an ES256 signature from its ASN.1 representation.
     * @param {Uint8Array} bytes
     * @returns {ES256Signature}
     */
    static fromAsn1(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256signature_fromAsn1(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses an ES256 signature from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 64 bytes.
     * @param {string} hex
     * @returns {ES256Signature}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.es256signature_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ES256Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the signature into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.es256signature_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const HashFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hash_free(ptr >>> 0, 1));

export class Hash {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HashFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hash_free(ptr, 0);
    }
    /**
     * Computes a 32-byte [Blake2b] hash from the input data.
     *
     * Blake2b is used for example to compute a public key's address.
     *
     * [Blake2b]: https://en.wikipedia.org/wiki/BLAKE_(hash_function)
     * @param {Uint8Array} data
     * @returns {Uint8Array}
     */
    static computeBlake2b(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hash_computeBlake2b(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes a 32-byte [SHA256] hash from the input data.
     *
     * [SHA256]: https://en.wikipedia.org/wiki/SHA-2
     * @param {Uint8Array} data
     * @returns {Uint8Array}
     */
    static computeSha256(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hash_computeSha256(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes a 64-byte [SHA512] hash from the input data.
     *
     * [SHA512]: https://en.wikipedia.org/wiki/SHA-2
     * @param {Uint8Array} data
     * @returns {Uint8Array}
     */
    static computeSha512(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hash_computeSha512(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes an [Argon2d] hash with some Nimiq-specific parameters.
     *
     * `iterations` specifies the number of iterations done in the hash
     * function. It can be used to control the hash computation time.
     * Increasing this will make it harder for an attacker to brute-force the
     * password.
     *
     * `derived_key_length` specifies the number of bytes that are output.
     *
     * [Argon2d]: https://en.wikipedia.org/wiki/Argon2
     * @param {Uint8Array} password
     * @param {Uint8Array} salt
     * @param {number} iterations
     * @param {number} derived_key_length
     * @returns {Uint8Array}
     */
    static computeNimiqArgon2d(password, salt, iterations, derived_key_length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.hash_computeNimiqArgon2d(retptr, ptr0, len0, ptr1, len1, iterations, derived_key_length);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v3 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v3;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes an [Argon2id] hash with some Nimiq-specific parameters.
     *
     * `iterations` specifies the number of iterations done in the hash
     * function. It can be used to control the hash computation time.
     * Increasing this will make it harder for an attacker to brute-force the
     * password.
     *
     * `derived_key_length` specifies the number of bytes that are output.
     *
     * [Argon2id]: https://en.wikipedia.org/wiki/Argon2
     * @param {Uint8Array} password
     * @param {Uint8Array} salt
     * @param {number} iterations
     * @param {number} derived_key_length
     * @returns {Uint8Array}
     */
    static computeNimiqArgon2id(password, salt, iterations, derived_key_length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.hash_computeNimiqArgon2id(retptr, ptr0, len0, ptr1, len1, iterations, derived_key_length);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v3 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v3;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const HashedTimeLockedContractFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hashedtimelockedcontract_free(ptr >>> 0, 1));
/**
 * Utility class providing methods to parse Hashed Time Locked Contract transaction data and proofs.
 */
export class HashedTimeLockedContract {

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
    /**
     * Parses the data of a Hashed Time Locked Contract creation transaction into a plain object.
     * @param {Uint8Array} data
     * @returns {PlainTransactionRecipientData}
     */
    static dataToPlain(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hashedtimelockedcontract_dataToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses the proof of a Hashed Time Locked Contract settlement transaction into a plain object.
     * @param {Uint8Array} proof
     * @returns {PlainTransactionProof}
     */
    static proofToPlain(proof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hashedtimelockedcontract_proofToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const KeyPairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keypair_free(ptr >>> 0, 1));
/**
 * A keypair represents a private key and its respective public key.
 * It is used for signing data, usually transactions.
 */
export class KeyPair {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KeyPair.prototype);
        obj.__wbg_ptr = ptr;
        KeyPairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyPairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keypair_free(ptr, 0);
    }
    /**
     * Generates a new keypair from secure randomness.
     * @returns {KeyPair}
     */
    static generate() {
        const ret = wasm.keypair_generate();
        return KeyPair.__wrap(ret);
    }
    /**
     * Derives a keypair from an existing private key.
     * @param {PrivateKey} private_key
     * @returns {KeyPair}
     */
    static derive(private_key) {
        _assertClass(private_key, PrivateKey);
        const ret = wasm.keypair_derive(private_key.__wbg_ptr);
        return KeyPair.__wrap(ret);
    }
    /**
     * Parses a keypair from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 64 bytes.
     * @param {string} hex
     * @returns {KeyPair}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.keypair_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return KeyPair.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a keypair from a byte array.
     *
     * Throws when the byte array contains less than 64 bytes.
     * @param {Uint8Array} bytes
     * @returns {KeyPair}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.keypair_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return KeyPair.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {PrivateKey} private_key
     * @param {PublicKey} public_key
     */
    constructor(private_key, public_key) {
        _assertClass(private_key, PrivateKey);
        _assertClass(public_key, PublicKey);
        const ret = wasm.keypair_new(private_key.__wbg_ptr, public_key.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        KeyPairFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Serializes the keypair to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.keypair_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Signs arbitrary data, returns a signature object.
     * @param {Uint8Array} data
     * @returns {Signature}
     */
    sign(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keypair_sign(this.__wbg_ptr, ptr0, len0);
        return Signature.__wrap(ret);
    }
    /**
     * Signs a transaction and sets the signature proof on the transaction object.
     * @param {Transaction} transaction
     */
    signTransaction(transaction) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(transaction, Transaction);
            wasm.keypair_signTransaction(retptr, this.__wbg_ptr, transaction.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Gets the keypair's private key.
     * @returns {PrivateKey}
     */
    get privateKey() {
        const ret = wasm.keypair_privateKey(this.__wbg_ptr);
        return PrivateKey.__wrap(ret);
    }
    /**
     * Gets the keypair's public key.
     * @returns {PublicKey}
     */
    get publicKey() {
        const ret = wasm.keypair_publicKey(this.__wbg_ptr);
        return PublicKey.__wrap(ret);
    }
    /**
     * Gets the keypair's address.
     * @returns {Address}
     */
    toAddress() {
        const ret = wasm.keypair_toAddress(this.__wbg_ptr);
        return Address.__wrap(ret);
    }
    /**
     * Formats the keypair into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.keypair_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const MerkleTreeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_merkletree_free(ptr >>> 0, 1));
/**
 * The Merkle tree is a data structure that allows for efficient verification of the membership of an element in a set.
 */
export class MerkleTree {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MerkleTreeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_merkletree_free(ptr, 0);
    }
    /**
     * Computes the root of a Merkle tree from a list of Uint8Arrays.
     * @param {(Uint8Array)[]} values
     * @returns {Uint8Array}
     */
    static computeRoot(values) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(values, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.merkletree_computeRoot(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const PolicyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_policy_free(ptr >>> 0, 1));

export class Policy {

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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_firstBlockOf(retptr, epoch);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Returns the block number of the first block of the given batch (which is always a micro block).
     * If the index is out of bounds, None is returned
     * @param {number} batch
     * @returns {number | undefined}
     */
    static firstBlockOfBatch(batch) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_firstBlockOfBatch(retptr, batch);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Returns the block number of the election macro block of the given epoch (which is always the last block).
     * If the index is out of bounds, None is returned
     * @param {number} epoch
     * @returns {number | undefined}
     */
    static electionBlockOf(epoch) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_electionBlockOf(retptr, epoch);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Returns the block number of the macro block (checkpoint or election) of the given batch (which
     * is always the last block).
     * If the index is out of bounds, None is returned
     * @param {number} batch
     * @returns {number | undefined}
     */
    static macroBlockOf(batch) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_macroBlockOf(retptr, batch);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_wasm_staking_contract_address(retptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
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
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.policy_wasm_coinbase_address(retptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
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

const PrivateKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_privatekey_free(ptr >>> 0, 1));
/**
 * The secret (private) part of an asymmetric key pair that is typically used to digitally sign or decrypt data.
 */
export class PrivateKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PrivateKey.prototype);
        obj.__wbg_ptr = ptr;
        PrivateKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PrivateKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_privatekey_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    static get PURPOSE_ID() {
        const ret = wasm.privatekey_purpose_id();
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    static get SIZE() {
        const ret = wasm.privatekey_size();
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get serializedSize() {
        const ret = wasm.privatekey_serialized_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Generates a new private key from secure randomness.
     * @returns {PrivateKey}
     */
    static generate() {
        const ret = wasm.privatekey_generate();
        return PrivateKey.__wrap(ret);
    }
    /**
     * Deserializes a private key from a byte array.
     *
     * Throws when the byte array contains less than 32 bytes.
     * @param {Uint8Array} bytes
     * @returns {PrivateKey}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.privatekey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PrivateKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new private key from a byte array.
     *
     * Throws when the byte array is not exactly 32 bytes long.
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.privatekey_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            PrivateKeyFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the private key to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.privatekey_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a private key from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 32 bytes.
     * @param {string} hex
     * @returns {PrivateKey}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.privatekey_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PrivateKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the private key into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.privatekey_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns if this private key is equal to the other private key.
     * @param {PrivateKey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PrivateKey);
        const ret = wasm.privatekey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
}

const PublicKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_publickey_free(ptr >>> 0, 1));
/**
 * The non-secret (public) part of an asymmetric key pair that is typically used to digitally verify or encrypt data.
 */
export class PublicKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PublicKey.prototype);
        obj.__wbg_ptr = ptr;
        PublicKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PublicKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_publickey_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.publickey___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    static get SIZE() {
        const ret = wasm.privatekey_size();
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get serializedSize() {
        const ret = wasm.publickey_serialized_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Derives a public key from an existing private key.
     * @param {PrivateKey} private_key
     * @returns {PublicKey}
     */
    static derive(private_key) {
        _assertClass(private_key, PrivateKey);
        const ret = wasm.publickey_derive(private_key.__wbg_ptr);
        return PublicKey.__wrap(ret);
    }
    /**
     * Verifies that a signature is valid for this public key and the provided data.
     * @param {Signature} signature
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    verify(signature, data) {
        _assertClass(signature, Signature);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.publickey_verify(this.__wbg_ptr, signature.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Deserializes a public key from a byte array.
     *
     * Throws when the byte array contains less than 32 bytes.
     * @param {Uint8Array} bytes
     * @returns {PublicKey}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.publickey_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a public key from its SPKI representation.
     * @param {Uint8Array} spki_bytes
     * @returns {PublicKey}
     */
    static fromSpki(spki_bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(spki_bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.publickey_fromSpki(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a public key from its raw representation.
     * @param {Uint8Array} raw_bytes
     * @returns {PublicKey}
     */
    static fromRaw(raw_bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(raw_bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.publickey_fromRaw(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new public key from a byte array.
     *
     * Throws when the byte array is not exactly 32 bytes long.
     * @param {Uint8Array} bytes
     */
    constructor(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.publickey_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            PublicKeyFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the public key to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.publickey_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a public key from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 32 bytes.
     * @param {string} hex
     * @returns {PublicKey}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.publickey_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return PublicKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the public key into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.publickey_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Gets the public key's address.
     * @returns {Address}
     */
    toAddress() {
        const ret = wasm.publickey_toAddress(this.__wbg_ptr);
        return Address.__wrap(ret);
    }
    /**
     * Returns if this public key is equal to the other public key.
     * @param {PublicKey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PublicKey);
        const ret = wasm.publickey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Compares this public key to the other public key.
     *
     * Returns -1 if this public key is smaller than the other public key, 0 if they are equal,
     * and 1 if this public key is larger than the other public key.
     * @param {PublicKey} other
     * @returns {number}
     */
    compare(other) {
        _assertClass(other, PublicKey);
        const ret = wasm.publickey_compare(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
}

const SignatureFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_signature_free(ptr >>> 0, 1));
/**
 * An Ed25519 Signature represents a cryptographic proof that a private key signed some data.
 * It can be verified with the private key's public key.
 */
export class Signature {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Signature.prototype);
        obj.__wbg_ptr = ptr;
        SignatureFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SignatureFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_signature_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.signature___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Deserializes an Ed25519 signature from a byte array.
     *
     * Throws when the byte array contains less than 64 bytes.
     * @param {Uint8Array} bytes
     * @returns {Signature}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.signature_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the signature to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.signature_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a signature from a private key and its public key over byte data.
     * @param {PrivateKey} private_key
     * @param {PublicKey} public_key
     * @param {Uint8Array} data
     * @returns {Signature}
     */
    static create(private_key, public_key, data) {
        _assertClass(private_key, PrivateKey);
        _assertClass(public_key, PublicKey);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.signature_create(private_key.__wbg_ptr, public_key.__wbg_ptr, ptr0, len0);
        return Signature.__wrap(ret);
    }
    /**
     * Parses an Ed25519 signature from its ASN.1 representation.
     * @param {Uint8Array} bytes
     * @returns {Signature}
     */
    static fromAsn1(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.signature_fromAsn1(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses an Ed25519 signature from its hex representation.
     *
     * Throws when the string is not valid hex format or when it represents less than 64 bytes.
     * @param {string} hex
     * @returns {Signature}
     */
    static fromHex(hex) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.signature_fromHex(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Signature.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Formats the signature into a hex string.
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.signature_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const SignatureProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_signatureproof_free(ptr >>> 0, 1));
/**
 * A signature proof represents a signature together with its public key and the public key's merkle path.
 * It is used as the proof for transactions.
 */
export class SignatureProof {

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
     * @returns {number}
     */
    static get SINGLE_SIG_SIZE() {
        const ret = wasm.signatureproof_single_sig_size();
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    static get ES256_SINGLE_SIG_SIZE() {
        const ret = wasm.signatureproof_es256_single_sig_size();
        return ret >>> 0;
    }
    /**
     * Creates a Ed25519/Schnorr signature proof for a single-sig signature.
     * @param {PublicKey} public_key
     * @param {Signature} signature
     * @returns {SignatureProof}
     */
    static singleSig(public_key, signature) {
        _assertClass(public_key, PublicKey);
        _assertClass(signature, Signature);
        const ret = wasm.signatureproof_singleSig(public_key.__wbg_ptr, signature.__wbg_ptr);
        return SignatureProof.__wrap(ret);
    }
    /**
     * Creates a Ed25519/Schnorr signature proof for a multi-sig signature.
     * The public keys can also include ES256 keys.
     * @param {PublicKey} signer_key
     * @param {(PublicKey | ES256PublicKey)[]} public_keys
     * @param {Signature} signature
     * @returns {SignatureProof}
     */
    static multiSig(signer_key, public_keys, signature) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(signer_key, PublicKey);
            _assertClass(signature, Signature);
            wasm.signatureproof_multiSig(retptr, signer_key.__wbg_ptr, addBorrowedObject(public_keys), signature.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SignatureProof.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Creates a Webauthn signature proof for a single-sig signature.
     * @param {PublicKey | ES256PublicKey} public_key
     * @param {Signature | ES256Signature} signature
     * @param {Uint8Array} authenticator_data
     * @param {Uint8Array} client_data_json
     * @returns {SignatureProof}
     */
    static webauthnSingleSig(public_key, signature, authenticator_data, client_data_json) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(authenticator_data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(client_data_json, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.signatureproof_webauthnSingleSig(retptr, addBorrowedObject(public_key), addBorrowedObject(signature), ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SignatureProof.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Creates a Webauthn signature proof for a multi-sig signature.
     * @param {PublicKey | ES256PublicKey} signer_key
     * @param {(PublicKey | ES256PublicKey)[]} public_keys
     * @param {Signature | ES256Signature} signature
     * @param {Uint8Array} authenticator_data
     * @param {Uint8Array} client_data_json
     * @returns {SignatureProof}
     */
    static webauthnMultiSig(signer_key, public_keys, signature, authenticator_data, client_data_json) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(authenticator_data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(client_data_json, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.signatureproof_webauthnMultiSig(retptr, addBorrowedObject(signer_key), addBorrowedObject(public_keys), addBorrowedObject(signature), ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SignatureProof.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Verifies the signature proof against the provided data.
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    verify(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.signatureproof_verify(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Checks if the signature proof is signed by the provided address.
     * @param {Address} sender
     * @returns {boolean}
     */
    isSignedBy(sender) {
        _assertClass(sender, Address);
        const ret = wasm.signatureproof_isSignedBy(this.__wbg_ptr, sender.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * The embedded signature.
     * @returns {Signature | ES256Signature}
     */
    get signature() {
        const ret = wasm.signatureproof_signature(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The embedded public key.
     * @returns {PublicKey | ES256PublicKey}
     */
    get publicKey() {
        const ret = wasm.signatureproof_publicKey(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Serializes the proof to a byte array, e.g. for assigning it to a `transaction.proof` field.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.signatureproof_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a JSON-compatible plain object representing the signature proof.
     * @returns {PlainTransactionProof}
     */
    toPlain() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.signatureproof_toPlain(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deserializes a signature proof from a byte array.
     * @param {Uint8Array} bytes
     * @returns {SignatureProof}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.signatureproof_deserialize(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SignatureProof.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const StakingContractFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_stakingcontract_free(ptr >>> 0, 1));
/**
 * Utility class providing methods to parse Staking Contract transaction data and proofs.
 */
export class StakingContract {

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
    /**
     * Parses the data of a Staking Contract incoming transaction into a plain object.
     * @param {Uint8Array} data
     * @returns {PlainTransactionRecipientData}
     */
    static dataToPlain(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.stakingcontract_dataToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses the proof of a Staking Contract outgoing transaction into a plain object.
     * @param {Uint8Array} proof
     * @returns {PlainTransactionProof}
     */
    static proofToPlain(proof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.stakingcontract_proofToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

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
export class Transaction {

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
     * @returns {string}
     */
    __getClassname() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction___getClassname(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            var ptr0 = isLikeNone(sender_data) ? 0 : passArray8ToWasm0(sender_data, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            _assertClass(recipient, Address);
            var ptr1 = isLikeNone(recipient_data) ? 0 : passArray8ToWasm0(recipient_data, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            wasm.transaction_new(retptr, sender.__wbg_ptr, isLikeNone(sender_type) ? 0xFFFFFF : sender_type, ptr0, len0, recipient.__wbg_ptr, isLikeNone(recipient_type) ? 0xFFFFFF : recipient_type, ptr1, len1, value, fee, isLikeNone(flags) ? 0xFFFFFF : flags, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            TransactionFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Signs the transaction with the provided key pair. Automatically determines the format
     * of the signature proof required for the transaction.
     *
     * ### Limitations
     * - HTLC redemption is not supported and will throw.
     * - For transaction to the staking contract, both signatures are made with the same keypair,
     *   so it is not possible to interact with a staker that is different from the sender address
     *   or using a different cold or signing key for validator transactions.
     * @param {KeyPair} key_pair
     */
    sign(key_pair) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(key_pair, KeyPair);
            wasm.transaction_sign(retptr, this.__wbg_ptr, key_pair.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Computes the transaction's hash, which is used as its unique identifier on the blockchain.
     * @returns {string}
     */
    hash() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_hash(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_verify(retptr, this.__wbg_ptr, isLikeNone(network_id) ? 0xFFFFFF : network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_serializeContent(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Serializes the transaction to a byte array.
     * @returns {Uint8Array}
     */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
     * @returns {number}
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_data(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_senderData(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * The transaction's signature proof as a byte array.
     * @returns {Uint8Array}
     */
    get proof() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_proof(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
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
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Creates a JSON-compatible plain object representing the transaction.
     * @returns {PlainTransaction}
     */
    toPlain() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_toPlain(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses a transaction from a {@link Transaction} instance, a plain object, a hex string
     * representation, or a byte array.
     *
     * Throws when a transaction cannot be parsed from the argument.
     * @param {Transaction | PlainTransaction | string | Uint8Array} tx
     * @returns {Transaction}
     */
    static fromAny(tx) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_fromAny(retptr, addBorrowedObject(tx));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Parses a transaction from a plain object.
     *
     * Throws when a transaction cannot be parsed from the argument.
     * @param {PlainTransaction} plain
     * @returns {Transaction}
     */
    static fromPlain(plain) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transaction_fromPlain(retptr, addBorrowedObject(plain));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
}

const TransactionBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionbuilder_free(ptr >>> 0, 1));
/**
 * The TransactionBuilder class provides helper methods to easily create standard types of transactions.
 * It can only be instantiated from a Client with `client.transactionBuilder()`.
 */
export class TransactionBuilder {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionbuilder_free(ptr, 0);
    }
    /**
     * Creates a basic transaction that transfers `value` amount of luna (NIM's smallest unit) from the
     * sender to the recipient.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for value and fee do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {Address} recipient
     * @param {bigint} value
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newBasic(sender, recipient, value, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(recipient, Address);
            wasm.transactionbuilder_newBasic(retptr, sender.__wbg_ptr, recipient.__wbg_ptr, value, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a basic transaction that transfers `value` amount of luna (NIM's smallest unit) from the
     * sender to the recipient. It can include arbitrary `data`, up to 64 bytes.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for value and fee do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {Address} recipient
     * @param {Uint8Array} data
     * @param {bigint} value
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newBasicWithData(sender, recipient, data, value, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(recipient, Address);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.transactionbuilder_newBasicWithData(retptr, sender.__wbg_ptr, recipient.__wbg_ptr, ptr0, len0, value, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Creates a new staker in the staking contract and transfers `value` amount of luna (NIM's smallest unit)
     * from the sender account to this new staker.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for value and fee do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {Address} delegation
     * @param {bigint} value
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newCreateStaker(sender, delegation, value, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(delegation, Address);
            wasm.transactionbuilder_newCreateStaker(retptr, sender.__wbg_ptr, delegation.__wbg_ptr, value, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Adds stake to a staker in the staking contract and transfers `value` amount of luna (NIM's smallest unit)
     * from the sender account to this staker.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for value and fee do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {Address} staker_address
     * @param {bigint} value
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newAddStake(sender, staker_address, value, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(staker_address, Address);
            wasm.transactionbuilder_newAddStake(retptr, sender.__wbg_ptr, staker_address.__wbg_ptr, value, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Updates a staker in the staking contract to stake for a different validator. This is a
     * signaling transaction and as such does not transfer any value.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the number given for fee does not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {Address} new_delegation
     * @param {boolean} reactivate_all_stake
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newUpdateStaker(sender, new_delegation, reactivate_all_stake, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(new_delegation, Address);
            wasm.transactionbuilder_newUpdateStaker(retptr, sender.__wbg_ptr, new_delegation.__wbg_ptr, reactivate_all_stake, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Sets the active stake balance of the staker. This is a
     * signaling transaction and as such does not transfer any value.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for fee and `new_active_balance` do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {bigint} new_active_balance
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newSetActiveStake(sender, new_active_balance, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            wasm.transactionbuilder_newSetActiveStake(retptr, sender.__wbg_ptr, new_active_balance, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Retires a portion of the inactive stake balance of the staker. This is a
     * signaling transaction and as such does not transfer any value.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for fee and `retire_stake` do not fit within a u64 or the networkId is unknown.
     * @param {Address} sender
     * @param {bigint} retire_stake
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newRetireStake(sender, retire_stake, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            wasm.transactionbuilder_newRetireStake(retptr, sender.__wbg_ptr, retire_stake, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Removes stake from the staking contract and transfers `value` amount of luna (NIM's smallest unit)
     * from the staker to the recipient.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the numbers given for value and fee do not fit within a u64 or the networkId is unknown.
     * @param {Address} recipient
     * @param {bigint} value
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newRemoveStake(recipient, value, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(recipient, Address);
            wasm.transactionbuilder_newRemoveStake(retptr, recipient.__wbg_ptr, value, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Registers a new validator in the staking contract.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the fee does not fit within a u64 or the `networkId` is unknown.
     * @param {Address} sender
     * @param {Address} reward_address
     * @param {PublicKey} signing_key
     * @param {BLSKeyPair} voting_key_pair
     * @param {string | undefined} signal_data
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newCreateValidator(sender, reward_address, signing_key, voting_key_pair, signal_data, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(reward_address, Address);
            _assertClass(signing_key, PublicKey);
            _assertClass(voting_key_pair, BLSKeyPair);
            var ptr0 = isLikeNone(signal_data) ? 0 : passStringToWasm0(signal_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.transactionbuilder_newCreateValidator(retptr, sender.__wbg_ptr, reward_address.__wbg_ptr, signing_key.__wbg_ptr, voting_key_pair.__wbg_ptr, ptr0, len0, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Updates parameters of a validator in the staking contract.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the fee does not fit within a u64 or the `networkId` is unknown.
     * @param {Address} sender
     * @param {Address | undefined} reward_address
     * @param {PublicKey | undefined} signing_key
     * @param {BLSKeyPair | undefined} voting_key_pair
     * @param {string | undefined} signal_data
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newUpdateValidator(sender, reward_address, signing_key, voting_key_pair, signal_data, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            let ptr0 = 0;
            if (!isLikeNone(reward_address)) {
                _assertClass(reward_address, Address);
                ptr0 = reward_address.__destroy_into_raw();
            }
            let ptr1 = 0;
            if (!isLikeNone(signing_key)) {
                _assertClass(signing_key, PublicKey);
                ptr1 = signing_key.__destroy_into_raw();
            }
            let ptr2 = 0;
            if (!isLikeNone(voting_key_pair)) {
                _assertClass(voting_key_pair, BLSKeyPair);
                ptr2 = voting_key_pair.__destroy_into_raw();
            }
            var ptr3 = isLikeNone(signal_data) ? 0 : passStringToWasm0(signal_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len3 = WASM_VECTOR_LEN;
            wasm.transactionbuilder_newUpdateValidator(retptr, sender.__wbg_ptr, ptr0, ptr1, ptr2, ptr3, len3, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deactivates a validator in the staking contract.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the fee does not fit within a u64 or the `networkId` is unknown.
     * @param {Address} sender
     * @param {Address} validator
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newDeactivateValidator(sender, validator, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            _assertClass(validator, Address);
            wasm.transactionbuilder_newDeactivateValidator(retptr, sender.__wbg_ptr, validator.__wbg_ptr, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Deleted a validator the staking contract. The deposit is returned to the Sender
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the fee does not fit within a u64 or the `networkId` is unknown.
     * @param {Address} sender
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newDeleteValidator(sender, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            wasm.transactionbuilder_newDeleteValidator(retptr, sender.__wbg_ptr, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Retires a validator in the staking contract.
     *
     * The returned transaction is not yet signed. You can sign it e.g. with `tx.sign(keyPair)`.
     *
     * Throws when the fee does not fit within a u64 or the `networkId` is unknown.
     * @param {Address} sender
     * @param {bigint | undefined} fee
     * @param {number} validity_start_height
     * @param {number} network_id
     * @returns {Transaction}
     */
    static newRetireValidator(sender, fee, validity_start_height, network_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender, Address);
            wasm.transactionbuilder_newRetireValidator(retptr, sender.__wbg_ptr, !isLikeNone(fee), isLikeNone(fee) ? BigInt(0) : fee, validity_start_height, network_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Transaction.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const VestingContractFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_vestingcontract_free(ptr >>> 0, 1));
/**
 * Utility class providing methods to parse Vesting Contract transaction data and proofs.
 */
export class VestingContract {

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
    /**
     * Parses the data of a Vesting Contract creation transaction into a plain object.
     * @param {Uint8Array} data
     * @returns {PlainTransactionRecipientData}
     */
    static dataToPlain(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.vestingcontract_dataToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses the proof of a Vesting Contract claiming transaction into a plain object.
     * @param {Uint8Array} proof
     * @returns {PlainTransactionProof}
     */
    static proofToPlain(proof) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.stakingcontract_proofToPlain(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

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
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_e69b5f66fda8f13c = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_f975102236d3c502 = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg_new_034f913e7636e987 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_crypto_1d1f22824a6a080c = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_process_4a72847cc503995b = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_f686565e586dd935 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_104a2ff8d6ea03a2 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_require_cca90b1a94a0255b = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_msCrypto_eb05e62b530a1508 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_76462a666eca145f = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_5419cf6b954aa11d = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_b06e115d1b01e10b = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_done_983b5ffcaec8c583 = function(arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.wbg.__wbg_value_2ab8a198c834c26a = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_iterator_695d699a44d6234c = function() {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_13b477da1eaa3897 = function(arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_a9ef466721e824f2 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_3bfa248576352471 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_ccaed51a635d8a2d = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_fec2611eb9180f95 = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_ec2fcf81bc573fd9 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_length_9254c4bd3b9f23c4 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_apply_e94b0a80561391ae = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.apply(getObject(arg0), getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_ef828680c64da212 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_bf91bf94d9e04084 = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_52dd9f07d03fd5f8 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_05c129bf37fcf1be = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_3eca19bb09e9c484 = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newnoargs_1ede4bf2ebbaaf43 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'bigint';
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_b9dff570f01a9100 = function(arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg_isArray_6f3b47f09adb61b5 = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_length_f217bbbf7e8e4df4 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg_instanceof_Map_f96986929e7e89ed = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Map;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getwithrefkey_edc2c8960f0f1191 = function(arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_String_b9412f8799faab3e = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_set_425e70f7c64ac962 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_signature_new = function(arg0) {
        const ret = Signature.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_es256signature_new = function(arg0) {
        const ret = ES256Signature.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_publickey_new = function(arg0) {
        const ret = PublicKey.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_es256publickey_new = function(arg0) {
        const ret = ES256PublicKey.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_7e3eb787208af730 = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_5c9c955aa56b6049 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_subarray_975a06f9dbd16995 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getRandomValues_3aa56aa6edec874c = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_instanceof_Uint8Array_df0761410414ef36 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_74945570b4a62ec7 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_entries_c02034de337d3ee2 = function(arg0) {
        const ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_as_number = function(arg0) {
        const ret = +getObject(arg0);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
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

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('index_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;

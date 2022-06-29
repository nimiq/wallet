export function unserializeAddress(hex: string): string {
    return toUserFriendlyAddress(fromHex(hex));
}

function fromHex(hex: string) {
    return new Uint8Array((hex.match(/.{2}/g) || []).map((byte) => parseInt(byte, 16)));
}

const CCODE = 'NQ';
const BASE32_ALPHABET_NIMIQ = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function toUserFriendlyAddress(buf: Uint8Array, withSpaces = true) {
    const base32 = toBase32(buf);
    // eslint-disable-next-line prefer-template
    const check = ('00' + (98 - ibanCheck(base32 + CCODE + '00'))).slice(-2);
    let res = CCODE + check + base32;
    if (withSpaces) res = res.replace(/.{4}/g, '$& ').trim();
    return res;
}

function toBase32(buf: Uint8Array, alphabet = BASE32_ALPHABET_NIMIQ) {
    let shift = 3;
    let carry = 0;
    let byte: number;
    let symbol: number;
    let i: number;
    let res = '';

    /* eslint-disable no-bitwise */
    for (i = 0; i < buf.length; i++) {
        byte = buf[i];
        symbol = carry | (byte >> shift);
        res += alphabet[symbol & 0x1f];

        if (shift > 5) {
            shift -= 5;
            symbol = byte >> shift;
            res += alphabet[symbol & 0x1f];
        }

        shift = 5 - shift;
        carry = byte << shift;
        shift = 8 - shift;
    }

    if (shift !== 3) {
        res += alphabet[carry & 0x1f];
    }
    /* eslint-enable no-bitwise */

    while (res.length % 8 !== 0 && alphabet.length === 33) {
        res += alphabet[32];
    }

    return res;
}

function ibanCheck(str: string) {
    const num = str.split('').map((c) => {
        const code = c.toUpperCase().charCodeAt(0);
        return code >= 48 && code <= 57 ? c : (code - 55).toString();
    }).join('');
    let tmp = '';

    for (let i = 0; i < Math.ceil(num.length / 6); i++) {
        tmp = (parseInt(tmp + num.substr(i * 6, 6), 10) % 97).toString();
    }

    return parseInt(tmp, 10);
}

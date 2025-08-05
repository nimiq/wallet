import { Utf8Tools } from '@nimiq/utils';

/**
 * Returns the hex encoding of a UTF-8 string.
 */
export function encodeTextToHex(text: string): string {
    const utf8Array = Utf8Tools.stringToUtf8ByteArray(text);
    return Array.from(utf8Array)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

// We pick a random but fixed time-of-day offset for each day.
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);
const baseDateMs = baseDate.getTime();
const oneDayMs = 24 * 60 * 60 * 1000;

/**
 * Generates a past timestamp for a given number of days ago, adding a predictable random offset.
 */
export function calculateDaysAgo(days: number): number {
    const x = Math.sin(days) * 10000;
    const fractionalPart = x - Math.floor(x);
    const randomPart = Math.floor(fractionalPart * oneDayMs);
    return baseDateMs - days * oneDayMs - randomPart;
}

/**
 * Generates a random Polygon transaction hash
 */
export const getRandomPolygonHash = () => `0x${Math.random().toString(16).slice(2, 66)}`;

/**
 * Generates a random Polygon address
 */
export const getRandomPolygonAddress = () => `0x${Math.random().toString(16).slice(2, 42)}`;

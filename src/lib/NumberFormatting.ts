export function formatted(amount: number, minDecimals: number, maxDecimals: number) {
    const roundingFactor = 10 ** maxDecimals;
    const value = Math.floor(amount * roundingFactor) / roundingFactor;

    const result = parseFloat(value.toFixed(minDecimals)) === value
        ? value.toFixed(minDecimals)
        : value.toString();

    if (Math.abs(value) < 10000) return result;
    // add thin spaces (U+202F) every 3 digits. Stop at the decimal separator if there is one
    const regexp = minDecimals > 0 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(\d{3})+$)/g;
    return result.replace(regexp, '$1\u202F');
}

export function twoDigit(value: number) {
    if (value < 10) return `0${value}`
    else return value.toString()
}

import { i18n } from '../i18n/i18n-setup';
import { numberToLiteralTimes } from './NumberFormatting';

export function getPayoutText(payout: number) {
    const periods = {
        year: (((3600 * 1000) * 24) * 30) * 12,
        month: ((3600 * 1000) * 24) * 30,
        week: ((3600 * 1000) * 24) * 7,
        day: (3600 * 1000) * 24,
        h: 3600 * 1000,
    };
    let index = 0;
    let value = 0;
    const periodNames = Object.keys(periods);

    for (const [, period] of Object.entries(periods)) {
        value = payout / period;
        if (value >= 1) {
            break;
        }
        index += 1;
    }

    if (index === periodNames.length - 1) {
        return i18n.t('pays out every {hourCount}', { hourCount: `${value}${periodNames[index]}` }) as string;
    }

    return i18n.t('pays out {numberOfTimes} a {period}', {
        numberOfTimes: numberToLiteralTimes(Math.floor(value)),
        period: periodNames[index],
    }) as string;
}

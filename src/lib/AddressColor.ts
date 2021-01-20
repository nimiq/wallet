// @ts-expect-error Could not find a declaration file for module '@nimiq/iqons'.
import { getBackgroundColorName } from '@nimiq/iqons';

export function getColorClass(address: string) {
    let color = getBackgroundColorName(address).toLowerCase() as string;

    // Convert from public to CSS names
    if (color === 'yellow') color = 'gold';
    else if (color === 'indigo') color = 'blue';
    else if (color === 'blue') color = 'light-blue';
    else if (color === 'teal') color = 'green';
    else if (color === 'green') color = 'light-green';

    return `nq-${color}`;
}

export function getBackgroundClass(address: string) {
    return `${getColorClass(address)}-bg`;
}

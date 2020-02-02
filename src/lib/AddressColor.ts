// @ts-ignore Could not find a declaration file for module '@nimiq/iqons'.
import { getBackgroundColorName } from '@nimiq/iqons';

export default function(address: string) {
    let color = getBackgroundColorName(address).toLowerCase() as string;

    // Convert from public to CSS names
    if (color === 'yellow') color = 'gold';
    if (color === 'indigo') color = 'blue';
    if (color === 'blue') color = 'light-blue';
    if (color === 'teal') color = 'green';
    if (color === 'green') color = 'light-green';

    return `nq-${color}-bg`;
}

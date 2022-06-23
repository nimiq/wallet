let API_URL = '';
let APP_ID = '';

export function init(endpoint: string, appId: string) {
    API_URL = endpoint;
    APP_ID = appId;
}

export async function requestAppGrant(): Promise<string> {
    if (!API_URL || !APP_ID) throw new Error('TEN31Pass not initialized, call init first');

    const url = `${API_URL}/grants/request`;

    postRequest(url, { app: APP_ID });

    let resolver: (grant: string) => void;
    let rejecter: (error: Error) => void;

    const promise = new Promise<string>((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
    });

    function listener(event: MessageEvent) {
        if (event.origin !== new URL(API_URL).origin) {
            // TODO change to console.debug when stable
            console.warn(`Ignoring message from unexpected origin ${event.origin}.`); // eslint-disable-line no-console
            return;
        }

        // Ignore messages that are not grant responses
        if (!event.data || !('event' in event.data) || event.data.event !== 'grant-response') {
            // TODO change to console.debug when stable
            console.warn('Ignoring message with unexpected content:', event.data); // eslint-disable-line no-console
            return;
        }

        if (event.data.status === 'Success') {
            resolver(event.data.app);
        } else {
            rejecter(new Error(JSON.stringify(event.data)));
        }

        window.removeEventListener('message', listener);
    }

    window.addEventListener('message', listener);

    return promise;
}
// @ts-expect-error
window.requestAppGrant = requestAppGrant;

function postRequest(url: string, fields: Record<string, any>, openPopup = true): void {
    const form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', url);
    form.style.display = 'none';

    for (const [fieldName, fieldData] of Object.entries(fields)) {
        const field = document.createElement('input');
        field.setAttribute('type', 'hidden');
        field.setAttribute('name', fieldName);
        field.setAttribute('value', typeof fieldData === 'string' ? fieldData : JSON.stringify(fieldData));
        form.appendChild(field);
    }

    if (openPopup) {
        const target = `TEN31Pass_${url.replace(/[^A-Z0-9/]/ig, '-')}}`;
        form.setAttribute('target', target);
        window.open(
            url,
            target,
            `left=${window.innerWidth / 2 - 400},top=75,width=800,height=850,location=yes`,
        );
    }
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 300);
}

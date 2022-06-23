let API_URL = '';
let APP_ID = '';

export type AppGrantDetails = {
    id: string,
    timestamp: string,
    app: {
        id: string,
        displayName: string,
        hasLogo: boolean,
        redirect: string,
        fragment: string | false,
    },
    user: {
        id: string,
        email: string,
        displayName: string,
        identifications: {
            provider: string,
            expiry: string,
        }[],
    },
}

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

export async function getAppGrantDetails(grant: string): Promise<AppGrantDetails> {
    return fetch(`${API_URL}/api/public/grant/app/${grant}`)
        .then((res) => res.json())
        .catch((error) => {
            console.error(error); // eslint-disable-line no-console

            // TODO: Dummy data, remove when CORS works for public API!
            return {
                id: '8f9386a5-9b86-4e6a-977a-a69748c57b18',
                timestamp: '2022-06-23T09:47:57.924158Z',
                app: {
                    id: '1a37384f-7d3a-4ac9-a887-ea1bd35dca16',
                    displayName: 'Dev App 8081',
                    hasLogo: false,
                    redirect: 'http://localhost:8081/',
                    fragment: false,
                },
                user: {
                    id: '3ff70bcd-545d-4860-b34d-34783a14d945',
                    email: 'soeren@nimiq.com',
                    displayName: 'Sören X-MANUALTEST-HAPPYPATH',
                    identifications: [
                        {
                            provider: 'idnow',
                            expiry: '2027-06-24T08:37:52.525834Z',
                        },
                    ],
                },
            };
        });
}

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

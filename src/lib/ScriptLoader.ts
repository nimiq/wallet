const libPromises: {[name: string]: Promise<boolean>} = {};

export async function loadScript(globalName: string, src: string, integrityHash?: string) {
    return libPromises[globalName] || (
        libPromises[globalName] = new Promise<boolean>((resolve, reject) => {
            const script = document.createElement('script');
            script.addEventListener('load', async () => {
                // Wait for script to be parsed: check if global variable is available yet
                // @ts-expect-error Window has no index signature
                while (typeof window[globalName] === 'undefined') {
                    await new Promise((res) => { // eslint-disable-line no-await-in-loop
                        setTimeout(res, 50);
                    });
                }
                resolve(true);
            });
            script.addEventListener('error', reject);
            if (integrityHash) {
                script.integrity = integrityHash;
                script.crossOrigin = 'anonymous';
            }
            script.src = src;
            document.body.appendChild(script);
        })
    );
}

let bitcoinJsPromise: Promise<boolean> | null = null;

export async function loadBitcoinJS(): Promise<boolean> {
    return bitcoinJsPromise || (
        bitcoinJsPromise = new Promise<boolean>((resolve, reject) => {
            const script = document.createElement('script');
            script.addEventListener('load', async () => {
                // Wait for script to be parsed: check if global 'BitcoinJS' variable is available yet
                // @ts-ignore Cannot find name 'BitcoinJS'
                while (typeof BitcoinJS === 'undefined') {
                    await new Promise((res) => setTimeout(res, 100)); // eslint-disable-line no-await-in-loop
                }
                resolve(true);
            });
            script.addEventListener('error', reject);
            script.src = '/btc/BitcoinJS.min.js';
            document.body.appendChild(script);
        })
    );
}

let bitcoinJsPromise: Promise<boolean> | null = null;

export async function loadBitcoinJS(): Promise<boolean> {
    return bitcoinJsPromise || (
        bitcoinJsPromise = new Promise<boolean>((resolve, reject) => {
            const script = document.createElement('script');
            script.addEventListener('load', async () => {
                // Wait for script to be parsed: check if global 'BitcoinJS' variable is available yet
                while (typeof BitcoinJS === 'undefined') {
                    await new Promise((res) => setTimeout(res, 100)); // eslint-disable-line no-await-in-loop
                }
                resolve(true);
            });
            script.addEventListener('error', reject);
            script.integrity = process.env.VUE_APP_BITCOIN_JS_INTEGRITY_HASH!; // defined in vue.config.js
            script.crossOrigin = 'anonymous';
            script.src = '/bitcoin/BitcoinJS.min.js';
            script.integrity = 'sha384-InTmSE4CheiwuiF+i2DHRMZIBZ8lulBS52s0W2QpKqwOsdPfiXLgzXzJC0ONsupD';
            document.body.appendChild(script);
        })
    );
}

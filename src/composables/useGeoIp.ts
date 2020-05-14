export type GeoIpResponse = {
    location?: {
        longitude?: number,
        latitude?: number,
    },
    country?: string,
    city?: string,
}

const CACHE_MAX_SIZE = 1000;
const cacheStore = new Map<string, GeoIpResponse>();

function cached(host: string) {
    return cacheStore.get(host);
}

function cache(host: string, response: GeoIpResponse) {
    // Clear cache
    while (cacheStore.size > CACHE_MAX_SIZE) {
        // Don't remove own location
        const oldestHost = [...cacheStore.keys()].slice(0, 2).filter((key) => !!key).slice(0, 1)[0];
        cacheStore.delete(oldestHost);
    }
    // Save in cache
    cacheStore.set(host, response);
}

async function locate(host = ''): Promise<GeoIpResponse> {
    const cachedResponse = cached(host);
    if (cachedResponse) return cachedResponse;

    const url = `https://geoip.nimiq-network.com:8443/v1/locate${host ? `?host=${host}` : ''}`;

    const response: GeoIpResponse = await fetch(url).then((res) => res.json());
    cache(host, response);
    return response;
}

export function useGeoIp() {
    return {
        locate,
    };
}

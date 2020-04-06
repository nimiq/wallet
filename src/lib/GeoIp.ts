/**
 * Created by pb on 02.06.17.
 */

export default class GeoIP {
    private static CACHE_MAX_SIZE = 1000;
    private static _cacheStore: {[host: string]: {location: {longitude: number, latitude: number}}} = {};
    private static _cacheOrder: string[] = [];

    static _cached(host: string) {
        return GeoIP._cacheStore[host];
    }

    static _cache(host: string, response: {location: {longitude: number, latitude: number}}) {
        // clear cache
        if (GeoIP._cacheOrder.length >= GeoIP.CACHE_MAX_SIZE) {
            const oldestHost = GeoIP._cacheOrder.shift()!;
            delete GeoIP._cacheStore[oldestHost];
        }
        // save in cache
        GeoIP._cacheStore[host] = response;
        // if not own host, allow to remove
        if (host.length > 0) {
            GeoIP._cacheOrder.push(host);
        }
    }

    static retrieveOwn(callback: (response: {location: {longitude: number, latitude: number}}) => void) {
        GeoIP.retrieve(callback, '');
    }

    static retrieve(callback: (response: {location: {longitude: number, latitude: number}}) => void, host: string) {
        const cachedResponse = GeoIP._cached(host);
        if (cachedResponse) {
            callback(cachedResponse);
            return;
        }

        if (window.location.origin.indexOf('miner.localhost') !== -1) return;

        // const xmlhttp = new XMLHttpRequest();
        const url = `https://geoip.nimiq-network.com:8443/v1/locate${(
            host && host.length > 0
                ? `?host=${host}`
                : '')}`;

        fetch(url).then(
            (res) => res.json().then(
                (response: {location: {longitude: number, latitude: number}}) => {
                    GeoIP._cache(host, response);
                    callback(response);
                },
            ),
        ).catch(() => {
            // do nothing for now
        });
    }
}

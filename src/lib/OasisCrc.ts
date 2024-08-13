import {
    getHtlc as getHtlcOrig,
    settleHtlc as settleHtlcOrig,
    sandboxMockClearHtlc as sandboxMockClearHtlcOrig,
    exchangeAuthorizationToken as exchangeAuthorizationTokenOrig,
    type SettlementTokens,
} from '@nimiq/oasis-api';
import config from 'config';

export async function getHtlc(id: string) {
    return getHtlcOrig(config.sinpeMovil.apiEndpoint, id);
}

export async function sandboxMockClearHtlc(id: string) {
    return sandboxMockClearHtlcOrig(config.sinpeMovil.apiEndpoint, id);
}

export async function exchangeAuthorizationToken(token: string) {
    return exchangeAuthorizationTokenOrig(config.sinpeMovil.apiEndpoint, token);
}

export async function settleHtlc(id: string, secret: string, settlementJWS: string, tokens?: SettlementTokens) {
    return settleHtlcOrig(config.sinpeMovil.apiEndpoint, id, secret, settlementJWS, tokens);
}

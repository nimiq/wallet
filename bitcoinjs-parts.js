/* eslint-disable @typescript-eslint/no-var-requires */

const {
    address,

    // Required by @nimiq/electrum-client
    networks,
    Transaction,
    script,
    payments,
    Block,
} = require('bitcoinjs-lib'); // eslint-disable-line import/no-extraneous-dependencies

// Required by @nimiq/electrum-client
const { Buffer } = require('buffer');

module.exports = {
    address,

    // Required by @nimiq/electrum-client
    networks,
    Transaction,
    script,
    payments,
    Block,
    Buffer,
};

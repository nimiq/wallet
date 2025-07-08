/* eslint-disable max-len, no-console */
import { KeyPair, PlainTransactionDetails, PrivateKey } from '@nimiq/core';
import { TransactionState as ElectrumTransactionState } from '@nimiq/electrum-client';
import {
    type Transaction as NimTransaction,
    useTransactionsStore,
    toSecs,
} from '@/stores/Transactions';
import {
    useBtcTransactionsStore,
    type Transaction as BtcTransaction,
} from '@/stores/BtcTransactions';
import {
    useUsdtTransactionsStore,
    TransactionState as UsdtTransactionState,
    type Transaction as UsdtTransaction,
} from '@/stores/UsdtTransactions';
import {
    useUsdcTransactionsStore,
    TransactionState as UsdcTransactionState,
    type Transaction as UsdcTransaction,
} from '@/stores/UsdcTransactions';
import { useAddressStore } from '@/stores/Address';
import { useContactsStore } from '@/stores/Contacts';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { useBtcLabelsStore } from '@/stores/BtcLabels';
import { useUsdcContactsStore } from '@/stores/UsdcContacts';
import { useUsdtContactsStore } from '@/stores/UsdtContacts';
import Config from 'config';
import {
    nimInitialBalance,
    btcInitialBalance,
    usdcInitialBalance,
    usdtInitialBalance,
    demoNimAddress,
    demoBtcAddress,
    demoPolygonAddress,
    buyFromAddress,
} from './DemoConstants';
import { encodeTextToHex, calculateDaysAgo, getRandomPolygonHash, getRandomPolygonAddress } from './DemoUtils';

// #region NIM Transactions

interface NimTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
}

/**
 * Defines transaction definitions for demo NIM transactions
 * Story: A crypto enthusiast who made money with BTC, converted to NIM, and travels the world
 */
function defineNimFakeTransactions(): Partial<NimTransaction>[] {
    const txDefinitions: NimTransactionDefinition[] = [
        // Recent transactions - Currently in Europe
        { fraction: -0.015, daysAgo: 0.2, description: 'Coffee in Saarsbrücken downtown', recipientLabel: 'Café am Markt' },
        { fraction: -0.03, daysAgo: 0.8, description: 'Train ticket to Saarsbrücken', recipientLabel: 'Deutsche Bahn' },
        { fraction: -0.025, daysAgo: 1.2, description: 'Hostel in Frankfurt', recipientLabel: 'Frankfurt Backpackers' },

        // Europe - Western & Central
        { fraction: -0.04, daysAgo: 3, description: 'Dinner in Berlin', recipientLabel: 'Local Bistro' },
        { fraction: -0.02, daysAgo: 4, description: 'Museum entry in Berlin', recipientLabel: 'Museum Island' },
        { fraction: -0.035, daysAgo: 6, description: 'Night train to Prague', recipientLabel: 'Czech Railways' },
        { fraction: -0.03, daysAgo: 8, description: 'Traditional meal in Prague', recipientLabel: 'Old Town Restaurant' },
        { fraction: -0.045, daysAgo: 12, description: 'Bus to Vienna', recipientLabel: 'FlixBus' },

        // Europe - Mediterranean
        { fraction: -0.06, daysAgo: 18, description: 'Ferry to Greek Islands', recipientLabel: 'Aegean Sea Lines' },
        { fraction: -0.04, daysAgo: 22, description: 'Santorini sunset tour', recipientLabel: 'Island Tours' },
        { fraction: -0.055, daysAgo: 28, description: 'Flight Athens to Istanbul', recipientLabel: 'Turkish Airlines' },

        // Asia - Middle East & Central
        { fraction: -0.03, daysAgo: 32, description: 'Turkish bath in Istanbul', recipientLabel: 'Galata Hammam' },
        { fraction: -0.07, daysAgo: 38, description: 'Overland bus to Uzbekistan', recipientLabel: 'Central Asia Transit' },
        { fraction: -0.035, daysAgo: 45, description: 'Silk Road tour in Samarkand', recipientLabel: 'Heritage Tours' },

        // Asia - South & Southeast
        { fraction: -0.08, daysAgo: 52, description: 'Flight to Delhi', recipientLabel: 'Air India' },
        { fraction: -0.025, daysAgo: 58, description: 'Train ticket to Rajasthan', recipientLabel: 'Indian Railways' },
        { fraction: -0.04, daysAgo: 65, description: 'Camel safari in Jaisalmer', recipientLabel: 'Desert Adventures' },
        { fraction: -0.06, daysAgo: 72, description: 'Flight to Bangkok', recipientLabel: 'Thai Airways' },
        { fraction: -0.02, daysAgo: 78, description: 'Bus to Bangkok city center', recipientLabel: 'Bangkok Bus' },
        { fraction: -0.03, daysAgo: 82, description: 'Street food tour Bangkok', recipientLabel: 'Local Food Guide' },
        { fraction: -0.045, daysAgo: 88, description: 'Train to Vietnam border', recipientLabel: 'Thai State Railways' },

        // Asia - Vietnam (Nimiq community location)
        { fraction: -0.035, daysAgo: 95, description: 'Motorbike rental in Ho Chi Minh', recipientLabel: 'Saigon Bikes' },
        { fraction: -0.025, daysAgo: 98, description: 'Pho lunch in District 1', recipientLabel: 'Pho 2000' },
        { fraction: -0.04, daysAgo: 105, description: 'Halong Bay cruise', recipientLabel: 'Heritage Cruises' },
        { fraction: -0.03, daysAgo: 112, description: 'Night bus to Hanoi', recipientLabel: 'Vietnam Bus Lines' },

        // Asia - East
        { fraction: -0.08, daysAgo: 125, description: 'Flight Hanoi to Tokyo', recipientLabel: 'Vietnam Airlines' },
        { fraction: -0.05, daysAgo: 132, description: 'JR Pass for bullet trains', recipientLabel: 'JR Central' },
        { fraction: -0.035, daysAgo: 138, description: 'Sushi dinner in Shibuya', recipientLabel: 'Tokyo Sushi Bar' },

        // Oceania
        { fraction: -0.12, daysAgo: 148, description: 'Flight Tokyo to Sydney', recipientLabel: 'Qantas Airways' },
        { fraction: -0.04, daysAgo: 155, description: 'Hostel in Bondi Beach', recipientLabel: 'Bondi Backpackers' },
        { fraction: -0.045, daysAgo: 162, description: 'Great Barrier Reef tour', recipientLabel: 'Reef Tours Australia' },
        { fraction: -0.06, daysAgo: 175, description: 'Flight Sydney to Auckland', recipientLabel: 'Air New Zealand' },
        { fraction: -0.035, daysAgo: 182, description: 'Hobbiton movie set tour', recipientLabel: 'NZ Movie Tours' },

        // Africa - East & South
        { fraction: -0.15, daysAgo: 195, description: 'Flight Auckland to Nairobi', recipientLabel: 'Kenya Airways' },
        { fraction: -0.055, daysAgo: 205, description: 'Safari in Masai Mara', recipientLabel: 'African Safaris' },
        { fraction: -0.04, daysAgo: 215, description: 'Bus to Tanzania border', recipientLabel: 'East Africa Shuttle' },
        { fraction: -0.06, daysAgo: 225, description: 'Kilimanjaro base camp trek', recipientLabel: 'Mountain Guides' },
        { fraction: -0.08, daysAgo: 238, description: 'Flight to Cape Town', recipientLabel: 'South African Airways' },
        { fraction: -0.035, daysAgo: 248, description: 'Table Mountain cable car', recipientLabel: 'SA Tourism' },

        // Africa - West (The Gambia - Nimiq community location)
        { fraction: -0.1, daysAgo: 265, description: 'Flight Cape Town to Banjul', recipientLabel: 'Brussels Airlines' },
        { fraction: -0.03, daysAgo: 272, description: 'River cruise in The Gambia', recipientLabel: 'Gambia River Tours' },
        { fraction: -0.025, daysAgo: 278, description: 'Local market in Banjul', recipientLabel: 'Banjul Market' },
        { fraction: -0.04, daysAgo: 285, description: 'Cultural tour in Juffureh', recipientLabel: 'Heritage Gambia' },

        // North America - Central America (Costa Rica - Nimiq community location)
        { fraction: -0.11, daysAgo: 298, description: 'Flight Banjul to San José', recipientLabel: 'TAP Air Portugal' },
        { fraction: -0.045, daysAgo: 308, description: 'Zip-lining in Monteverde', recipientLabel: 'Costa Rica Adventures' },
        { fraction: -0.035, daysAgo: 315, description: 'Eco-lodge in Manuel Antonio', recipientLabel: 'Rainforest Lodge' },
        { fraction: -0.055, daysAgo: 325, description: 'Volcano tour near San José', recipientLabel: 'Volcano Expeditions' },

        // North America - USA & Canada
        { fraction: -0.08, daysAgo: 345, description: 'Flight San José to Miami', recipientLabel: 'American Airlines' },
        { fraction: -0.04, daysAgo: 358, description: 'Road trip car rental', recipientLabel: 'Enterprise Rent-A-Car' },
        { fraction: -0.035, daysAgo: 368, description: 'Grand Canyon entrance fee', recipientLabel: 'National Park Service' },
        { fraction: -0.06, daysAgo: 385, description: 'Train to Vancouver', recipientLabel: 'Via Rail Canada' },
        { fraction: -0.04, daysAgo: 398, description: 'Whale watching in Victoria', recipientLabel: 'Pacific Marine Tours' },

        // South America
        { fraction: -0.12, daysAgo: 418, description: 'Flight Vancouver to Lima', recipientLabel: 'LATAM Airlines' },
        { fraction: -0.045, daysAgo: 432, description: 'Inca Trail permit', recipientLabel: 'Peru National Parks' },
        { fraction: -0.06, daysAgo: 445, description: 'Machu Picchu guided tour', recipientLabel: 'Ancient Paths Peru' },
        { fraction: -0.08, daysAgo: 465, description: 'Bus to La Paz Bolivia', recipientLabel: 'Cruz del Sur' },
        { fraction: -0.055, daysAgo: 485, description: 'Salt flats tour Uyuni', recipientLabel: 'Uyuni Expeditions' },
        { fraction: -0.1, daysAgo: 505, description: 'Flight La Paz to Rio', recipientLabel: 'GOL Airlines' },
        { fraction: -0.04, daysAgo: 518, description: 'Christ the Redeemer visit', recipientLabel: 'Rio Tourism' },
        { fraction: -0.035, daysAgo: 535, description: 'Copacabana beach day', recipientLabel: 'Beach Vendors' },

        // Antarctica (Research station visit)
        { fraction: -0.2, daysAgo: 558, description: 'Antarctic expedition cruise', recipientLabel: 'Polar Expeditions' },
        { fraction: -0.03, daysAgo: 578, description: 'Research station donation', recipientLabel: 'Antarctic Foundation' },

        // Early journey setup - BTC profits and conversion
        { fraction: 0.15, daysAgo: 600, description: 'Sold BTC at peak for travel fund', recipientLabel: 'Crypto Exchange' },
        { fraction: 0.18, daysAgo: 650, description: 'Bitcoin mining rewards', recipientLabel: 'Mining Pool' },
        { fraction: 0.12, daysAgo: 720, description: 'Early BTC investment profit', recipientLabel: 'Digital Assets' },
        { fraction: 0.25, daysAgo: 800, description: 'BTC sale for world trip', recipientLabel: 'Binance Exchange' },

        // Initial crypto journey
        { fraction: 0.08, daysAgo: 900, description: 'First successful BTC trade', recipientLabel: 'Trading Platform' },
        { fraction: 0.2, daysAgo: 1200, description: 'Early Bitcoin purchase gains', recipientLabel: 'Crypto Broker' },
        { fraction: 0.1, daysAgo: 1400, description: 'Freelance payment in crypto', recipientLabel: 'Tech Client' },
    ];

    // Calculate sum of existing transactions to ensure they add up to exactly 1
    const existingSum = txDefinitions.reduce((sum, def) => sum + def.fraction, 0);
    const remainingFraction = 1 - existingSum;

    // Add the final balancing transaction if needed
    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: 1450,
            description: remainingFraction > 0
                ? 'Initial Bitcoin investment'
                : 'Final trip preparation expense',
            recipientLabel: remainingFraction > 0 ? 'Genesis Block' : 'Travel Prep',
        });
    }

    const { setContact } = useContactsStore();
    const txs: Partial<NimTransaction>[] = [];

    for (const def of txDefinitions) {
        let txValue = Math.floor(nimInitialBalance * def.fraction);
        // Adjust so it doesn't end in a 0 digit
        while (txValue > 0 && txValue % 10 === 0) {
            txValue -= 1;
        }

        const hex = encodeTextToHex(def.description);
        const to32Bytes = (h: string) => h.padStart(64, '0').slice(-64);
        const address = KeyPair.derive(PrivateKey.fromHex(to32Bytes(hex))).toAddress().toUserFriendlyAddress();
        const recipient = def.fraction > 0 ? demoNimAddress : address;
        const sender = def.fraction > 0 ? address : demoNimAddress;
        const data = { type: 'raw', raw: hex } as const;
        const value = Math.abs(txValue);
        const timestamp = calculateDaysAgo(def.daysAgo);
        const tx: Partial<PlainTransactionDetails> = { value, recipient, sender, timestamp, data };
        txs.push(tx);
        // Add contact if a recipientLabel is provided
        if (def.recipientLabel && def.fraction < 0) {
            setContact(address, def.recipientLabel);
        }
    }

    return txs.sort((a, b) => a.timestamp! - b.timestamp!);
}

let head = 0;
let nonce = 0;

export function transformNimTransaction(txs: Partial<NimTransaction>[]): NimTransaction[] {
    return txs.map((tx) => {
        head++;
        nonce++;

        return {
            network: 'mainnet',
            state: 'confirmed',
            transactionHash: `0x${nonce.toString(16)}`,
            sender: '',
            senderType: 'basic',
            recipient: '',
            recipientType: 'basic',
            value: 50000000,
            fee: 0,
            feePerByte: 0,
            format: 'basic',
            validityStartHeight: head,
            blockHeight: head,
            flags: 0,
            timestamp: Date.now(),
            size: 0,
            valid: true,
            proof: { raw: '', type: 'raw' },
            data: tx.data || { type: 'raw', raw: '' },
            ...tx,
        };
    });
}

/**
 * Inserts NIM transactions into the store. If no definitions provided, uses default demo transactions.
 */
export function insertFakeNimTransactions(txs = defineNimFakeTransactions()): void {
    const { addTransactions } = useTransactionsStore();
    addTransactions(transformNimTransaction(txs));
}

/**
 * Updates the NIM balance after a transaction
 */
export function updateNimBalance(amount: number): void {
    const addressStore = useAddressStore();
    const currentAddressInfo = addressStore.addressInfos.value.find((info) => info.address === demoNimAddress);

    if (currentAddressInfo) {
        const newBalance = (currentAddressInfo.balance || 0) + amount;
        addressStore.patchAddress(demoNimAddress, { balance: newBalance });
    } else {
        console.error('[Demo] Failed to update NIM balance: Address not found');
    }
}

export function dangerouslyInsertFakeBuyNimTransaction(amount: number): void {
    const tx: Partial<NimTransaction> = {
        value: amount,
        recipient: demoNimAddress,
        sender: buyFromAddress,
        data: {
            type: 'raw',
            raw: encodeTextToHex('NIM Bank purchase'),
        },
    };

    setTimeout(() => {
        const { addTransactions } = useTransactionsStore();
        addTransactions(transformNimTransaction([tx]));
        updateNimBalance(amount);
    }, 1_500);
}

// #endregion

// #region BTC Transactions

interface BtcTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
    address: string;
}

/**
 * Defines transaction definitions for demo BTC transactions.
 * Story: The BTC journey that funded the world travel adventure
 */
function defineBtcFakeTransactions(): BtcTransaction[] {
    const txDefinitions: BtcTransactionDefinition[] = [
        // Recent BTC usage during travel
        {
            fraction: -0.05,
            daysAgo: 50,
            description: 'Emergency flight change in Bangkok',
            incoming: false,
            address: '1TravelEmergencyBangkok5KJH9x2mN8qP',
            recipientLabel: 'Bangkok Airways',
        },
        {
            fraction: -0.08,
            daysAgo: 150,
            description: 'Luxury hotel in Sydney with BTC',
            incoming: false,
            address: '1SydneyLuxuryHotel7P8qR3mK5nB2',
            recipientLabel: 'Sydney Grand Hotel',
        },
        {
            fraction: -0.1,
            daysAgo: 280,
            description: 'Private safari booking in Kenya',
            incoming: false,
            address: '1KenyaSafariLodge9M4tX6pL8cQ7',
            recipientLabel: 'Mara Safari Lodge',
        },

        // Major BTC sales that funded the trip
        {
            fraction: -0.3,
            daysAgo: 590,
            description: 'BTC to NIM conversion for world trip',
            incoming: false,
            address: '1NimiqExchangeConvert12Kx8B9mP',
            recipientLabel: 'NIM Exchange',
        },
        {
            fraction: -0.25,
            daysAgo: 620,
            description: 'Sold BTC for travel emergency fund',
            incoming: false,
            address: '1TravelFundExchange45mQ7pK8Nx',
            recipientLabel: 'Crypto Travel Fund',
        },

        // BTC accumulation period
        {
            fraction: 0.2,
            daysAgo: 800,
            description: 'Mining pool rewards from home setup',
            incoming: true,
            address: '1MiningPoolRewards78pL3nK9Mx',
            recipientLabel: 'Home Mining Pool',
        },
        {
            fraction: 0.15,
            daysAgo: 1000,
            description: 'DeFi yield farming profits',
            incoming: true,
            address: '1DeFiYieldPlatform56nB2mL8Kx',
            recipientLabel: 'Compound Finance',
        },
        {
            fraction: 0.12,
            daysAgo: 1200,
            description: 'Freelance web development payment',
            incoming: true,
            address: '1FreelanceClientBTC89pM3nK7',
            recipientLabel: 'Tech Startup Client',
        },
        {
            fraction: 0.18,
            daysAgo: 1400,
            description: 'Bitcoin bull run profits',
            incoming: true,
            address: '1BullRunGains2021mK8pL5nQ3',
            recipientLabel: 'Trading Exchange',
        },
        {
            fraction: 0.25,
            daysAgo: 1600,
            description: 'Early Bitcoin investment from 2017',
            incoming: true,
            address: '1EarlyBTCInvestment34mN9pK8',
            recipientLabel: 'Coinbase Pro',
        },
        {
            fraction: 0.08,
            daysAgo: 1800,
            description: 'First Bitcoin purchase',
            incoming: true,
            address: '1FirstBTCPurchase567pL2nM8',
            recipientLabel: 'Local Bitcoin ATM',
        },
    ].sort((a, b) => b.daysAgo - a.daysAgo);

    // If the sum of fractions does not add up to 1, add a balancing transaction.
    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;
    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: Math.abs(remainingFraction),
            daysAgo: 2000,
            description: remainingFraction > 0 ? 'Genesis block mining reward' : 'Final preparation',
            incoming: remainingFraction > 0,
            address: remainingFraction > 0 ? '1GenesisMining2009Satoshi12' : '1FinalPrep2024Ready567',
            recipientLabel: remainingFraction > 0 ? 'Genesis Mining' : 'Preparation Fund',
        });
    }

    return transformBtcTransaction(txDefinitions);
}

/**
 * Transforms BTC transaction definitions into actual transactions.
 */
export function transformBtcTransaction(txDefinitions: BtcTransactionDefinition[]): BtcTransaction[] {
    const transactions = [];
    const knownUtxos = new Map();
    let txCounter = 1;

    for (const def of txDefinitions) {
        const txHash = `btc-tx-${txCounter++}`;
        // Compute the value using the initial BTC balance and the fraction.
        const value = Math.floor(btcInitialBalance * Math.abs(def.fraction));

        const tx: BtcTransaction = {
            addresses: [demoBtcAddress],
            isCoinbase: false,
            inputs: [
                {
                    // For incoming tx, use the external address; for outgoing, use our demo address.
                    address: def.incoming ? def.address : demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'script',
                    sequence: 4294967295,
                    transactionHash: def.incoming ? txHash : (getUTXOToSpend(knownUtxos)?.txHash || txHash),
                    witness: ['witness'],
                },
            ],
            outputs: def.incoming
                ? [
                    {
                        value,
                        address: demoBtcAddress,
                        script: 'script',
                        index: 0,
                    },
                ]
                : [
                    {
                        value,
                        address: def.address,
                        script: 'script',
                        index: 0,
                    },
                    {
                        // Change output.
                        value: 1000000,
                        address: demoBtcAddress,
                        script: 'script',
                        index: 1,
                    },
                ],
            transactionHash: txHash,
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: Math.max(1, Math.floor(10 - def.daysAgo / 200)),
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
            state: ElectrumTransactionState.CONFIRMED,
        };

        updateUTXOs(knownUtxos, tx);
        transactions.push(tx);

        // Set labels if a recipient label is provided.
        if (def.recipientLabel) {
            const { setSenderLabel } = useBtcLabelsStore();
            setSenderLabel(def.incoming ? def.address : demoBtcAddress, def.recipientLabel);
        }
    }

    // Update the address store with the current UTXOs.
    const { addAddressInfos } = useBtcAddressStore();
    addAddressInfos([{
        address: demoBtcAddress,
        txoCount: transactions.length + 2, // Total number of outputs received.
        utxos: Array.from(knownUtxos.values()),
    }]);

    return transactions;
}

/**
 * Tracks UTXO changes for BTC transactions.
 */
function updateUTXOs(knownUtxos: Map<string, any>, tx: any): void {
    // Remove spent inputs.
    for (const input of tx.inputs) {
        if (input.address === demoBtcAddress) {
            const utxoKey = `${input.transactionHash}:${input.outputIndex}`;
            knownUtxos.delete(utxoKey);
        }
    }

    // Add new outputs for our address.
    for (const output of tx.outputs) {
        if (output.address === demoBtcAddress) {
            const utxoKey = `${tx.transactionHash}:${output.index}`;
            knownUtxos.set(utxoKey, {
                transactionHash: tx.transactionHash,
                index: output.index,
                witness: {
                    script: output.script,
                    value: output.value,
                },
            });
        }
    }
}

/**
 * Helper to get a UTXO to spend.
 */
function getUTXOToSpend(knownUtxos: Map<string, any>): any {
    if (knownUtxos.size === 0) return null;
    const utxo = knownUtxos.values().next().value;
    return {
        txHash: utxo.transactionHash,
        index: utxo.index,
        value: utxo.witness.value,
    };
}

/**
 * Insert fake BTC transactions into the store.
 */
export function insertFakeBtcTransactions(txs = defineBtcFakeTransactions()): void {
    const { addTransactions } = useBtcTransactionsStore();
    addTransactions(txs);
}

/**
 * Updates the BTC address balance by adding a new UTXO
 */
export function updateBtcBalance(amount: number): void {
    const btcAddressStore = useBtcAddressStore();
    const addressInfo = btcAddressStore.state.addressInfos[demoBtcAddress];

    if (!addressInfo) {
        console.error('[Demo] Failed to update BTC balance: Address not found');
        return;
    }

    // Create a unique transaction hash
    const txHash = `btc-tx-swap-${Date.now().toString(16)}`;

    // Create a proper UTXO with the correct format
    const newUtxo = {
        transactionHash: txHash,
        index: 0,
        witness: {
            script: 'script',
            value: amount * 1e-6,
        },
        txoValue: amount * 1e-6,
    };

    btcAddressStore.addAddressInfos([{
        address: demoBtcAddress,
        utxos: [...(addressInfo.utxos || []), newUtxo],
    }]);

    console.log(`[Demo] Updated BTC balance, added UTXO with value: ${amount * 1e-6}`);
}

// #endregion

// #region Polygon Transactions

interface UsdcTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
}

/**
 * Defines transaction definitions for demo USDC transactions
 * Story: Strategic stablecoin usage during world travel for specific situations
 */
function defineUsdcFakeTransactions(): UsdcTransaction[] {
    const txDefinitions: UsdcTransactionDefinition[] = [
        // Recent stablecoin usage for stability
        {
            fraction: -0.12,
            daysAgo: 25,
            description: 'Hotel deposit in Berlin (stable value needed)',
            incoming: false,
            recipientLabel: 'Berlin Luxury Hotel',
        },
        {
            fraction: -0.08,
            daysAgo: 85,
            description: 'Travel insurance premium',
            incoming: false,
            recipientLabel: 'Global Travel Insurance',
        },

        // Asia - Used for larger expenses where stability matters
        {
            fraction: -0.15,
            daysAgo: 120,
            description: 'Long-term accommodation in Tokyo',
            incoming: false,
            recipientLabel: 'Tokyo Monthly Rental',
        },
        {
            fraction: -0.1,
            daysAgo: 180,
            description: 'Medical check-up in Singapore',
            incoming: false,
            recipientLabel: 'Singapore General Hospital',
        },

        // Africa - Stable value for major bookings
        {
            fraction: -0.18,
            daysAgo: 250,
            description: 'Adventure tour package in Cape Town',
            incoming: false,
            recipientLabel: 'African Adventure Co',
        },

        // Americas - Large bookings and official payments
        {
            fraction: -0.14,
            daysAgo: 320,
            description: 'National park tour package Costa Rica',
            incoming: false,
            recipientLabel: 'Costa Rica Nature Tours',
        },
        {
            fraction: -0.16,
            daysAgo: 380,
            description: 'Car rental deposit for US road trip',
            incoming: false,
            recipientLabel: 'US Car Rental Deposit',
        },

        // Initial funding and DeFi activities
        {
            fraction: 0.25,
            daysAgo: 450,
            description: 'Liquidity mining rewards',
            incoming: true,
            recipientLabel: 'Uniswap LP Rewards',
        },
        {
            fraction: 0.2,
            daysAgo: 550,
            description: 'Stable income from yield farming',
            incoming: true,
            recipientLabel: 'Aave Lending Pool',
        },
        {
            fraction: 0.18,
            daysAgo: 650,
            description: 'Converted BTC profits to stablecoin',
            incoming: true,
            recipientLabel: 'Crypto Conversion',
        },
        {
            fraction: 0.3,
            daysAgo: 800,
            description: 'Initial stablecoin purchase for travel',
            incoming: true,
            recipientLabel: 'Coinbase USDC',
        },
    ];

    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;

    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: Math.abs(remainingFraction),
            daysAgo: remainingFraction > 0 ? 900 : 950,
            description: remainingFraction > 0 ? 'DeFi protocol rewards' : 'Travel preparation funds',
            incoming: remainingFraction > 0,
            recipientLabel: remainingFraction > 0 ? 'DeFi Platform' : 'Preparation Expense',
        });
    }

    return transformUsdcTransaction(txDefinitions);
}

/**
 * Transform USDC transaction definitions into actual transactions
 */
function transformUsdcTransaction(txDefinitions: UsdcTransactionDefinition[]): UsdcTransaction[] {
    return txDefinitions.map((def, index) => {
        const value = Math.floor(usdcInitialBalance * Math.abs(def.fraction));
        const randomAddress = def.incoming ? getRandomPolygonAddress() : demoPolygonAddress;
        const recipientAddress = def.incoming ? demoPolygonAddress : getRandomPolygonAddress();

        if (def.recipientLabel) {
            const { setContact } = useUsdcContactsStore();
            setContact(def.incoming ? randomAddress : recipientAddress, def.recipientLabel);
        }

        return {
            token: Config.polygon.usdc.tokenContract,
            transactionHash: getRandomPolygonHash(),
            logIndex: index,
            sender: randomAddress,
            recipient: recipientAddress,
            value,
            state: UsdcTransactionState.CONFIRMED,
            blockHeight: 1000000 + index,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
        };
    });
}

/**
 * Insert fake USDC transactions into the store
 */
export function insertFakeUsdcTransactions(txs = defineUsdcFakeTransactions()): void {
    const { addTransactions } = useUsdcTransactionsStore();
    addTransactions(txs);
}

interface UsdtTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
}

/**
 * Defines transaction definitions for demo USDT transactions
 * Story: Additional stablecoin for trading and specific travel situations
 */
function defineUsdtFakeTransactions(): UsdtTransaction[] {
    const txDefinitions: UsdtTransactionDefinition[] = [
        // Recent trading and travel activities
        {
            fraction: 0.18,
            daysAgo: 15,
            description: 'Arbitrage trading profits Europe',
            incoming: true,
            recipientLabel: 'European DEX',
        },
        {
            fraction: -0.09,
            daysAgo: 45,
            description: 'Emergency funds transfer to family',
            incoming: false,
            recipientLabel: 'Family Support',
        },

        // Asia - Trading and remittances
        {
            fraction: 0.15,
            daysAgo: 110,
            description: 'Crypto trading gains in Vietnam',
            incoming: true,
            recipientLabel: 'Vietnam Crypto Exchange',
        },
        {
            fraction: -0.12,
            daysAgo: 135,
            description: 'Online course payment from Japan',
            incoming: false,
            recipientLabel: 'Japanese Language Course',
        },

        // Oceania - Stable payments for services
        {
            fraction: -0.08,
            daysAgo: 170,
            description: 'Work visa processing fee Australia',
            incoming: false,
            recipientLabel: 'Australian Immigration',
        },

        // Africa - Remittances and local payments
        {
            fraction: -0.06,
            daysAgo: 290,
            description: 'Local guide payment in The Gambia',
            incoming: false,
            recipientLabel: 'Local Gambian Guide',
        },
        {
            fraction: 0.1,
            daysAgo: 310,
            description: 'Freelance consulting payment',
            incoming: true,
            recipientLabel: 'African Tech Startup',
        },

        // Americas - Cross-border payments
        {
            fraction: -0.14,
            daysAgo: 350,
            description: 'University course enrollment Costa Rica',
            incoming: false,
            recipientLabel: 'Universidad de Costa Rica',
        },
        {
            fraction: 0.12,
            daysAgo: 420,
            description: 'Remote work payment from US client',
            incoming: true,
            recipientLabel: 'US Tech Company',
        },

        // South America - Local services
        {
            fraction: -0.07,
            daysAgo: 480,
            description: 'Altitude sickness treatment Bolivia',
            incoming: false,
            recipientLabel: 'Bolivian Medical Center',
        },

        // Initial funding and DeFi
        {
            fraction: 0.2,
            daysAgo: 580,
            description: 'Lending protocol rewards',
            incoming: true,
            recipientLabel: 'Compound Protocol',
        },
        {
            fraction: 0.15,
            daysAgo: 720,
            description: 'Stable arbitrage trading profits',
            incoming: true,
            recipientLabel: 'Cross-DEX Arbitrage',
        },
        {
            fraction: 0.16,
            daysAgo: 850,
            description: 'Initial USDT for trading capital',
            incoming: true,
            recipientLabel: 'Binance USDT',
        },
    ];

    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;

    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: Math.abs(remainingFraction),
            daysAgo: remainingFraction > 0 ? 950 : 1000,
            description: remainingFraction > 0 ? 'Initial trading capital' : 'Trading preparation',
            incoming: remainingFraction > 0,
            recipientLabel: remainingFraction > 0 ? 'Trading Platform' : 'Trading Preparation',
        });
    }

    return transformUsdtTransaction(txDefinitions);
}

/**
 * Transform USDT transaction definitions into actual transactions
 */
function transformUsdtTransaction(txDefinitions: UsdtTransactionDefinition[]): UsdtTransaction[] {
    return txDefinitions.map((def, index) => {
        const value = Math.floor(usdtInitialBalance * Math.abs(def.fraction));
        const randomAddress = def.incoming ? getRandomPolygonAddress() : demoPolygonAddress;
        const recipientAddress = def.incoming ? demoPolygonAddress : getRandomPolygonAddress();

        if (def.recipientLabel) {
            const { setContact } = useUsdtContactsStore();
            setContact(def.incoming ? randomAddress : recipientAddress, def.recipientLabel);
        }

        return {
            token: Config.polygon.usdt_bridged.tokenContract,
            transactionHash: getRandomPolygonHash(),
            logIndex: index,
            sender: randomAddress,
            recipient: recipientAddress,
            value,
            state: UsdtTransactionState.CONFIRMED,
            blockHeight: 1000000 + index,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
        };
    });
}

/**
 * Insert fake USDT transactions into the store
 */
export function insertFakeUsdtTransactions(txs = defineUsdtFakeTransactions()): void {
    const { addTransactions } = useUsdtTransactionsStore();
    addTransactions(txs);
}

// #endregion

// #region Staking Transactions

/**
 * Creates a staking transaction for the demo environment
 */
export function createStakeTransaction(amount: number, validatorAddress: string): Partial<NimTransaction> {
    return {
        value: amount,
        recipient: validatorAddress,
        sender: demoNimAddress,
        timestamp: Date.now(),
        data: { type: 'add-stake', raw: '', staker: demoNimAddress },
    };
}

// #endregion

// #region Swap Transactions

/**
 * Creates the outgoing transaction for a swap operation
 */
export function createSwapOutgoingTransaction(
    fromAsset: string,
    fromAmount: number,
    toAsset: string,
    swapHash: string,
): {
    transaction: Partial<NimTransaction> | any,
    updateBalance: () => void,
} {
    const now = Date.now();
    const nowSecs = Math.floor(now / 1000);

    switch (fromAsset) {
        case 'NIM': {
            // Create a unique transaction hash for the NIM transaction
            const nimTxHash = `nim-swap-${Math.random().toString(16).slice(2, 10)}`;

            // Create HTLC data that would be needed for a real swap
            const nimHtlcAddress = `NQ${Math.random().toString(36).slice(2, 34)}`;

            // Create the NIM transaction with proper HTLC data
            const transaction: Partial<NimTransaction> = {
                value: fromAmount,
                recipient: nimHtlcAddress,
                sender: demoNimAddress,
                timestamp: now,
                transactionHash: nimTxHash,
                data: {
                    type: 'htlc',
                    hashAlgorithm: 'sha256',
                    hashCount: 1,
                    hashRoot: swapHash,
                    raw: encodeTextToHex(`Swap ${fromAsset}-${toAsset}`),
                    recipient: nimHtlcAddress,
                    sender: demoNimAddress,
                    timeout: nowSecs + 3600,
                },
            };

            return {
                transaction,
                updateBalance: () => updateNimBalance(-fromAmount),
            };
        }
        case 'BTC': {
            // Create the BTC transaction definition
            const transaction = {
                address: `1HTLC${Math.random().toString(36).slice(2, 30)}`,
                daysAgo: 0,
                description: `Swap ${fromAsset} to ${toAsset}`,
                fraction: fromAmount / btcInitialBalance,
                incoming: false,
                recipientLabel: 'Bitcoin HTLC',
            };

            return {
                transaction,
                updateBalance: () => updateBtcBalance(-fromAmount),
            };
        }
        default: {
            throw new Error(`Unsupported asset type for swap: ${fromAsset}`);
        }
    }
}

/**
 * Creates the incoming (settlement) transaction for a swap operation
 */
export function createSwapIncomingTransaction(
    toAsset: string,
    toAmount: number,
    fromAsset: string,
    swapHash: string,
    htlcAddress?: string,
): {
    transaction: Partial<NimTransaction> | any,
    updateBalance: () => void,
} {
    const now = Date.now();
    const nowSecs = Math.floor(now / 1000);

    switch (toAsset) {
        case 'NIM': {
            // Create a unique transaction hash for the NIM settlement transaction
            const nimSettlementTxHash = `nim-settle-${Math.random().toString(16).slice(2, 10)}`;

            // Create the NIM settlement transaction
            const transaction: Partial<NimTransaction> = {
                value: toAmount,
                recipient: demoNimAddress,
                sender: htlcAddress || 'HTLC-ADDRESS',
                timestamp: now + 1000, // Slightly after the funding tx
                transactionHash: nimSettlementTxHash,
                data: {
                    type: 'htlc',
                    hashAlgorithm: 'sha256',
                    hashCount: 1,
                    hashRoot: swapHash,
                    raw: encodeTextToHex(`Swap ${fromAsset}-${toAsset}`),
                    recipient: demoNimAddress,
                    sender: htlcAddress || 'HTLC-ADDRESS',
                    timeout: nowSecs + 3600,
                },
            };

            return {
                transaction,
                updateBalance: () => updateNimBalance(toAmount),
            };
        }
        case 'BTC': {
            // Create the BTC settlement transaction
            const transaction = {
                address: demoBtcAddress,
                daysAgo: 0,
                description: `Swap ${fromAsset} to ${toAsset}`,
                fraction: toAmount / btcInitialBalance,
                incoming: true,
                recipientLabel: 'BTC Settlement',
            };

            return {
                transaction,
                updateBalance: () => updateBtcBalance(toAmount),
            };
        }
        default: {
            throw new Error(`Unsupported asset type for swap: ${toAsset}`);
        }
    }
}

/**
 * Completes a swap by creating transactions for both sides and updating balances
 */
export function completeSwapTransactions(
    fromAsset: string,
    fromAmount: number,
    toAsset: string,
    toAmount: number,
): void {
    // Generate a unique hash for this swap to connect both sides
    const swapHash = `swap-${Math.random().toString(36).slice(2, 10)}`;

    // Create outgoing transaction (from asset)
    const outgoing = createSwapOutgoingTransaction(
        fromAsset,
        fromAmount,
        toAsset,
        swapHash,
    );

    if (fromAsset === 'NIM') {
        insertFakeNimTransactions(
            transformNimTransaction([
                outgoing.transaction as Partial<NimTransaction>,
            ]),
        );
    } else if (fromAsset === 'BTC') {
        const transformedBtcTx = transformBtcTransaction([outgoing.transaction]);
        const { addTransactions } = useBtcTransactionsStore();
        addTransactions(transformedBtcTx);
    }
    outgoing.updateBalance();

    // Create incoming transaction (to asset) - with a slight delay for realism
    setTimeout(() => {
        const incoming = createSwapIncomingTransaction(
            toAsset,
            toAmount,
            fromAsset,
            swapHash,
        );

        if (toAsset === 'NIM') {
            insertFakeNimTransactions(
                transformNimTransaction([
                    incoming.transaction as Partial<NimTransaction>,
                ]),
            );
        } else if (toAsset === 'BTC') {
            const transformedBtcTx = transformBtcTransaction([incoming.transaction]);
            const { addTransactions } = useBtcTransactionsStore();
            addTransactions(transformedBtcTx);
        }
        incoming.updateBalance();
    }, 1000);

    console.log('[Demo] Swap completed:', {
        swapHash,
        fromAsset,
        toAsset,
        fromAmount,
        toAmount,
    });
}

// #endregion

import { AddressBook } from '@nimiq/utils';
import { STAKING_CONTRACT_ADDRESS } from './Constants';

// Extend address book with Albatross-specific addresses
AddressBook.BOOK[STAKING_CONTRACT_ADDRESS] = 'Staking Contract';

// TestNet
AddressBook.BOOK['NQ37 7C3V VMN8 FRPN FXS9 PLAG JMRE 8SC6 KUSQ'] = 'Testnet Faucet';
// for (const [address, { label }] of Object.entries(validatorData)) {
//     AddressBook.BOOK[address] = label;
// }

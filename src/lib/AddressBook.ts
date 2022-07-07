import { AddressBook } from '@nimiq/utils';
import { validatorData } from './Validators';

// Extend address book with Albatross-specific addresses
AddressBook.BOOK['NQ38 STAK 1NG0 0000 0000 C0NT RACT 0000 0000'] = 'Staking Contract';

// DevNet
AddressBook.BOOK['NQ37 7C3V VMN8 FRPN FXS9 PLAG JMRE 8SC6 KUSQ'] = 'DevNet Faucet';
for (const [address, { label }] of Object.entries(validatorData)) {
    AddressBook.BOOK[address] = label;
}

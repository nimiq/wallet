/* eslint-disable max-len */

import sepaBankCountries from '../data/banksList/generated/sepaBankCountries.json';

export const ALL_COUNTRY_CODES = ['AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WS', 'YE', 'ZA', 'ZM', 'ZW'];

export const SEPA_COUNTRY_CODES = sepaBankCountries;

// https://support.moonpay.com/hc/en-gb/articles/360009279877-What-are-your-supported-countries-states-and-territories-
const MOONPAY_UNSUPPORTED_COUNTRY_CODES = [
    'AF', // Afghanistan
    'AL', // Albania
    'BS', // Bahamas
    'BD', // Bangladesh
    'BB', // Barbados
    'BY', // Belarus
    'BO', // Bolivia
    'BW', // Botswana
    'KH', // Cambodia
    'KP', // North Korea
    'CN', // China
    'CU', // Cuba
    'EC', // Ecuador
    'GH', // Ghana
    'IS', // Iceland
    'IR', // Iran
    'IQ', // Iraq
    'CI', // Ivory Coast
    'JM', // Jamaica
    'LR', // Liberia
    'MU', // Mauritius
    'MN', // Mongolia
    'MM', // Myanmar
    'NI', // Nicaragua
    'PK', // Pakistan
    'PA', // Panama
    'SD', // Sudan
    'SS', // South Sudan
    'SY', // Syria
    'UG', // Uganda
    'VE', // Venezuela
    'YE', // Yemen
    'ZW', // Zimbabwe

    // US Overseas Territories
    'GU', // Guam
    'MP', // Northern Mariana Islands
    'VI', // US Virgin Islands

    // NIM not available in Moonpay in the US
    // https://support.moonpay.com/hc/en-gb/articles/360009280177-Which-cryptocurrencies-do-you-support-
    'US', // United States
];

export const MOONPAY_COUNTRY_CODES = ALL_COUNTRY_CODES
    .filter((code) => !MOONPAY_UNSUPPORTED_COUNTRY_CODES.includes(code));

// https://support.simplex.com/hc/en-gb/articles/360014137459-What-are-your-supported-countries-states-and-territories-
// Updated from PDF for May sent in group chat
const SIMPLEX_UNSUPPORTED_COUNTRY_CODES = [
    'AF', // Afghanistan
    'AL', // Albania
    'BB', // Barbados
    'BW', // Botswana
    'BF', // Burkina Faso
    'KH', // Cambodia
    'KY', // Cayman Islands
    'CU', // Cuba
    'KP', // North Korea
    'GH', // Ghana
    'HT', // Haiti
    'IR', // Iran
    'IQ', // Iraq
    'JM', // Jamaica
    'KG', // Kyrgyzstan
    'LB', // Lebanon
    'MT', // Malta
    'MA', // Morocco
    'MU', // Mauritius
    'MM', // Myanmar
    'NI', // Nicaragua
    'PA', // Panama
    'PK', // Pakistan
    'PH', // Philippines
    'SD', // Sudan
    'SN', // Senegal
    'SS', // South Sudan
    'SY', // Syria
    'UG', // Uganda
    'YE', // Yemen
    'ZW', // Zimbabwe
];

export const SIMPLEX_COUNTRY_CODES = ALL_COUNTRY_CODES
    .filter((code) => !SIMPLEX_UNSUPPORTED_COUNTRY_CODES.includes(code));

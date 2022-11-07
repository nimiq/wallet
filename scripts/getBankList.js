/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs/promises');
const xlsx = require('xlsx');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const DATA_FOLDER_PATH = './src/data/bankList';

const EBA_RT1_XLSX_FILE_PATH = `${DATA_FOLDER_PATH}/generated/EBA_RT1.xlsx`;
const EBA_RT1_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/generated/EBA_RT1.json`;

const CUSTOM_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/customBankList.json`;
const OUTPUT_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/generated/bankList.json`;
const OUTPUT_JSON_COUNTRIES_FILE_PATH = `${DATA_FOLDER_PATH}/generated/supportedCountries.json`;

const EBA_CLEARING_BASEURL = 'https://www.ebaclearing.eu';
const EBA_CLEARING_PAGE = `${EBA_CLEARING_BASEURL}/services/rt1/participants/`;

const ECB_TIPS_XLSX_FILE_PATH = `${DATA_FOLDER_PATH}/generated/ECB_TIPS.xlsx`;
const ECB_TIPS_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/generated/ECB_TIPS.json`;

const ECB_TIPS_URL = 'https://www.ecb.europa.eu/paym/target/tips/shared/files/tips_participants_and_reachable_parties.xlsx';

const BANK_NETWORK = {
    RT1: 'rt1',
    TIPS: 'tips',
};

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

/**
 * @param {string} path
 * @returns {Object}
 */
async function readFile(path) {
    let data;

    if (path.startsWith('http')) {
        data = await fetch(path).then(res => res.text());
    } else {
        data = await fs.readFile(path, { encoding: 'utf8' });
    }

    return JSON.parse(data);
}

function writeFile(path, data) {
    return fs.writeFile(path, JSON.stringify(data));
}

function download(url, filePath) {
    return fetch(url)
        .then(x => x.arrayBuffer())
        .then(x => fs.writeFile(filePath, Buffer.from(x)));
}

async function getEBABankListUrl() {
    /** @type {string} */
    const html = await fetch(EBA_CLEARING_PAGE).then(res => res.text());

    const $ = cheerio.load(html);
    const obj = $('.text-rte:not(.clear) a');

    if (!obj || obj.length === 0) {
        throw new Error('Scraper error: BankListUrl not found, please update css selector.');
    }

    const href = obj[0].attribs.href;

    if (href.startsWith('https://view.officeapps.live.com/')) {
        return decodeURIComponent(href
            .replace('https://view.officeapps.live.com/op/view.aspx?src=', '')
            .replace('&wdOrigin=BROWSELINK', ''));
    } else {
        return EBA_CLEARING_BASEURL + href;
    }
}

async function convertXlsxToJson(xlsxFilePath, jsonFilePath, network, startIndex = 0, header = ['BIC', 'name']) {
    const workbook = xlsx.readFile(xlsxFilePath);
    const jsonFile = {};

    xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header })
        .slice(startIndex)
        .forEach((bank) => {
            let { BIC } = bank;

            if (BIC.length > 8 && BIC.endsWith('XXX')) {
                BIC = BIC.substring(0, 8);
            }

            if (jsonFile[BIC]) {
                process.stdout.write(`\x1b[33mWarning 😱 :\x1b[0m Duplicate entries for BIC \x1b[36m${bank.BIC}\x1b[0m\n`);
            }
            jsonFile[BIC] = {
                name: bank.name
                    .split(' ')
                    .filter((word) => word)
                    .map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
                    .join(' '),
                country: bank.BIC.slice(4, 6),
                support: {
                    [network]: {
                        // We assume that banks at least fully support inbound SEPA RT1 instant if they are part of the list
                        inbound: 'full',
                        outbound: 'partial',
                    },
                },
            };
        });

    await writeFile(jsonFilePath, jsonFile);

    return jsonFile.length;
}

async function mergeJson() {
    const customBanks = await readFile(CUSTOM_JSON_FILE_PATH);
    const ebaRt1Banks = await readFile(EBA_RT1_JSON_FILE_PATH);
    const ecbTipsBanks = await readFile(ECB_TIPS_JSON_FILE_PATH);

    const customBanksBicList = Object.keys(customBanks);
    const ebaRt1BanksBicList = Object.keys(ebaRt1Banks);
    const ecbTipsBanksBicList = Object.keys(ecbTipsBanks);

    for (const BIC of ebaRt1BanksBicList) ebaRt1Banks[BIC].BIC = BIC;
    for (const BIC of ecbTipsBanksBicList) ecbTipsBanks[BIC].BIC = BIC;

    const bankList = mergeDeep(ebaRt1Banks, ecbTipsBanks);

    for (const BIC of customBanksBicList) {
        if (!bankList[BIC]) { // If custom bank is not in the list
            const bank = { ...customBanks[BIC], BIC };

            if (!bank.name ||
                !bank.country ||
                Object.values(BANK_NETWORK).some(network => (
                    !bank.support[network] ||
                    !bank.support[network].inbound ||
                    !bank.support[network].outbound
                ))) { // then check for data, and log if missing some
                process.stdout.write(`\x1b[33mWarning 😱 :\x1b[0m Incomplete custom info for \x1b[36m${bank.BIC}\x1b[0m ${JSON.stringify(bank)}\x1b[31m - It won't be added into the final bank list!\x1b[0m\n`);
            } else { // or add it to the list if no missing data
                bankList[BIC] = bank;
            }
        } else { // if custom bank is in the list
            bankList[BIC] = mergeDeep(bankList[BIC], customBanks[BIC]); // then merge it into the bank list
        }
    }

    const mergedJsonArray = Object.values(bankList);
    await writeFile(OUTPUT_JSON_FILE_PATH, mergedJsonArray);

    const supportedCountries = [...new Set(mergedJsonArray.map((bank) => bank.country))];
    await writeFile(OUTPUT_JSON_COUNTRIES_FILE_PATH, supportedCountries);

    return mergedJsonArray.length;
}

async function main() {
    try {
        // RT1
        process.stdout.write(`> Get download link from \x1b[34m${EBA_CLEARING_PAGE}\x1b[0m\n`);
        const bankListXlsxUrl = await getEBABankListUrl();

        // RT1
        process.stdout.write(`> Download \x1b[34m${bankListXlsxUrl}\x1b[0m\n`);
        process.stdout.write(`  > To \x1b[34m${EBA_RT1_XLSX_FILE_PATH}\x1b[0m\n`);
        await download(bankListXlsxUrl, EBA_RT1_XLSX_FILE_PATH);

        // TIPS
        process.stdout.write(`> Download \x1b[34m${ECB_TIPS_URL}\x1b[0m\n`);
        process.stdout.write(`  > To \x1b[34m${ECB_TIPS_XLSX_FILE_PATH}\x1b[0m\n`);
        await download(ECB_TIPS_URL, ECB_TIPS_XLSX_FILE_PATH);

        // RT1
        process.stdout.write(`> Convert \x1b[34m${EBA_RT1_XLSX_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`  > To \x1b[34m${EBA_RT1_JSON_FILE_PATH}\x1b[0m\n`);
        await convertXlsxToJson(EBA_RT1_XLSX_FILE_PATH, EBA_RT1_JSON_FILE_PATH, BANK_NETWORK.RT1, 2);

        // TIPS
        process.stdout.write(`> Convert \x1b[34m${ECB_TIPS_XLSX_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`  > To \x1b[34m${ECB_TIPS_JSON_FILE_PATH}\x1b[0m\n`);
        await convertXlsxToJson(ECB_TIPS_XLSX_FILE_PATH, ECB_TIPS_JSON_FILE_PATH, BANK_NETWORK.TIPS, 3);

        // RT1 & TIPS
        process.stdout.write(`> Merge:\n`);
        process.stdout.write(`  - \x1b[34m${EBA_RT1_JSON_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`  - \x1b[34m${ECB_TIPS_JSON_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`  - \x1b[34m${CUSTOM_JSON_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`  > To:\n`);
        process.stdout.write(`    - \x1b[34m${OUTPUT_JSON_FILE_PATH}\x1b[0m\n`);
        process.stdout.write(`    - \x1b[34m${OUTPUT_JSON_COUNTRIES_FILE_PATH}\x1b[0m\n`);
        const itemCount = await mergeJson();

        process.stdout.write(`\x1b[32m🥳 Done 🎉 ${itemCount} banks imported.\x1b[0m\n`);
        process.exit(0);
    } catch (e) {
        process.stderr.write(e.stack + "\n");
        process.exit(1);
    }
}

main();

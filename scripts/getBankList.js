/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs/promises');
const xlsx = require('xlsx');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const DATA_FOLDER_PATH = './src/data/banksList';

const EBA_RT1_XLSX_FILE_PATH = `${DATA_FOLDER_PATH}/generated/EBA_RT1.xlsx`;
const EBA_RT1_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/generated/EBA_RT1.json`;
const CUSTOM_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/customBanksList.json`;
const OUTPUT_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/generated/banksList.json`;
const OUTPUT_SEPA_COUNTRIES_FILE_PATH = `${DATA_FOLDER_PATH}/generated/sepaBankCountries.json`;

const EBA_CLEARING_BASEURL = 'https://www.ebaclearing.eu';
const EBA_CLEARING_PAGE = `${EBA_CLEARING_BASEURL}/services/rt1/participants/`;

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

async function getBankListUrl() {
    /** @type {string} */
    const html = await fetch(EBA_CLEARING_PAGE).then(res => res.text());

    const $ = cheerio.load(html);
    const obj = $('.text-rte:not(.clear) a');

    if (!obj || obj.length === 0) {
        throw new Error('Scraper error: BankListUrl not found, please update css selector.');
    }

    return EBA_CLEARING_BASEURL + obj[0].attribs.href;
}

async function convertXlsxToJson(xlsxFilePath, jsonFilePath) {
    // console.log("Reading xlsx file");
    const workbook = xlsx.readFile(xlsxFilePath);
    const jsonFile = {};

    // console.log("Converting to JSON");
    xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: ['BIC', 'name'] })
        .slice(2)
        .forEach((bank) => {
            // console.log("Converting", bank);
            let { BIC } = bank;

            if (BIC.length > 8 && BIC.endsWith('XXX')) {
                BIC = BIC.substring(0, 8);
            }

            if (jsonFile[BIC]) {
                process.stdout.write(`\x1b[33mWarning:\x1b[0m Duplicate entries for BIC \x1b[36m${bank.BIC}\x1b[0m\n`);
            }
            jsonFile[BIC] = {
                name: bank.name
                    .split(' ')
                    .filter((word) => word)
                    .map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
                    .join(' '),
                country: bank.BIC.substring(4, 6),
                support: {
                    sepa: {
                        // We assume that banks at least fully support inbound sepa instant if they are part of the list
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
    const ebaRt1Banks = await readFile(EBA_RT1_JSON_FILE_PATH);
    const customBanks = await readFile(CUSTOM_JSON_FILE_PATH);

    const ebaRt1BanksBicList = Object.keys(ebaRt1Banks);
    const customBanksBicList = Object.keys(customBanks);

    for (const BIC of ebaRt1BanksBicList) ebaRt1Banks[BIC].BIC = BIC;

    for (const BIC of customBanksBicList) {
        if (!ebaRt1Banks[BIC]) {
            const bank = { ...customBanks[BIC], BIC };
            if (!bank.name || !bank.country || !bank.support.sepa.inbound || !bank.support.sepa.outbound) {
                console.error('Incomplete info for', BIC, bank); // eslint-disable-line no-console
                continue;
            }
            ebaRt1Banks[BIC] = bank;
        } else {
            ebaRt1Banks[BIC].BIC = customBanks[BIC].BIC || BIC;
            ebaRt1Banks[BIC].name = customBanks[BIC].name || ebaRt1Banks[BIC].name;
            ebaRt1Banks[BIC].country = customBanks[BIC].country || ebaRt1Banks[BIC].country;

            if (customBanks[BIC].support && customBanks[BIC].support.sepa) {
                if (customBanks[BIC].support.sepa.inbound) {
                    ebaRt1Banks[BIC].support.sepa.inbound = customBanks[BIC].support.sepa.inbound;
                }
                if (customBanks[BIC].support.sepa.outbound) {
                    ebaRt1Banks[BIC].support.sepa.outbound = customBanks[BIC].support.sepa.outbound;
                }
            }

            if (!ebaRt1Banks[BIC].name) {
                process.stdout.write(`\x1b[33mWarning:\x1b[0m Missing Bank name for BIC \x1b[36m${BIC}\x1b[0m\n`);
            }
            if (!ebaRt1Banks[BIC].support.sepa.inbound) {
                process.stdout.write(
                    `\x1b[33mWarning:\x1b[0m Missing SEPA inbound support infos for BIC \x1b[36m${BIC}\x1b[0m\n`);
            }
            if (!ebaRt1Banks[BIC].support.sepa.outbound) {
                process.stdout.write(
                    `\x1b[33mWarning:\x1b[0m Missing SEPA outbound support infos for BIC \x1b[36m${BIC}\x1b[0m\n`);
            }
        }
    }

    const mergedJsonArray = Object.values(ebaRt1Banks);
    await writeFile(OUTPUT_JSON_FILE_PATH, mergedJsonArray);

    const sepaCountries = [...new Set(mergedJsonArray
        .filter((bank) => Boolean(bank.support.sepa))
        .map((bank) => bank.country))];
    await writeFile(OUTPUT_SEPA_COUNTRIES_FILE_PATH, sepaCountries);

    return mergedJsonArray.length;
}

async function main() {
    try {
        process.stdout.write(`> Get download link from ${EBA_CLEARING_PAGE}\n`);
        const bankListXlsxUrl = await getBankListUrl();

        process.stdout.write(`> Download ${bankListXlsxUrl}\n  > To ${EBA_RT1_XLSX_FILE_PATH}\n`);
        await download(bankListXlsxUrl, EBA_RT1_XLSX_FILE_PATH);

        process.stdout.write(`> Convert ${EBA_RT1_XLSX_FILE_PATH}\n  > To ${EBA_RT1_JSON_FILE_PATH}\n`);
        await convertXlsxToJson(EBA_RT1_XLSX_FILE_PATH, EBA_RT1_JSON_FILE_PATH);

        process.stdout.write(`> Merge:\n  > ${EBA_RT1_JSON_FILE_PATH}\n  > ${CUSTOM_JSON_FILE_PATH}\n`);
        process.stdout.write(`  > To:\n   > ${OUTPUT_JSON_FILE_PATH}\n`);
        const itemCount = await mergeJson();

        process.stdout.write(`> Done!\n> ${itemCount} banks imported.\n`);
        process.exit(0);
    } catch (e) {
        process.stderr.write(e.stack);
        process.exit(1);
    }
}

main();

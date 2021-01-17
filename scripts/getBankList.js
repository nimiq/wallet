/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const http = require('http');
const fs = require('fs');
const xlsx = require('xlsx');

const DATA_FOLDER_PATH = './src/data/banksList';

const EBA_RT1_XLSX_FILE_PATH = `${DATA_FOLDER_PATH}/EBA_RT1.xlsx`;
const EBA_RT1_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/EBA_RT1.json`;
const CUSTOM_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/customBanksList.json`;
const OUTPUT_JSON_FILE_PATH = `${DATA_FOLDER_PATH}/banksList.json`;

const FORCE_SCRAPER_RUN = (process.argv[2] === '--force-scaper-run');

const RECIPE_KEY = 'GsFPmxRMalZSvC6dzQvx';
const API_KEY = 'psrl7iwR894umiKSbEFQJ1wQfSOMBLbZ';
const API_URL = `https://simplescraper.io/api/${RECIPE_KEY}?apikey=${API_KEY}${FORCE_SCRAPER_RUN ? '&run_now=true' : ''}`; // eslint-disable-line max-len

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, { encoding: 'utf8' }, (err, data) => {
            if (err) return reject(err);
            return resolve(JSON.parse(data));
        });
    });
}

function writeFile(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

function download(url, filePath) {
    const proto = !url.charAt(4).localeCompare('s') ? https : http;

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        let fileInfo = null;

        const request = proto.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            fileInfo = {
                mime: response.headers['content-type'],
                size: parseInt(response.headers['content-length'], 10),
            };

            response.pipe(file);
        });

        file.on('finish', () => resolve(fileInfo));

        request.on('error', (err) => fs.unlink(filePath, () => reject(err)));
        file.on('error', (err) => fs.unlink(filePath, () => reject(err)));

        request.end();
    });
}

function getBankListUrl() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, { encoding: 'utf8' }, (response) => {
            let data = '';
            response.on('data', (d) => data += d);
            response.on('end', () => resolve(JSON.parse(data).data[0].BankList_link));
            response.on('error', reject);
        }).on('error', reject);
    });
}

async function convertXlsxToJson(xlsxFilePath, jsonFilePath) {
    const workbook = xlsx.readFile(xlsxFilePath);
    const jsonFile = xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: ['BIC', 'name'] })
        .slice(2)
        .map((bank) => ({
            BIC: bank.BIC,
            name: bank.name
                .split(' ')
                .filter((word) => word)
                .map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
                .join(' '),
            country: bank.BIC.slice(4, 6),
            support: {
                sepa: {
                    // TEMP?: can we assume that banks at least fully support inbound sepa instant
                    // if they are part of the list?
                    inbound: 'full-support',
                    outbound: 'partial-support',
                },
            },
        }));

    await writeFile(jsonFilePath, jsonFile);

    return jsonFile.length;
}

async function mergeJson() {
    const ebaRt1BankList = await readFile(EBA_RT1_JSON_FILE_PATH);
    const customBankList = await readFile(CUSTOM_JSON_FILE_PATH);
    const mergedJson = {};

    for (const bank of ebaRt1BankList) mergedJson[bank.BIC] = bank;
    for (const bank of customBankList) {
        if (!mergedJson[bank.BIC]) mergedJson[bank.BIC] = bank;
        else {
            mergedJson[bank.BIC].name = bank.name || mergedJson[bank.BIC].name;
            mergedJson[bank.BIC].country = bank.country || mergedJson[bank.BIC].country;

            mergedJson[bank.BIC].support.sepa.inbound = bank.support?.sepa?.inbound
                || mergedJson[bank.BIC].support.sepa.inbound;
            mergedJson[bank.BIC].support.sepa.outbound = bank.support?.sepa?.outbound
                || mergedJson[bank.BIC].support.sepa.outbound;
        }
    }

    const mergedJsonArray = Object.values(mergedJson);
    await writeFile(OUTPUT_JSON_FILE_PATH, mergedJsonArray);

    return mergedJsonArray.length;
}

async function main() {
    try {
        process.stdout.write(`> Get download link from ${API_URL}\n`);
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

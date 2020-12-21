/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');
const http = require('http');
const fs = require('fs');
const xlsx = require('xlsx');

const XLSX_FILE_PATH = './src/data/banksList/bankslist.xlsx';
const JSON_FILE_PATH = './src/data/banksList/bankslist.json';

const FORCE_SCRAPER_RUN = (process.argv[2] === '--force-scaper-run');

const RECIPE_KEY = 'GsFPmxRMalZSvC6dzQvx';
const API_KEY = 'psrl7iwR894umiKSbEFQJ1wQfSOMBLbZ';
// eslint-disable-next-line max-len
const API_URL = `https://simplescraper.io/api/${RECIPE_KEY}?apikey=${API_KEY}${FORCE_SCRAPER_RUN ? '&run_now=true' : ''}`;

function getBankListUrl() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (response) => {
            response.setEncoding('utf8');

            let data = '';
            response.on('data', (d) => data += d);
            response.on('end', () => resolve(JSON.parse(data).data[0].BankList_link));
            response.on('error', reject);
        }).on('error', reject);
    });
}

async function download(url, filePath) {
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

function convertXlsxToJson(xlsxFilePath, jsonFilePath) {
    return new Promise((resolve, reject) => {
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
                        inbound: 'sepa-instant-partial-full',
                        outbound: 'sepa-instant-partial-support',
                    },
                },
            }));

        fs.writeFile(jsonFilePath, JSON.stringify(jsonFile), (err) => {
            if (err) reject(err);
            resolve(jsonFile.length);
        });
    });
}

async function main() {
    try {
        process.stdout.write(`> Get download link from ${API_URL}\n`);
        const bankListXlsxUrl = await getBankListUrl();

        process.stdout.write(`> Download ${bankListXlsxUrl}\n  > To ${XLSX_FILE_PATH}\n`);
        await download(bankListXlsxUrl, XLSX_FILE_PATH);

        process.stdout.write(`> Convert ${XLSX_FILE_PATH}\n  > To ${JSON_FILE_PATH}\n`);
        const itemCount = await convertXlsxToJson(XLSX_FILE_PATH, JSON_FILE_PATH);

        process.stdout.write(`> Done!\n> ${itemCount} banks imported.\n`);
        process.exit(0);
    } catch (e) {
        process.stderr.write(e.stack);
        process.exit(1);
    }
}

main();

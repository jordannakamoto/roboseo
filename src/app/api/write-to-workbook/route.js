import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Highlight hex color
const HIGHLIGHT_COLOR = { red: 1.0, green: 0.949, blue: 0.8 }; // R 255 G 242 B 204 fff2cc

async function getSheetValues(client, sheetId, sheetName) {
    const range = `${sheetName}!A:A`;
    const response = await client.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rowCount = response.data.values ? response.data.values.length : 0;
    const values = Array(rowCount).fill(null);

    response.data.values.forEach((row, index) => {
        values[index] = row[0];  // Assuming single column (A)
    });

    return values;
}

async function updateSheet(client, sheetId, requests) {
    if (requests.length > 0) {
        await client.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests,
            },
        });
    }
}

async function addRowsToSheet(client, sheetId, sheetName, additionalRows) {
    try {
        const requests = [
            {
                appendDimension: {
                    sheetId: await getSheetId(client, sheetId, sheetName),
                    dimension: 'ROWS',
                    length: additionalRows
                }
            }
        ];

        await client.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests
            }
        });
    } catch (error) {
        console.error(`Error adding rows to sheet: ${error.message}`);
        throw error;
    }
}

async function getSheetId(client, sheetId, sheetName) {
    const sheetMetadata = await client.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties'
    });
    const sheet = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
}

export async function POST(request) {
    const data = await request.json();

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens);
    const sheets = google.sheets({ version: 'v4', auth: client });

    const findAndProcessSheet = async (keyword, processRow) => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,hidden))'
        });

        const visibleSheets = sheetMetadata.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);

        const sheetName = visibleSheets.find(title => title.includes(keyword));
        if (!sheetName) {
            return { error: `No visible sheet with "${keyword}" in its name found.`, status: 404 };
        }

        const columnAValues = await getSheetValues(sheets, data.sheetId, sheetName);
        const requests = [];

        for (let page of data.webpages) {
            const rowIndex = columnAValues.findIndex(value => value === page.name);
            if (rowIndex !== -1) {
                await processRow(page, rowIndex, requests, sheetName);
            }
        }

        await updateSheet(sheets, data.sheetId, requests);
        return { updatedCells: requests.length };
    };

    const addRequiredRowsIfNeeded = async (sheetName, requiredRows) => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,gridProperties))'
        });

        const sheetInfo = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
        const currentRowCount = sheetInfo.properties.gridProperties.rowCount;

        if (requiredRows > currentRowCount) {
            const rowsToAdd = requiredRows - currentRowCount;
            await addRowsToSheet(sheets, data.sheetId, sheetName, rowsToAdd);
        }
    };

    const processOnPageSheet = async () => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,hidden))'
        });

        const visibleSheets = sheetMetadata.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);

        const sheetName = visibleSheets.find(title => title.includes("On-Page"));
        if (!sheetName) {
            return { error: `No visible sheet with "On-Page" in its name found.`, status: 404 };
        }

        const rowsPerEntry = 7;
        const requiredRows = 6 + (rowsPerEntry * data.webpages.length);

        await addRequiredRowsIfNeeded(sheetName, requiredRows);

        const requests = [];
        let rowIndex = 5;

        for (let page of data.webpages) {
            const webpageText = `Web Page: ${page.url}`;
            const targetedKeywords = `Targeted Keyword(s): ${page.keywords.join('\n')}`;

            const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: webpageText } }] }], fields: 'userEnteredValue' } },
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: targetedKeywords } }] }], fields: 'userEnteredValue' } }
            );

            rowIndex += rowsPerEntry;
        }

        await updateSheet(sheets, data.sheetId, requests);
        return { updatedCells: requests.length };
    };

    const processAltTagsSheet = async () => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,hidden))'
        });

        const visibleSheets = sheetMetadata.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);

        const sheetName = visibleSheets.find(title => title.includes("Alt Tag"));
        if (!sheetName) {
            return { error: `No visible sheet with "Alt Tag" in its name found.`, status: 404 };
        }

        const requests = [];

        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        for (let [index, item] of data.altTags.entries()) {
            const baseIndex = index + 4;
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.page } }] }], fields: 'userEnteredValue' } },
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.url } }] }], fields: 'userEnteredValue' } },
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.originalAlt } }] }], fields: 'userEnteredValue' } },
                // ! HIGHLIGHT COLOR??
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.newAlt }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
            );
        }

        await updateSheet(sheets, data.sheetId, requests);
        return { updatedCells: requests.length };
    };

    const processResults = [];

    processResults.push(await findAndProcessSheet("Title Tag", async (page, rowIndex, requests, sheetName) => {
        const baseIndex = rowIndex + 1;
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);
        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.url } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.keywords.join('\n') } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } }] }], fields: 'userEnteredValue' } }
        );
        if (page.titleNew) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.titleNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
            );
        } else {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } }] }], fields: 'userEnteredValue' } }
            );
        }
    }));

    processResults.push(await findAndProcessSheet("Meta", async (page, rowIndex, requests, sheetName) => {
        const baseIndex = rowIndex + 1;
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);
        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta } }] }], fields: 'userEnteredValue' } }
        );
        if (page.metaNew) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.metaNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
            );
        } else {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta } }] }], fields: 'userEnteredValue' } }
            );
        }
    }));

    processResults.push(await findAndProcessSheet("H1/H2", async (page, rowIndex, requests, sheetName) => {
        const baseIndex = rowIndex + 1;
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);
        if (data.hMode === "h1") {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1 } }] }], fields: 'userEnteredValue' } }
            );
            if (page.h1New) {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1New }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
                );
            } else {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1 } }] }], fields: 'userEnteredValue' } }
                );
            }
        } else if (data.hMode === "h2") {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2 } }] }], fields: 'userEnteredValue' } }
            );
            if (page.h2New) {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2New }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
                );
            } else {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2 } }] }], fields: 'userEnteredValue' } }
                );
            }
        }
    }));

    processResults.push(await processOnPageSheet());
    processResults.push(await processAltTagsSheet());

    const firstError = processResults.find(result => result.error);
    if (firstError) {
        return NextResponse.json({ error: firstError.error }, { status: firstError.status });
    }

    const totalUpdatedCells = processResults.reduce((acc, { updatedCells }) => acc + updatedCells, 0);
    return NextResponse.json({ success: true, updatedCells: totalUpdatedCells }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

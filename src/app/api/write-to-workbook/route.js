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
    const sheetIdNum = await getSheetId(client, sheetId, sheetName);
    const requests = [
        {
            appendDimension: {
                sheetId: sheetIdNum,
                dimension: 'ROWS',
                length: additionalRows,
            },
        },
    ];

    await client.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
            requests,
        },
    });

    return { startRowIndex: additionalRows - 1, endRowIndex: additionalRows + additionalRows - 1 };
}

async function getSheetId(client, sheetId, sheetName) {
    const sheetMetadata = await client.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties',
    });
    const sheet = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
}

async function findPageNameRow(values) {
    return values.findIndex(value => value && value.includes("PAGE NAME"));
}

async function ensureSufficientRows(sheets, sheetId, sheetName, startRow, requiredRows) {
    try {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            fields: 'sheets(properties(gridProperties(rowCount),title))', // Ensure we're getting the grid properties
        });

        const sheetInfo = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
        
        if (!sheetInfo) {
            throw new Error(`Sheet with name ${sheetName} not found.`);
        }

        if (!sheetInfo.properties || !sheetInfo.properties.gridProperties) {
            throw new Error(`Sheet properties or gridProperties are missing for sheet: ${sheetName}`);
        }

        const currentRowCount = sheetInfo.properties.gridProperties.rowCount;
        const additionalRows = requiredRows - (currentRowCount - startRow - 1);

        console.log(`Current row count: ${currentRowCount}, Start row: ${startRow}, Required rows: ${requiredRows}, Additional rows: ${additionalRows}`);

        if (additionalRows > 0) {
            return await addRowsToSheet(sheets, sheetId, sheetName, additionalRows);
        }
        return null;
    } catch (error) {
        console.error(`Error in ensureSufficientRows: ${error.message}`);
        throw error;
    }
}


async function processTitleTagSheet(sheets, data) {
    const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: data.sheetId,
        fields: 'sheets(properties(title,hidden))',
    });

    const visibleSheets = sheetMetadata.data.sheets
        .filter(sheet => !sheet.properties.hidden)
        .map(sheet => sheet.properties.title);

    const sheetName = visibleSheets.find(title => title.includes("Title"));
    if (!sheetName) {
        return { error: `No visible sheet with "Title" in its name found.`, status: 404 };
    }

    const values = await getSheetValues(sheets, data.sheetId, sheetName);
    const pageNameRow = await findPageNameRow(values);

    if (pageNameRow === -1) {
        return { error: `"PAGE NAME" not found in the Title sheet.`, status: 404 };
    }

    const rowsNeeded = data.webpages.length;
    await ensureSufficientRows(sheets, data.sheetId, sheetName, pageNameRow, rowsNeeded);

    const requests = [];

    let rowIndex = pageNameRow + 1;
    for (let page of data.webpages) {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.name } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.url } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.keywords.join('\n') } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } }] }], fields: 'userEnteredValue' } },
        );
        if (page.titleNew) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.titleNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
            );
        } else {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } }] }], fields: 'userEnteredValue' } },
            );
        }

        rowIndex++;
    }

    await updateSheet(sheets, data.sheetId, requests);

    return { sheetName, sheetId: await getSheetId(sheets, data.sheetId, sheetName), startRowIndex: pageNameRow + 1, endRowIndex: rowIndex };
}

async function processH1MetaSheets(sheets, data, titleSheetInfo) {
    const processResults = [];

    const processSheet = async (keyword, processRow) => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,hidden))',
        });

        const visibleSheets = sheetMetadata.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);

        const sheetName = visibleSheets.find(title => title.includes(keyword));
        if (!sheetName) {
            return { error: `No visible sheet with "${keyword}" in its name found.`, status: 404 };
        }

        const values = await getSheetValues(sheets, data.sheetId, sheetName);
        const pageNameRow = await findPageNameRow(values);

        if (pageNameRow === -1) {
            return { error: `"PAGE NAME" not found in the ${keyword} sheet.`, status: 404 };
        }

        const rowsNeeded = titleSheetInfo.endRowIndex - titleSheetInfo.startRowIndex;
        const newRowRange = await ensureSufficientRows(sheets, data.sheetId, sheetName, pageNameRow, rowsNeeded);

        const requests = [];
        let rowIndex = pageNameRow + 1;

        // Insert formulas for A, B, C columns
        if (newRowRange) {
            for (let i = newRowRange.startRowIndex; i <= newRowRange.endRowIndex; i++) {
                requests.push(
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!A${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!B${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!C${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                );
                rowIndex++;
            }
        }

        // Apply original data for meta, h1, h2
        await processRow(pageNameRow + 1, requests, sheetName);
        await updateSheet(sheets, data.sheetId, requests);
        processResults.push({ sheetName, startRowIndex: pageNameRow + 1, endRowIndex: rowIndex });
    };

    await processSheet("Meta", async (rowIndex, requests, sheetName) => {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        for (let page of data.webpages) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta } }] }], fields: 'userEnteredValue' } },
            );

            if (page.metaNew) {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.metaNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                );
            } else {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta } }] }], fields: 'userEnteredValue' } },
                );
            }
            rowIndex++;
        }
    });

    await processSheet("H1/H2", async (rowIndex, requests, sheetName) => {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        for (let page of data.webpages) {
            if (data.hMode === "h1") {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1 } }] }], fields: 'userEnteredValue' } },
                );

                if (page.h1New) {
                    requests.push(
                        { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1New }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                    );
                } else {
                    requests.push(
                        { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h1 } }] }], fields: 'userEnteredValue' } },
                    );
                }
            } else if (data.hMode === "h2") {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2 } }] }], fields: 'userEnteredValue' } },
                );

                if (page.h2New) {
                    requests.push(
                        { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2New }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                    );
                } else {
                    requests.push(
                        { updateCells: { range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.h2 } }] }], fields: 'userEnteredValue' } },
                    );
                }
            }
            rowIndex++;
        }
    });

    return processResults;
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

    const titleSheetInfo = await processTitleTagSheet(sheets, data);

    if (titleSheetInfo.error) {
        return NextResponse.json({ error: titleSheetInfo.error }, { status: titleSheetInfo.status });
    }

    const h1MetaResults = await processH1MetaSheets(sheets, data, titleSheetInfo);

    const totalUpdatedCells = h1MetaResults.reduce((acc, { updatedCells }) => acc + updatedCells, 0);
    return NextResponse.json({ success: true, updatedCells: totalUpdatedCells }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

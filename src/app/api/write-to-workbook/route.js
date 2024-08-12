import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

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

async function updateSheetValues(client, sheetId, updates) {
    if (updates.length > 0) {
        await client.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: updates,
            },
        });
    }
}

// Utility used during On-Page pasting
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
        const batchUpdateData = [];

        data.webpages.forEach(page => {
            const rowIndex = columnAValues.findIndex(value => value === page.name);
            if (rowIndex !== -1) {
                processRow(page, rowIndex, batchUpdateData, sheetName);
            }
        });

        await updateSheetValues(sheets, data.sheetId, batchUpdateData);
        return { updatedCells: batchUpdateData.length };
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

        // Calculate the number of rows needed
        const rowsPerEntry = 7; // As we have 7 rows per entry
        const requiredRows = 6 + (rowsPerEntry * data.webpages.length); // Starting at row 6

        // Ensure there are enough rows
        await addRequiredRowsIfNeeded(sheetName, requiredRows);

        const batchUpdateData = [];
        let rowIndex = 5; // Starting index based on the image provided, adjust as needed.

        data.webpages.forEach((page) => {
            const webpageText = `Web Page: ${page.url}`;

            const targetedKeywords = `Targeted Keyword(s): ${page.keywords.join('\n')}`; //! changing comma separator to newline

            batchUpdateData.push(
                { range: `${sheetName}!A${rowIndex}`, values: [[webpageText]] },
                { range: `${sheetName}!A${rowIndex + 1}`, values: [[targetedKeywords]] },
                // { range: `${sheetName}!A${rowIndex + 3}`, values: [['Original Copy:']] },
                // { range: `${sheetName}!A${rowIndex + 6}`, values: [['Proposed Copy:']] }
            );

            rowIndex += rowsPerEntry; // Move to the next set of rows for the next page.
        });

        await updateSheetValues(sheets, data.sheetId, batchUpdateData);
        return { updatedCells: batchUpdateData.length };
    };

    // Process Alt Tag Sheet
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

        const batchUpdateData = [];

        data.altTags.forEach((item, index) => {
            const baseIndex = index + 4; // hardcoded starting point
            batchUpdateData.push(
                { range: `${sheetName}!A${baseIndex}`, values: [[item.page]] },
                { range: `${sheetName}!B${baseIndex}`, values: [[item.url]] },
                { range: `${sheetName}!C${baseIndex}`, values: [[item.originalAlt]] },
                { range: `${sheetName}!D${baseIndex}`, values: [[item.newAlt]] }
            );
        });

        await updateSheetValues(sheets, data.sheetId, batchUpdateData);
        return { updatedCells: batchUpdateData.length };
    };

    // Collection of all actions to be sent to API
    const processResults = [];

    // 1. Title Fields
    processResults.push(await findAndProcessSheet("Title Tag", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 1;
        updates.push(
            { range: `${sheetName}!B${baseIndex}`, values: [[page.url]] },
            { range: `${sheetName}!C${baseIndex}`, values: [[page.keywords.join('\n')]] },
            { range: `${sheetName}!D${baseIndex}`, values: [[page.title]] },
            { range: `${sheetName}!F${baseIndex}`, values: [[page.title]] }
        );
    }));

    // 2. Meta desc
    processResults.push(await findAndProcessSheet("Meta", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 1;
        updates.push(
            { range: `${sheetName}!D${baseIndex}`, values: [[page.meta]] },
            { range: `${sheetName}!F${baseIndex}`, values: [[page.meta]] }
        );
    }));

    // 3. H1/H2
    processResults.push(await findAndProcessSheet("H1/H2", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 1; // Adjusted index for H1/H2 sheet specifics
        if (data.hMode === "h1") {
            updates.push(
                { range: `${sheetName}!D${baseIndex}`, values: [[page.h1]] },
                { range: `${sheetName}!F${baseIndex}`, values: [[page.h1]] }
            );
        } else if (data.hMode === "h2") {
            updates.push(
                { range: `${sheetName}!D${baseIndex}`, values: [[page.h2]] },
                { range: `${sheetName}!F${baseIndex}`, values: [[page.h2]] }
            );
        }
    }));

    // 4. On-Page
    processResults.push(await processOnPageSheet());

    // 5. Alt Images
    processResults.push(await processAltTagsSheet());

    // Final: Push
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

import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

async function getSheetValues(client, sheetId, sheetName) {
    const range = `${sheetName}!A:A`;
    const response = await client.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: range,
    });
    return response.data.valueRanges[0].values.flat();
}

async function updateSheetValues(client, sheetId, sheetName, updates) {
    if (updates.length > 0) {
        await client.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: updates,
            }   ,
        });
    }
}

export async function POST(request) {
    const data = await request.json();

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens)
    const sheets = google.sheets({ version: 'v4', auth: client });

    const findAndProcessSheet = async (keyword, processRow) => {
        const sheetName = data.sheetTitles.find(title => title.includes(keyword));
        if (!sheetName) {
            return { error: `No sheet with "${keyword}" in its name found.`, status: 404 };
        }
        
        const columnAValues = await getSheetValues(sheets, data.sheetId, sheetName);
        const batchUpdateData = [];

        data.webpages.forEach(page => {
            const rowIndex = columnAValues.findIndex(value => value === page.name);
            if (rowIndex !== -1) {
                processRow(page, rowIndex, batchUpdateData, sheetName);
            }
        });

        await updateSheetValues(sheets, data.sheetId, sheetName, batchUpdateData);
        return { updatedCells: batchUpdateData.length };
    };

    const processResults = [];
    processResults.push(await findAndProcessSheet("Title Tag", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 2;
        updates.push(
            { range: `${sheetName}!C${baseIndex}`, values: [[page.keywords.join('\n')]] },
            { range: `${sheetName}!D${baseIndex}`, values: [[page.title]] },
            { range: `${sheetName}!F${baseIndex}`, values: [[page.title]] }
        );
    }));

    // Repeat for "Meta" and "H1/H2" sheets with appropriate adjustments
    processResults.push(await findAndProcessSheet("Meta", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 2;
        updates.push(
            { range: `${sheetName}!D${baseIndex}`, values: [[page.meta]] },
            { range: `${sheetName}!F${baseIndex}`, values: [[page.meta]] }
        );
    }));

    processResults.push(await findAndProcessSheet("H1/H2", (page, rowIndex, updates, sheetName) => {
        const baseIndex = rowIndex + 3; // Adjusted index for H1/H2 sheet specifics
        if(data.hMode == "h1"){
            updates.push(
                { range: `${sheetName}!D${baseIndex}`, values: [[page.h1]] },
                { range: `${sheetName}!F${baseIndex}`, values: [[page.h1]] }
            );
        }
        else if(data.hMode == "h2"){
            updates.push(
                { range: `${sheetName}!D${baseIndex}`, values: [[page.h2]] },
                { range: `${sheetName}!F${baseIndex}`, values: [[page.h2]] }
            );
        }
    }));

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
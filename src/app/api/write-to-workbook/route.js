import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export async function POST(request) {
    const data = await request.json();
  
    const client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'http://localhost:3000',
    );

    // reading test
    client.setCredentials(data.tokens)
    const sheets = google.sheets({ version: 'v4', auth: client});

    let sheetTitles = data.sheetTitles;

    // Find the sheet with "Title Tag" in its name
    const titleTagSheetName = sheetTitles.find(title => title.includes("Title Tag"));
    
    if (!titleTagSheetName) {
        return NextResponse.json({ error: 'No sheet with "Title Tag" in its name found.' }, { status: 404 });
    }
    // console.log(titleTagSheetName);

    // Prepare batchGet to read column A values from the found sheet
    let range = `${titleTagSheetName}!A:A`; // Adjust the range if needed
    let readResponse = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: data.sheetId,
        ranges: range,
    });

    let columnAValues = readResponse.data.valueRanges[0].values.flat();

    // Prepare batchUpdate request body
    let batchUpdateData = [];

    data.webpages.forEach(page => {
        const rowIndex = columnAValues.findIndex(value => value === page.name);
        if (rowIndex !== -1) {
            // +1 due to Google Sheets indexing, +1 to skip header if present
            const cell = `D${rowIndex + 2}`; 
            batchUpdateData.push({
                range: `${titleTagSheetName}!${cell}`,
                values: [[page.title]],
            });
        }
    });

    // Execute batchUpdate if there's any data to update
    if (batchUpdateData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: data.sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: batchUpdateData,
            },
        });
    }

    const metaSheetName = sheetTitles.find(title => title.includes("Meta"));

    if (!metaSheetName) {
        return NextResponse.json({ error: 'No sheet with "Meta" in its name found.' }, { status: 404 });
    }

    // Prepare batchGet to read column A values from the found sheet
    range = `${metaSheetName}!A:A`; // Adjust the range if needed
    readResponse = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: data.sheetId,
        ranges: range,
    });

    columnAValues = readResponse.data.valueRanges[0].values.flat();

    // Prepare batchUpdate request body
    batchUpdateData = [];

    data.webpages.forEach(page => {
        const rowIndex = columnAValues.findIndex(value => value === page.name);
        if (rowIndex !== -1) {
            // +1 due to Google Sheets indexing, +1 to skip header if present
            const cell = `D${rowIndex + 2}`; 
            batchUpdateData.push({
                range: `${metaSheetName}!${cell}`,
                values: [[page.meta]],
            });
        }
    });

    // Execute batchUpdate if there's any data to update
    if (batchUpdateData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: data.sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: batchUpdateData,
            },
        });
    }

    const h1SheetName = sheetTitles.find(title => title.includes("H1/H2"));

    if (!h1SheetName) {
        return NextResponse.json({ error: 'No sheet with "h1" in its name found.' }, { status: 404 });
    }
    
    // Prepare batchGet to read column A values from the found sheet
    range = `${h1SheetName}!A:A`; // Adjust the range if needed
    readResponse = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: data.sheetId,
        ranges: range,
    });

    columnAValues = readResponse.data.valueRanges[0].values.flat();

    // Prepare batchUpdate request body
    batchUpdateData = [];

    data.webpages.forEach(page => {
        const rowIndex = columnAValues.findIndex(value => value === page.name);
        if (rowIndex !== -1) {
            console.log(rowIndex)
            // +1 due to Google Sheets indexing, +1 to skip header if present
            const cell = `D${rowIndex + 3}`; 
            batchUpdateData.push({
                range: `${h1SheetName}!${cell}`,
                values: [[page.h1]],
            });
        }
    });

    // Execute batchUpdate if there's any data to update
    if (batchUpdateData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: data.sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: batchUpdateData,
            },
        });
    }

    return NextResponse.json({ success: true, updatedCells: batchUpdateData.length }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}
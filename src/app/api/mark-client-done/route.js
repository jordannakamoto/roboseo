import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Open Master Sheet URL

// Highlight hex color
const HIGHLIGHT_COLOR = { red: 1.0, green: 0.949, blue: 0.8 }; // R 255 G 242 B 204 fff2cc
const RESET_COLOR = { red: 1.0, green: 1.0, blue: 1.0 }; // White

// get column G workbookURLS
async function getSheetValues(client, sheetId, sheetName) {
    const range = `${sheetName}!G:G`;  // Change the range to column G
    const response = await client.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    return response.data.values || [];  // Return values from column G
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

async function getSheetId(client, sheetId, sheetName) {
    const sheetMetadata = await client.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties',
    });
    const sheet = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
}

export async function POST(request) {
    const data = await request.json();

    console.log("marking client done on master sheet");
    console.log(data);

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens);
    const sheets = google.sheets({ version: 'v4', auth: client });

    const fillColor = data.currentClient.completed ? HIGHLIGHT_COLOR : RESET_COLOR;

    try {
        // Get the values from column G
        const values = await getSheetValues(sheets, data.sheetId, data.sheetName);

        // Find the index of the row where the workbookURL matches
        const rowIndex = values.findIndex(row => row[0] === data.currentClient.workbookURL);

        if (rowIndex === -1) {
            return NextResponse.json({ error: "No matching URL found." }, { status: 404 });
        }

        const sheetId = await getSheetId(sheets, data.sheetId, data.sheetName);

        // Highlight the found row
        const requests = [
            {
                updateCells: {
                    range: {
                        sheetId,
                        startRowIndex: rowIndex,
                        endRowIndex: rowIndex + 1,  // Only one row
                        startColumnIndex: 0,
                        endColumnIndex: 12,  // Highlight across columns A-M (0-6, index is 0-based)
                    },
                    rows: [
                        {
                            values: new Array(12).fill({ userEnteredFormat: { backgroundColor: fillColor } })
                        }
                    ],
                    fields: 'userEnteredFormat.backgroundColor',
                },
            },
        ];

        await updateSheet(sheets, data.sheetId, requests);

        return NextResponse.json({ success: true, highlightedRow: rowIndex + 1 }, { status: 200 });
    } catch (error) {
        console.error('Failed to highlight the row:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

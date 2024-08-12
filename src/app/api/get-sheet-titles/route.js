// Get Sheet Titles
// - Gets working set of open sheets
// - Differentiates between (Refresh) and original updates by visibility

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

    // Set the credentials with the provided tokens
    client.setCredentials(data.tokens);

    // Initialize the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: client });

    try {
        // Fetch the spreadsheet metadata, which includes information about all sheets
        const response = await sheets.spreadsheets.get({
            spreadsheetId: data.spreadsheetId,
        });

        // console.log(response.data.sheets)
        // Filter out hidden sheets and extract the titles of visible sheets
        const visibleSheetTitles = response.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);
        // Return the visible sheet titles in the response
        return NextResponse.json({ visibleSheetTitles }, { status: 200 });
    } catch (error) {
        console.error('Failed to get sheet titles:', error);
        // Return an error response if something goes wrong
        return NextResponse.json({ error: 'Failed to get sheet titles' }, { status: 500 });
    }
}

// The GET function remains unchanged
export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

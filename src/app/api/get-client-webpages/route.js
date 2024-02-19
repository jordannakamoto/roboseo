import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export async function POST(request) {
    const data = await request.json();
    console.log(data);

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens);
    const sheets = google.sheets({ version: 'v4', auth: client });

    try {
        // Directly use the provided sheetName in the range
        const gridDataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: data.spreadsheetId,
            range: `'${data.sheetName}'!A1:Z`, // Use sheetName from the request
        });

        const rows = gridDataResponse.data.values;
        let rowIndex = 0;
        let headerRow;
        let pageIndex;
        let urlIndex;

        console.log(rows.length)
        while (rowIndex < rows.length) { // && (pageIndex === undefined || urlIndex === undefined)
            const row = rows[rowIndex].map(header => header.toLowerCase());
            console.log(row);
            pageIndex = row.indexOf('page name');
            urlIndex = row.indexOf('url');
            if (pageIndex !== -1) {
                headerRow = row;
                break;
            }
            rowIndex++;
        }
        // ERROR CHECK
        if (!headerRow) {
            throw new Error('Required columns not found');
        }
        if (pageIndex === -1 || urlIndex === -1) {
            console.log(pageIndex)
            console.log(urlIndex)
            throw new Error('Required columns not found');
        }

        const webpages = rows.slice(rowIndex + 1).map(row => ({
            webpageTitle: row[pageIndex] || '',
            webpageUrl: row[urlIndex] || '',
        }));

        return NextResponse.json({ webpages }, { status: 200 });
    } catch (error) {
        console.error('Failed to process sheet:', error);
        // Respond with an error message
        return NextResponse.json({ error: 'Failed to process sheet' }, { status: 500 });
    }
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

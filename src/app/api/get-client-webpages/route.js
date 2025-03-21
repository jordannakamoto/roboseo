// ------------------------------------------------------------------------
// -- GET CLIENT WEBPAGES
// ------------------------------------------------------------------------

// Gets client webpages from Title Sheet
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Edited,
export async function POST(request) {
    const data = await request.json();

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens);
    const sheets = google.sheets({ version: 'v4', auth: client });

    try {
// moved first scan to get-client-toggle-visibility

// > Second scan: Gathering unique URLs from column B
// .. Assumes that all Keyword Strategy and Research pages have urls listed in column B

        const gridDataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: data.spreadsheetId,
            range: `'${data.sheetName}'!B1:B`, // Use sheetName from request to select only column B
        });

        const rows = gridDataResponse.data.values;
        const uniqueValues = [];
        const seen = new Set();
        let headerRow;
        let linkIndex;

        // * first we're collecting rows
        let rowIndex = 0;
        while (rowIndex < rows.length) { 
            const row = rows[rowIndex].map(header => header.toLowerCase());
            linkIndex = row.indexOf('target page'); // Assuming URLs are in column B

            if (linkIndex !== -1) {
                headerRow = row;
                break;
            }
            rowIndex++;
        }
        
        // Collect page names starting from the row after the header row
        for (let i = rowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            let linkValue = row[linkIndex];

            // Remove trailing '#' if it exists
            // .. added for valley ridge
            if (linkValue.endsWith('#')) {
                linkValue = linkValue.slice(0, -1);
            }

            // Break the loop if the value doesn't start with 'http' or 'https'
            if (!(linkValue.startsWith('https') || linkValue.startsWith('http'))) {
                break;
            }

            // Only add the value if it hasn't been seen before
            if (!seen.has(linkValue)) {
                seen.add(linkValue);
                uniqueValues.push(linkValue);
            }
        }
        // _ Now uniqueValues contains our ordered list of webpage URLs

        const webpages = uniqueValues.map((url, index) => ({
            // name: pageNames[index],
            url: url,
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

// Gets client webpages from Title Sheet
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

        // Determine the index of the header row
        while (rowIndex < rows.length) {
            const row = rows[rowIndex].map(header => header.toLowerCase());
            pageIndex = row.indexOf('keywords');     // get column of keyword
            urlIndex = row.indexOf('target page');  // get column of url ('target page')
            if (pageIndex !== -1) { // break if we found the expected header
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
            // console.log(pageIndex); console.log(urlIndex);
            throw new Error('Required columns not found');
        }

        let keywords_groups = rows.slice(rowIndex + 1).reduce((acc, row) => {
            const keywords = row[pageIndex] || '';
            const url = row[urlIndex] || '';

            // set multiple keywords to array keyed by url
            if (acc[url]) {
                acc[url].push(keywords);
            } else {
                acc[url] = [keywords];
            }
            return acc;
        }, {});

        
        data.pages.forEach(page => {
            const matchingUrl = Object.keys(keywords_groups).find(url => url === page.url);
            if (matchingUrl) {
                page.keywords = keywords_groups[matchingUrl];
            } else {
                page.keywords = []; // or any default value if no matching webpage is found
            }
        });

        const webpagesWithKeywords = data.pages;

        return NextResponse.json( {webpagesWithKeywords} , { status: 200 });
    } catch (error) {
        console.error('Failed to process sheet:', error);
        // Respond with an error message
        return NextResponse.json({ error: 'Failed to process sheet' }, { status: 500 });
    }
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

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
        // Get metadata of all sheets
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.spreadsheetId,
            fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.properties.hidden'
        });

        const allSheets = sheetMetadata.data.sheets;

        // Sheets to be always shown
        const sheetsToAlwaysShow = ['welcome to seo'];

        // Base names for sheets
        const sheetBaseNames = ['keyword', 'on-page', 'title', 'meta', 'h1', 'alt'];

        // Build the requests to hide/show sheets
        const requests = allSheets.map(sheet => {
            const sheetTitle = sheet.properties.title.toLowerCase();
            let shouldHide = true;

            // Always show the welcome sheet
            if (sheetsToAlwaysShow.includes(sheetTitle)) {
                shouldHide = false;
            } else {
                // Check if the sheet is a base name or a refresh name
                const isBaseNameMatch = sheetBaseNames.some(baseName => sheetTitle.startsWith(baseName));
                const isRefreshMatch = sheetBaseNames.some(baseName => 
                    sheetTitle.startsWith(baseName) && sheetTitle.includes("refresh")
                );

                if (data.currentClient.isRefresh.toLowerCase().includes("refresh")) {
                    // If in refresh mode, show both base and refresh versions
                    if (isBaseNameMatch && isRefreshMatch) {
                        shouldHide = false;
                    }
                } else {
                    // Otherwise, only show base versions
                    if (isBaseNameMatch && !isRefreshMatch) {
                        shouldHide = false;
                    }
                }
            }

            return {
                updateSheetProperties: {
                    properties: {
                        sheetId: sheet.properties.sheetId,
                        hidden: shouldHide
                    },
                    fields: 'hidden'
                }
            };
        });

        // Execute the batch update to hide/show sheets
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: data.spreadsheetId,
            requestBody: {
                requests: requests
            }
        });

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

        // > Third scan: Gathering page names matching the URLs
        // ..
        // const gridDataResponse2 = await sheets.spreadsheets.values.get({
        //     spreadsheetId: data.spreadsheetId,
        //     range: `'${data.titleSheet}'!A1:Z`, // Adjust the range to include all columns for header identification
        // });

        // const rows2 = gridDataResponse2.data.values;
        // rowIndex = 0;
        // let pageIndex;
        // let urlIndex;

        // // Locate the 'page name' header row and set column indices
        // while (rowIndex < rows2.length) {
        //     const row2 = rows2[rowIndex].map(header => header.toLowerCase());
        //     pageIndex = row2.indexOf('page name');
        //     urlIndex = row2.indexOf('url');

        //     if (pageIndex !== -1 && urlIndex !== -1) {
        //         headerRow = row2;
        //         break;
        //     }
        //     rowIndex++;
        // }

        // // ERROR CHECK
        // if (!headerRow) {
        //     throw new Error('Required columns not found');
        // }
        // if (pageIndex === -1 || urlIndex === -1) {
        //     throw new Error('Required columns not found');
        // }

        // // Collect page names starting from the row after the header row
        // const pageNames = [];
        // for (let i = rowIndex + 1; i < rows2.length; i++) {
        //     const row = rows2[i];
        //     pageNames.push(row[pageIndex] || ''); // Assuming page names are in the identified column
        // }

        // // Combine the page names and URLs into the `webpages` array
        // if (uniqueValues.length !== pageNames.length) {
        //     console.log("URLS:");
        //     console.log(uniqueValues);
        //     console.log("PAGE NAMES:");
        //     console.log(pageNames);
        //     throw new Error('Mismatch between the number of URLs and page names.');
        // }

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

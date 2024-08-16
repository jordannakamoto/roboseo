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

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Failed to toggle sheet visibility:', error);
        // Respond with an error message
        return NextResponse.json({ error: 'Failed to toggle sheet visibility' }, { status: 500 });
    }
}

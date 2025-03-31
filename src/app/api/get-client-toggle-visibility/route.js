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
        // Determine the action: "initialize" or "toggle"
        const action = data.action || "initialize";

        // Flip the isRefresh value if the action is "toggle"
        if (action === "toggle") {
            const currentIsRefresh = data.currentClient.isRefresh?.toLowerCase();
            if (currentIsRefresh === "refresh") {
                data.currentClient.isRefresh = "initial";
            } else if (currentIsRefresh === "initial") {
                data.currentClient.isRefresh = "refresh";
            } else {
                // Handle unexpected values by defaulting to "initial"
                console.warn(`Unexpected isRefresh value: ${data.currentClient.isRefresh}. Defaulting to "initial".`);
                data.currentClient.isRefresh = "initial";
            }
            // console.log(`Toggled isRefresh to: ${data.currentClient.isRefresh}`);
        } else {
            // console.log(`Initializing with isRefresh: ${data.currentClient.isRefresh}`);
        }

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

        // Debug: Log all sheet titles
        // console.log('All sheets:', allSheets.map(sheet => sheet.properties.title));

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

                // Apply visibility logic based on the current isRefresh value
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

            // Debug: Log visibility decision for each sheet
            console.log(`Sheet: ${sheet.properties.title}, Should Hide: ${shouldHide}`);

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
        const batchUpdateResponse = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: data.spreadsheetId,
            requestBody: {
                requests: requests
            }
        });

        // Debug: Log the batch update response
        console.log('Batch update response:', batchUpdateResponse.data);

        return NextResponse.json({ success: true, isRefresh: data.currentClient.isRefresh }, { status: 200 });
    } catch (error) {
        console.error('Failed to toggle sheet visibility:', error);
        // Respond with an error message
        return NextResponse.json({ error: 'Failed to toggle sheet visibility' }, { status: 500 });
    }
}

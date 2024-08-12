// api/get-all-client-urls
/**--------------------------------------------
 *             GET ALL CLIENT URLS                
 *---------------------------------------------**/
// .. Gets all client urls for screaming frog to process
// .. Writes homepages to file for frog scraper to work with

// ----------------------------------------------------------------

import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
const fs = require('fs');

export async function POST(request) {
    const data = await request.json();

    // > Connect to Google Sheets

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );
    client.setCredentials(data.tokens)
    let responseList = [];
    let failedClients = [];
    let noWorkbookUrlClients = 0;
    let noWorkbookUrlClientNames = [];
    let failedClientNames = [];
    
    try {
        for (const cli of data.clients) {
            try {
                if (!cli.workbookSheetId) {
                    noWorkbookUrlClients++;
                    noWorkbookUrlClientNames.push(cli.name); // Assuming cli has a name property
                    continue;
                }
                const sheets = google.sheets({ version: 'v4', auth: client });
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: cli.workbookSheetId,
                    range: `'Keyword Research & Strategy'!B7`,
                });
                cli.homepage = response.data.values[0][0];
                responseList.push(cli);
            } catch (error) {
                failedClients.push({ client: cli, error: error.message });
                failedClientNames.push(cli.name); // Assuming cli has a name property
            }
        }

        // #tag : debug
        // console.log(responseList);
        const outputList = responseList.map(client => client.homepage);

        // Define the filename
        const filename = 'scripts/homepageList.txt';

        // Convert the array to a string if necessary (e.g., JSON or simple newline-separated)
        const fileContent = outputList.join('\n');  // Join each element with a newline for plain text file

        // Write the content to a file
        fs.writeFile(filename, fileContent, (err) => {
            if (err) {
                console.error('Failed to write to file:', err);
            } else {
                console.log(`Saved output to ${filename}`);
            }
        });

        // Alerting the statistics
        const totalClients = data.clients.length;
        const failedForOtherReasons = failedClients.length;

        console.log(`Total clients expected: ${totalClients}`);
        console.log(`Number of clients with no workbook URL: ${noWorkbookUrlClients}`);
        console.log(`Clients with no workbook URL: ${noWorkbookUrlClientNames.join(', ')}`);
        console.log(`Number of clients failed for other reasons: ${failedForOtherReasons}`);
        console.log(`Clients failed for other reasons: ${failedClientNames.join(', ')}`);

        // File done writing, provide the client data back to the main application
        return NextResponse.json({ 
            responseList, 
            failedClients, 
            noWorkbookUrlClients, 
            noWorkbookUrlClientNames, 
            totalClients, 
            failedForOtherReasons, 
            failedClientNames
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to upload file:", error);
        // Respond with an error message
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}

// api/get-all-client-urls
/**--------------------------------------------
 *             GET ALL CLIENT URLS                
 *---------------------------------------------**/
// Gets all client urls for screaming frog to process

import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

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
    try {
        for (const url of data.clientUrls) {
            console.log(url);
            const sheets = google.sheets({ version: 'v4', auth: client});
            const response = await sheets.spreadsheets.values.get({
            spreadsheetId: url,
            range: `'Keyword Research & Strategy'!B7`,
            });
            responseList.push(response);
        };
        return NextResponse.json({ responseList }, { status: 200 });
    } catch (error) {
        console.error("Failed to upload file:", error);
        // Respond with an error message
        return NextResponse.json(
        { error: "Failed to upload file"} ,
        { status: 500 }
        );
    }
}
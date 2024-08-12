// Connects to google sheets

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

    // reading test
    client.setCredentials(data.tokens)
    const sheets = google.sheets({ version: 'v4', auth: client});
    const response = await sheets.spreadsheets.values.get({
    spreadsheetId: data.spreadsheetId,
    range: data.range,
    });
    // console.log(response)

    return NextResponse.json({ response }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}
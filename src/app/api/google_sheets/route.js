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
    console.log(response)

    // // writing test
    // const write = await sheets.spreadsheets.values.update({
    //     spreadsheetId: data.spreadsheetId,
    //     range: 'A29', // Specify the target cell
    //     valueInputOption: 'RAW', // Treat the input as plain text
    //     resource: {
    //         values: [['programmer: jnax']] // The value you want to write
    //     }
    // })

    // console.log(write)

    return NextResponse.json({ response }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}
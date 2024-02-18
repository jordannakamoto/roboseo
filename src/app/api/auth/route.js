import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';

export async function POST(request) {
    const data = await request.json();
  
    const client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'http://localhost:3000',
    );

    const { tokens } = await client.getToken(data.code);
    return NextResponse.json({ tokens }, { status: 200 });
}
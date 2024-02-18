import { NextResponse } from "next/server";
import path from 'path'

export async function POST(request) {
  
    // Example:
    const scriptPath = path.join(process.cwd(), 'scripts', 'test.js');

    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                resolve(NextResponse.json({ error: error.message }, { status: 200 }));
            } else {
                const result = `${stdout}`;
                resolve(NextResponse.json({ result }, { status: 200 }));
            }
        });
    });
}

import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST(request) {
  try {
    const data = await request.json();

    // Path to the project root
    const projectRoot = path.resolve(process.cwd());
    const scriptsPath = path.join(projectRoot, 'scripts');

    // Command to open a new terminal window and run the script
    const command = `osascript -e 'tell application "Terminal" to do script "cd ${scriptsPath} && node crawltest.js"'`;

    // Execute the command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to execute command:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (stderr) {
        console.error('Command error:', stderr);
        return NextResponse.json({ error: stderr }, { status: 500 });
      }

      console.log('Command output:', stdout);
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

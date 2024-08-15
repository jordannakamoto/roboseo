import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST(request) {
  try {
    // Define the file path
    const filePath = path.join(process.cwd(), "scripts", "homepageList.txt");

    // Command to open the file in TextEdit
    const command = `open -a TextEdit "${filePath}"`;

    // Execute the command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening file in TextEdit: ${error}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log("File opened in TextEdit successfully.");
      return NextResponse.json({ success: true }, { status: 200 });
    });
  } catch (error) {
    console.error("Failed to open TextEdit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

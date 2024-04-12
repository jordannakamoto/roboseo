// Load Scraped Data into Program
import { NextResponse } from "next/server";
import fs from 'fs';
import { parse } from 'csv-parse/sync'; // A more robust CSV parsing
import path from 'path';

export async function POST(request) {
    try {
        const data = await request.json();
        const dir = data.dir;
        console.log("reading data from screaming frog: " + dir)
        const directoryPath = path.join(process.cwd(), 'public', 'frog');
        
        // Define file paths
        const altImagesPath1 = path.join(directoryPath, dir, 'images_missing_alt_text.csv');
        
        // Helper function to read and parse a CSV file
        const readAndParseCSV = (filePath) => {
            const data = fs.readFileSync(filePath, 'utf8');
            return parse(data, {
                columns: true,
                skip_empty_lines: true,
                bom: true
            });
        };

        // Read and parse the CSV files
        const imagesData = readAndParseCSV(altImagesPath1);

        let result = imagesData
        .filter(item => !item.Address.includes('recaptcha') && !item.Address.includes('loader') && !item.Address.includes('mapfiles/transparent.png'))
        .map(item => item.Address);


        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        console.error('Failed to process files:', error);
        return NextResponse.json( { message: "ERROR" } , { status: 500 });
    }
}

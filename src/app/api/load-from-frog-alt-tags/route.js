// Load Alt Tag File into program

import { NextResponse } from "next/server";
import fs from 'fs';
import { parse } from 'csv-parse/sync'; // A more robust CSV parsing
import path from 'path';

export async function POST(request) {
    try {
        const data = await request.json();
        const dir = data.dir;
        // const validUrlsSet = new Set(data.webpages.map(webpage => webpage.url));
        console.log("reading alt tag data from screaming frog: " + dir)
        const directoryPath = path.join(process.cwd(), 'public', 'frog');
        
        // Define file paths
        const altTagsFilePath = path.join(directoryPath, dir, 'all_image_inlinks.csv');
        
        // Helper function to read and parse a CSV file
        const readAndParseCSV = (filePath) => {
            const data = fs.readFileSync(filePath, 'utf8');
            return parse(data, {
                columns: true,
                skip_empty_lines: true,
                bom: true
            });when
        };

        // Read and parse the CSV file
        const altTagsData = readAndParseCSV(altTagsFilePath);

        // Filter out entries with an image URL that contains "recaptcha"
        // Filtered out Alt Tag rows
        let filteredData = altTagsData.filter(item => !item.Destination.includes('recaptcha'));
        filteredData = filteredData.filter(item => !item.Destination.includes('loading'));
        filteredData = filteredData.filter(item => !item.Destination.includes('loader'));
        filteredData = filteredData.filter(item => !item.Destination.includes('arrow'));
        filteredData = filteredData.filter(item => !item.Destination.includes('icon'));
        filteredData = filteredData.filter(item => !item.Destination.includes('spinner'));
        filteredData = filteredData.filter(item => !item.Destination.includes('logo'));
        filteredData = filteredData.filter(item => !item.Destination.includes('.cur'));
        filteredData = filteredData.filter(item => !item.Destination.includes('.gif'));
        filteredData = filteredData.filter(item => !item.Destination.includes('transparent'));
        filteredData = filteredData.filter(item => !item['Alt Text'].includes('Logo'));




        // Function to exclude specific properties from an object
        const excludeProperties = (obj, propsToRemove) => {
            const newObj = {};
            Object.keys(obj).forEach(key => {
                if (!propsToRemove.includes(key)) {
                    newObj[key] = obj[key];
                }
            });
            return newObj;
        };

        // Specify columns to remove
        const columnsToRemove = [
            "Type", "Size (Bytes)", "Anchor", "Status Code", "Status", 
            "Follow", "Target", "Rel", "Path Type", "Link Position", 
            "Link Path", "Link Origin", "Real Dimensions", 
            "Dimensions in Attributes", "Potential Savings (bytes)"
        ];

        // Remove specified fields from each entry
        const result = filteredData.map(obj => excludeProperties(obj, columnsToRemove));
        // console.log(result);

        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        console.error('Failed to process files:', error);
        return NextResponse.json( { message: "ERROR" } , { status: 500 });
    }
}

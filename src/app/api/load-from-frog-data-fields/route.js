// Load Scraped Data into Program

import { NextResponse } from "next/server";
import fs from 'fs';
import { parse } from 'csv-parse/sync'; // A more robust CSV parsing
import path from 'path';

export async function POST(request) {
    try {
        const data = await request.json();
        const dir = data.dir;
        const validUrlsSet = new Set(data.webpages.map(webpage => webpage.url));
        console.log("reading data from screaming frog: " + dir)
        const directoryPath = path.join(process.cwd(), 'public', 'frog');
        
        // Define file paths
        const titlesFilePath = path.join(directoryPath, dir, 'page_titles_all.csv');
        const h1FilePath = path.join(directoryPath, dir, 'h1_all.csv');
        const h2FilePath = path.join(directoryPath, dir, 'h2_all.csv');
        const metaDescriptionFilePath = path.join(directoryPath, dir, 'meta_description_all.csv');
        // ! const 
        
        // Helper function to read and parse a CSV file
        const readAndParseCSV = (filePath) => {
            const data = fs.readFileSync(filePath, 'utf8');
            return parse(data, {
                columns: true,
                skip_empty_lines: true,
                bom: true
            });when
        };

        // Read and parse the CSV files
        const titlesData = readAndParseCSV(titlesFilePath);
        const h1Data = readAndParseCSV(h1FilePath);
        const h2Data = readAndParseCSV(h2FilePath);
        const metaDescriptionData = readAndParseCSV(metaDescriptionFilePath);

        // Convert h1 and meta description data into maps for faster lookup
        const h1Map = new Map(h1Data.map(item => [item.Address, item['H1-1']]));
        const h2Map = new Map(h2Data.map(item => [item.Address, item['H2-1']]));
        const metaDescriptionMap = new Map(metaDescriptionData.map(item => [item.Address, item['Meta Description 1']]));

        // Filter titlesData to include only items with URLs in validUrlsSet
        // SCREAMING FROG
        // Uses Address column to label Scraped Data URL
        const filteredTitlesData = titlesData.filter(item => validUrlsSet.has(item.Address));

        // console.log(h1Map);
        // Merge all data into a single result object for filtered URLs
        let result = filteredTitlesData.map(item => ({
            url: item.Address, // Rename 'Address' to 'url'
            title: item['Title 1'], // Rename 'Title 1' to 'title'
            h1: h1Map.get(item.Address) || '',
            h2: h2Map.get(item.Address) || '',
            meta: metaDescriptionMap.get(item.Address) || ''
        }));

        // Function to exclude specific properties from an object
        function excludeProperties(obj, propsToRemove) {
            const newObj = {};
            Object.keys(obj).forEach(key => {
            if (!propsToRemove.includes(key)) {
                newObj[key] = obj[key];
            }
            });
            return newObj;
        }
        
        // Removing specified fields
        result = result.map(obj => excludeProperties(obj, ["Indexability", "Indexability Status", "Occurrences", "Title 1 Length", "Title 1 Pixel Width"]));

        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        console.error('Failed to process files:', error);
        return NextResponse.json( { message: "ERROR" } , { status: 500 });
    }
}

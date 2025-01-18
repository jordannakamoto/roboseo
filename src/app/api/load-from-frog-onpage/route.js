// Load OnPage data into program

import { NextResponse } from "next/server";
import { execSync } from 'child_process'; // To run the Python script
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const data = await request.json();
        const pages = data.pages;
        const dir = path.join('public', 'frog', data.dir, 'page_source'); // Ensure dir is correctly set to the path within the public folder

        // Step 1: Extract URLs and H1 from pages and create a list of processed pages
        const processedPages = pages.map(page => ({
            url: page.url,
            h1: page.h1,
            h2: page.h2,
        }));

        // Step 2: Transform URLs into filenames
        const filenames = processedPages.map(page => {
            const formattedUrl = page.url.replace(/https?:\/\//, 'https_').replace(/[\/#]/g, '_');
            return `rendered_${formattedUrl}.html`;
        });

        // Step 3: Supply filenames as arguments to convert.js
        const scriptPath = path.join('scripts', 'convert.js'); // Path to convert.py
        console.log("script path:", scriptPath);
        const command = `node ${scriptPath} ${dir} ${filenames.join(' ')}`; // Pass the directory and filenames as arguments
        console.log("command:", command);
        execSync(command); // This will generate .md files from the HTML files
        // ? What is the output here

        // Step 4: For all .md files, open and scan for processedPages.h1
        processedPages.forEach((page) => {
            const formattedUrl = page.url.replace(/https?:\/\//, 'https_').replace(/[\/#]/g, '_');
            const mdFilePath = path.join(dir, `rendered_${formattedUrl}.md`);
            
            if (fs.existsSync(mdFilePath)) {
                const mdContent = fs.readFileSync(mdFilePath, 'utf-8');

                // Use a regex to find the H1 and extract the content following it, excluding any content starting with '##'
                const h1Regex = new RegExp(`#\\s*${page.h1}\\s*\\n([^#\\[]+?)(?=\\n##|\\[|$)`);
                let match = h1Regex.exec(mdContent);
                let extractedContent = match ? match[1].trim() : '';

                // If the extracted content is empty, whitespace, or mistakenly includes an H2, try using H2
                if (!extractedContent && page.h2) {
                    const h2Regex = new RegExp(`#\\s*${page.h2}\\s*\\n([^#\\[]+?)(?=\\n##|\\[|$)`);
                    match = h2Regex.exec(mdContent);
                    extractedContent = match ? match[1].trim() : '';
                }

                // Split the content into paragraphs and filter them
                if (extractedContent) {
                    const paragraphs = extractedContent.split('\n\n').filter(paragraph => {
                        // Trim each paragraph before checking for '!' or '*' or certain words
                        const trimmedParagraph = paragraph.trim();
                        return !trimmedParagraph.startsWith('!') && 
                               !trimmedParagraph.startsWith('*') && 
                               !trimmedParagraph.toLowerCase().includes('map') && 
                               !trimmedParagraph.toLowerCase().includes('tour') && 
                               !trimmedParagraph.toLowerCase().includes('more');
                    });

                    // Join the remaining paragraphs back together
                    extractedContent = paragraphs.join('\n\n').trim();
                }

                // If valid content exists, assign it to onpage; otherwise, skip adding onpage
                if (extractedContent) {
                    page.onpage = extractedContent;
                } else {
                    console.warn(`No valid content found for H1 or H2 in file: ${mdFilePath}`);
                }
            } else {
                console.warn(`Markdown file not found: ${mdFilePath}`);
            }
        });

        console.log("extracted onpage");
        console.log(processedPages);

        // Step 5: Return the processed pages with the onpage data appended
        return NextResponse.json({ processedPages }, { status: 200 });

    } catch (error) {
        console.error('Failed to process files:', error);
        return NextResponse.json({ message: "ERROR" }, { status: 500 });
    }
}
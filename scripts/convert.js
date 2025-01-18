// return this as a javascript object

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function extractHeadersAndText(directory, filename) {
    // Generate the full path to the HTML file
    const htmlFilePath = path.join(directory, filename);
    console.log("Processing:", htmlFilePath);

    // Check if the file exists
    if (!fs.existsSync(htmlFilePath)) {
        console.log(`File ${htmlFilePath} does not exist.`);
        return;
    }

    // Read the HTML content
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

    // Parse the HTML content using JSDOM
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Split the HTML content into lines to track line numbers
    const lines = htmlContent.split('\n');

    // Helper to find the line number of an element
    const getLineNumber = (element) => {
        const html = element.outerHTML;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(html.substring(0, Math.min(100, html.length)))) {
                return i + 1; // Line numbers are 1-based
            }
        }
        return -1; // Not found
    };

    // Extract all substantial content in the document
    const contentResults = [];
    document.querySelectorAll('*').forEach(element => {
        const textContent = element.textContent.trim();
        if (textContent.length > 50) { // Adjust length threshold as needed
            contentResults.push({
                text: textContent,
                lineNumber: getLineNumber(element)
            });
        }
    });

    // Sort the content by line number
    contentResults.sort((a, b) => a.lineNumber - b.lineNumber);

    // Extract headers (h1, h2, h3)
    const headerResults = [];
    ['h1', 'h2', 'h3'].forEach(tag => {
        const headers = document.querySelectorAll(tag);
        headers.forEach(header => {
            headerResults.push({
                headerTag: tag,
                headerText: header.textContent.trim(),
                headerLineNumber: getLineNumber(header)
            });
        });
    });

    // Print the results
    headerResults.forEach(({ headerTag, headerText, headerLineNumber }) => {
        console.log(`${headerTag.toUpperCase()} (Line ${headerLineNumber}): ${headerText}`);

        // Find the closest content by line number
        const closestContent = contentResults.reduce((closest, content) => {
            const diff = Math.abs(content.lineNumber - headerLineNumber);
            const closestDiff = Math.abs((closest?.lineNumber || Infinity) - headerLineNumber);
            return diff < closestDiff ? content : closest;
        }, null);

        if (closestContent) {
            console.log(`Closest Content (Line ${closestContent.lineNumber}): ${closestContent.text}`);
        } else {
            console.log("No substantial content found.");
        }

        console.log();
    });

    return { headerResults, contentResults };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node convert.js <directory_path> <html_file1> <html_file2> ...");
        process.exit(1);
    }

    const directory = args[0];
    const htmlFiles = args.slice(1);

    htmlFiles.forEach(htmlFile => {
        if (htmlFile.endsWith('.html')) {
            extractHeadersAndText(directory, htmlFile);
        } else {
            console.log(`Skipping ${htmlFile} (not an HTML file)`);
        }
    });
}

if (require.main === module) {
    main();
}
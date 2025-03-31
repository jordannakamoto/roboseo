const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function extractHeadersAndText(directory, filename) {
    const htmlFilePath = path.join(directory, filename);

    if (!fs.existsSync(htmlFilePath)) {
        return { error: `File ${htmlFilePath} does not exist.` };
    }

    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const lines = htmlContent.split('\n');

    const getLineNumber = (element) => {
        const html = element.outerHTML;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(html.substring(0, Math.min(100, html.length)))) {
                return i + 1;
            }
        }
        return -1;
    };

    const headerResults = [];
    const headerTexts = new Set();
    ['h1', 'h2', 'h3'].forEach(tag => {
        const headers = document.querySelectorAll(tag);
        headers.forEach(header => {
            const text = header.textContent.trim();
            if (text.length > 0) {
                headerResults.push({
                    headerTag: tag,
                    headerText: text,
                    headerLineNumber: getLineNumber(header),
                });
                headerTexts.add(text);
            }
        });
    });

    if (/contact/i.test(filename)) {
        return { headerResults: [], contentResults: [] };
      }

    const contentResults = [];
    document.querySelectorAll('*').forEach(element => {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) return;

        const textContent = element.textContent.trim();

        
        if (
            textContent.length > 50 &&
            textContent.length <= 3000 && // filter out large blocks
            
            !headerTexts.has(textContent) // remove repeated headers
        ) {
            contentResults.push({
                text: textContent,
                lineNumber: getLineNumber(element),
            });
        }
    });

    return { headerResults, contentResults };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(JSON.stringify({ error: "Usage: node convert.js <directory_path> <html_file1> <html_file2> ..." }));
        process.exit(1);
    }

    const directory = args[0];
    const htmlFiles = args.slice(1);

    const results = htmlFiles.map(htmlFile => {
        if (htmlFile.endsWith('.html')) {
            return { file: htmlFile, ...extractHeadersAndText(directory, htmlFile) };
        }
        return { file: htmlFile, error: "Not an HTML file" };
    });

    console.log(JSON.stringify(results)); // Output results as JSON
}

if (require.main === module) {
    main();
}
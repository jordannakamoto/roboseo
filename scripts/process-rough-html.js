// Removes HTML tags and extraneous newlines

const fs = require('fs');
const csvParser = require('csv-parser');
const { JSDOM } = require('jsdom');

const csvFilePath = '../public/frog/custom_extraction_all.csv'; // Update this path
const outputFilePath = '../public/frog/extracted_text.txt'; // Path for the output file

// Create a writable stream for the output file
const outputFileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

fs.createReadStream(csvFilePath)
  .pipe(csvParser())
  .on('data', (row) => {
    // Adjust the index based on your CSV structure
    const htmlContent = row[Object.keys(row)[3]]; // Ensure this is the correct index for your HTML content
    const dom = new JSDOM(htmlContent);
    let plainText = dom.window.document.body.textContent || '';

    // Trim the plain text to remove leading and trailing whitespace
    plainText = plainText.trim();

    // Normalize newline characters and compress sequences of newlines into a single newline
    // This handles \r\n (Windows), \n (Linux, Unix, macOS), and \r (old macOS)
    plainText = plainText.replace(/\r\n?|\n/g, '\n'); // Normalize all newlines to \n first
    plainText = plainText.replace(/\n+/g, '\n'); // Then compress sequences of \n to a single \n

    // Write the compressed plain text to the output file, followed by a newline character
    outputFileStream.write(plainText + '\n');


  })
  .on('end', () => {
    console.log('CSV file successfully processed.');
    outputFileStream.end(); // Close the stream
  });

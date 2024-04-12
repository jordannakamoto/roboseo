const { exec } = require("child_process");
const fs = require("fs");

// List of URLs to crawl
// ----------------------------------------------------------------//
const urls = [
  "https://ink.scottscollection.com/",
  "https://livesonya.com/",
  "https://rigbydc.com/",
  // Add more URLs as needed
];

// Output Location
const outputLocation =
  "/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/";

// ----------------------------------------------------------------//

// Function to execute the Screaming Frog command
function runCrawl(url) {
  // Removing http://, https://, www, and anything after .com
  // TODO Add this to Utils functions
  const outputFolderName = url.replace(/https?:\/\/(www\.)?/, "").split(".com")[0];

  // Construct the output folder path
  const outputPath = outputLocation + outputFolderName;
  
  // Check if the directory exists
  if (fs.existsSync(outputPath)) {
    console.log(`Directory exists for ${url}, skipping crawl.`);
    return Promise.resolve(); // Skip the crawl
  }

  // Directory does not exist, so create it
  fs.mkdirSync(outputPath, { recursive: true });
  
  // Construct the Screaming Frog command FOR MAC OS
  const command = `"/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher" --crawl ${url} --config "${outputLocation}config.seospiderconfig" \
  --headless \
  --export-tabs "Custom Extraction:All,Internal:PDF,H2:All,H1:All,Meta Description:All,Page Titles:All,URL:All,Internal:HTML" \
  --bulk-export "Web:Screenshots,Images:All Image Inlinks" \
  --save-crawl \
  --output-folder "${outputPath}" \
  --overwrite`;
  
  // Execute the command
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      console.log(`Crawl completed for ${url}`);
      resolve();
    });
  });
}

// Function to execute crawls sequentially
async function runCrawlsSequentially() {
  for (const url of urls) {
    await runCrawl(url);
  }
  console.log("All crawls completed.");
}

// Start the crawling process
runCrawlsSequentially();


/*

screamingfrogseospider --config "/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/config.seospiderconfig" --headless \
--export-tabs "Custom Extraction:All,Internal:PDF,H2:All,H1:All,Meta Description:All,Page Titles:All,URL:All,Internal:HTML" \
--bulk-export "Web:Screenshots,Images:All Image Inlinks" \
--save-crawl --output-folder "/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/" --overwrite


SEED:
crawl config:
/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/config.seospiderconfig

Export Tabs:
Custom Extraction:All
Internal:PDF
H2:All
H1:All
Meta Description:All
Page Titles:All
URL:All
Internal:HTML

Bulk Exports:
Web:Screenshots
Images:All Image Inlinks

*/
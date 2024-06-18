const { exec } = require("child_process");
const fs = require("fs");

// > Output Location
const outputLocation = "/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/";

// > List of URLs to crawl
// ----------------------------------------------------------------//

// Read URLs from file and start crawl process
fs.readFile("homepageList.txt", 'utf8', (err, data) => {
  if (err) {
    console.error('Failed to read file:', err);
    return;
  }

  // Split the content by new lines to create an array of URLs
  let urls = data.split('\n').filter(line => line.trim() !== '');

  // Function to execute crawls sequentially
  async function runCrawlsSequentially() {
    for (const url of urls) {
      console.log(`Crawling ${url}...`);
      await runCrawl(url);
    }
    console.log("All crawls completed.");
  }

  // Start the crawling process
  runCrawlsSequentially();
});

function runCrawl(url) {
  // Transformations and command construction remain the same
  const outputFolderName = url.replace(/^https?:\/\//, '');
  const outputPath = outputLocation + outputFolderName;
  
  if (fs.existsSync(outputPath)) {
    console.log(`Directory exists for ${url}, skipping crawl.`);
    return Promise.resolve();
  }

  fs.mkdirSync(outputPath, { recursive: true });

  const command = `"/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher" --crawl ${url} --config "${outputLocation}config.seospiderconfig" \
  --headless \
  --export-tabs "H2:All,H1:All,Meta Description:All,Page Titles:All,URL:All" \
  --bulk-export "Web:Screenshots,Images:All Image Inlinks" \
  --save-crawl \
  --output-folder "${outputPath}" \
  --overwrite`;

  // Custom Extraction:All,Internal:PDF
  // OnPage Strategy Future... Internal:HTML

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
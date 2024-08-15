const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// > Output Location
const outputLocation = "/Users/jordannakamoto/Desktop/Bryceproject/appv0/roboseo/public/frog/";
// "/Users/brycesnyder/Documents/RedwoodSEO/roboseo/public/frog/";

// ... Bryce and Jordan Computer Locations

// > List of URLs to crawl
// ----------------------------------------------------------------//

fs.readFile("homepageList.txt", 'utf8', (err, data) => {
  if (err) {
    console.error('Failed to read file:', err);
    return;
  }

  // Split the content by new lines to create an array of URLs
  let urls = data.split('\n').filter(line => line.trim() !== '');

  // Scan for directories that already exist
  const toCrawl = [];
  let skipped = 0;

  urls.forEach(url => {
    const outputFolderName = url.replace(/^https?:\/\//, '');
    const outputPath = path.join(outputLocation, outputFolderName);

    if (fs.existsSync(outputPath)) {
      console.log(`Directory exists for ${url}, skipping crawl.`);
      skipped++;
    } else {
      toCrawl.push(url);
    }
  });

  console.log(`${skipped}/${urls.length} URLs will be skipped. ${toCrawl.length} remaining.`);

  let crawled = 0;
  let totalTime = 0;

  // Function to execute crawls sequentially
  async function runCrawlsSequentially() {
    for (const url of toCrawl) {
      console.log(`Crawling ${url}...`);
      const startTime = Date.now();
      await runCrawl(url);
      const endTime = Date.now();
      const crawlTime = (endTime - startTime) / 1000; // Time in seconds
      totalTime += crawlTime;
      crawled++;

      // Calculate average time and estimate remaining time
      const avgTimePerCrawl = totalTime / crawled;
      const remainingCrawls = toCrawl.length - crawled;
      const estimatedRemainingTime = avgTimePerCrawl * remainingCrawls;

      const avgMins = Math.floor(avgTimePerCrawl / 60);
      const avgSecs = Math.floor(avgTimePerCrawl % 60);
      const estMins = Math.floor(estimatedRemainingTime / 60);
      const estSecs = Math.floor(estimatedRemainingTime % 60);

      console.log(`Completed ${crawled}/${toCrawl.length} crawls. Avg time: ${avgMins}m ${avgSecs}s. Estimated time left: ${estMins}m ${estSecs}s.`);
    }
    console.log("All crawls completed.");
  }

  // Start the crawling process
  runCrawlsSequentially();
});

function runCrawl(url) {
  const outputFolderName = url.replace(/^https?:\/\//, '');
  const outputPath = path.join(outputLocation, outputFolderName);

  fs.mkdirSync(outputPath, { recursive: true });

  const command = `"/Applications/Screaming\ Frog\ SEO\ Spider.app/Contents/MacOS/ScreamingFrogSEOSpiderLauncher" --crawl ${url} --config "${outputLocation}config.seospiderconfig" \
  --headless \
  --export-tabs "H2:All,H1:All,Meta Description:All,Page Titles:All,URL:All" \
  --bulk-export "Web:Screenshots,Images:All Image Inlinks" \
  --save-crawl \
  --output-folder "${outputPath}" \
  --overwrite`;

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
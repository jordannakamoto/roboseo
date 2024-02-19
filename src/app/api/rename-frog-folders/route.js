import fs from 'fs';
import path from 'path';

export async function POST(request) {
  
    try {
      // Process the folder and files
      const directoryPath = path.join(process.cwd(), 'public', 'frog');
      const directories = fs.readdirSync(directoryPath);

      // Example: renaming directories based on the contents of a CSV file
      directories.forEach((dir) => {
        const csvFilePath = path.join(directoryPath, dir, 'url_all.csv');
        if (fs.existsSync(csvFilePath)) {
            // Read the CSV file synchronously
            const csvContent = fs.readFileSync(csvFilePath, 'utf8');
            const lines = csvContent.split('\n');
            // Ensure there is a second line
            if (lines.length >= 2) {
            const urlLine = lines[1]; // Get the second line
            const fields = urlLine.split(','); // Split by comma
            // Extract the URL, it's in the first field of the second line (after quotes are removed)
            const url = fields[0].replace(/"/g, ''); // Remove double quotes

            // Use the extracted URL to derive the new directory name
            // Here, you'd need to define how you transform the URL into a directory name
            // For demonstration, let's say we use a simple transformation:
            const newName = url.match(/https?:\/\/www\.([^\.]+)/)?.[1];

            // Check if the newName directory already exists to avoid overwriting
            const newDirPath = path.join(directoryPath, newName);
            if (!fs.existsSync(newDirPath)) {
                fs.renameSync(path.join(directoryPath, dir), newDirPath);
            } else {
                console.log(`Directory for ${newName} already exists.`);
            }
            }
        }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process files' });
    }
}

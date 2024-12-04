# SEO Content Refresher
Designed for a friend to speed up webscraping and data entry for SEO content writing. Client websites are batch scraped and target meta data is displayed in a front end interface.

## Data Flow
![FlowChart](./-DevLog/flow-diagram.png)

## Features

### On Page copy
On-Page copy can exist in many different forms so the best guess is extracted and presented next to a screenshot of the page. Screenshots can be clicked to visit the page if the estimated on-page copy needs to be replaced.

### Metadata
Page metadata: Title, H1, and Meta Description are displayed in a UI that allows for re-writing with target keywords. Target keywords are highlighted after they have been detected and a character counter is displayed so that we can hit the right content length for each particular field. Initial metadata display can be toggled as fields are meant to be overwritten with new keywords.

### Image Alt-Tags
Image alt urls can be selected in groups to edit. Same image source urls are displayed as one unit which an alt caption can be supplied for. Tool allows for filling, finding and replacing, text from selected images to allow for easy integration of target keywords.

### Google Sheets Output
Google sheets document is automatically formatted into the expected output as we receive our worksheets in various states from the assignment dispatcher. This includes showing/hiding the correct sub sheets and editing titles and rows into the proper structure.

Then, we fill the target sheet with our proposed SEO recommendations and apply a highlight to indicate changes. Automating what was previously a manual data entry task.

## Future Goals
We hope to use the co-creation of this tool to build a future comprehensive tool for seasonal SEO Updates.

## Screenshot
Screenshots look a bit horrendous to maintain client anonymity.

<img src="./-DevLog/scraper.png" alt="Scraper" width="50%"/>

![Screenshot](./-DevLog/onpagescreen.png)
![AltImg](./-DevLog/altimages2.png)
![Sheets](./-DevLog/sheets.png)

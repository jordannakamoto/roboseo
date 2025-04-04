// write to workbook
//----------------------------------------------------------------------//
// TODO
// ? Do we need to add some white cell highlighting to unchanged fields ?
// --------------------------------------------------------------------//

import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

// Highlight hex color
const HIGHLIGHT_COLOR = { red: 1.0, green: 0.949, blue: 0.8 }; // R 255 G 242 B 204 fff2cc
const WHITE_COLOR = {red: 1.0, green: 1.0, blue: 1.0}

// Gets Column A
async function getSheetValues(client, sheetId, sheetName) {
    const range = `${sheetName}!A:A`;
    const response = await client.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });    

    const rowCount = response.data.values ? response.data.values.length : 0;
    const values = Array(rowCount).fill(null);

    response.data.values.forEach((row, index) => {
        values[index] = row[0];  // Assuming single column (A)
    });
    
    return values;
}

// Gets Row 1 - searches for "Recommendations" to find header
async function getSheetHeaderValues(client, sheetId, sheetName, currClientName) {
    const range = `${sheetName}!1:1`;  // Getting only the first row
    const response = await client.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    if (response.data.values && response.data.values.length > 0) {
        const headerRow = response.data.values[0]; // The first row

        // Look for the cell with the value 'Recommendations'
        const recommendationIndex = headerRow.findIndex(cell => cell.includes('Recommendations'));

        if (recommendationIndex !== -1) {
            const foundValue = headerRow[recommendationIndex];

            // Check if the found value contains the currentClientName
            if (foundValue.includes(currClientName)) {
                return { found: true, index: -2, value: foundValue };
            }
            // Return the cell index if 'Recommendations' is found
            return { found: true, index: recommendationIndex, value: foundValue };
        } else {
            // Return null if 'Recommendations' is not found
            return { found: false, index: -1, value: null };
        }
    }

    // Return null if the first row is empty or doesn't exist
    return { found: false, index: -1, value: null };
}

// Update Header if current client isn't in it
async function updateRecommendationCell(client, sheetId, sheetName, currentClientName, padding) {
    // Get the index of the 'Recommendations' cell in the first row
    console.log("looking for recommendation cell for ", sheetName);
    const headerIndex = await getSheetHeaderValues(client, sheetId, sheetName, currentClientName);
    console.log(headerIndex);

    if (headerIndex.index >= 0) {
        // Fetch the value of the cell
        const range = `${sheetName}!${String.fromCharCode(65 + headerIndex.index)}1`;
        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });

        let cellValue = response.data.values ? response.data.values[0][0] : null;
        console.log(cellValue);
        if (cellValue) {
            // Use regex to replace the first match of "  <anything> -" with `currentClientName`
            let newValue = cellValue.replace(/^.*? -/, `${currentClientName} -`);
            if (padding) {
                newValue = `                     ${newValue}`;
            }

            // Update the cell with the new value
            const updateResponse = await client.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: 'RAW',
                resource: {
                    values: [[newValue]],
                },
            });

            return updateResponse.status === 200;
        } else {
            console.log('Cell is empty or does not exist');
            return false;
        }
    } else if (headerIndex.index == -2){
        // console.log("Recommendations header is already correct");
        return false;
    }
     else {
        console.log('Recommendations header not found');
        return false;
    }
}

// ` Utilities

async function updateSheet(client, sheetId, requests) {
    if (requests.length > 0) {
        await client.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests,
            },
        });
    }
}

async function getSheetId(client, sheetId, sheetName) {
    const sheetMetadata = await client.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties',
    });
    const sheet = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
}

async function findPageNameRow(values) {
    return values.findIndex(value => value && value.includes("PAGE NAME"));
}

async function ensureSufficientRows(sheets, sheetId, sheetName, startRow, requiredRows) {
    try {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            fields: 'sheets(properties(gridProperties(rowCount),title))', // Ensure we're getting the grid properties
        });

        const sheetInfo = sheetMetadata.data.sheets.find(sheet => sheet.properties.title === sheetName);
        
        if (!sheetInfo) {
            throw new Error(`Sheet with name ${sheetName} not found.`);
        }

        if (!sheetInfo.properties || !sheetInfo.properties.gridProperties) {
            throw new Error(`Sheet properties or gridProperties are missing for sheet: ${sheetName}`);
        }

        const currentRowCount = sheetInfo.properties.gridProperties.rowCount;
        const additionalRows = requiredRows - (currentRowCount - startRow - 1);

        console.log(`Current row count: ${currentRowCount}, Start row: ${startRow}, Required rows: ${requiredRows}, Additional rows: ${additionalRows}`);

        if (additionalRows > 0) {
            return await addRowsToSheet(sheets, sheetId, sheetName, additionalRows);
        }
        return null;
    } catch (error) {
        console.error(`Error in ensureSufficientRows: ${error.message}`);
        throw error;
    }
}

async function addRowsToSheet(client, sheetId, sheetName, additionalRows) {
    const sheetIdNum = await getSheetId(client, sheetId, sheetName);
    const requests = [
        {
            appendDimension: {
                sheetId: sheetIdNum,
                dimension: 'ROWS',
                length: additionalRows,
            },
        },
    ];

    await client.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
            requests,
        },
    });

    return { startRowIndex: additionalRows - 1, endRowIndex: additionalRows + additionalRows - 1 };
}

// Start Main Procedures
// ` Title Procedure       
async function processTitleTagSheet(sheets, data) {
    const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: data.sheetId,
        fields: 'sheets(properties(title,hidden))',
    });

    const visibleSheets = sheetMetadata.data.sheets
        .filter(sheet => !sheet.properties.hidden)
        .map(sheet => sheet.properties.title);

    const sheetName = visibleSheets.find(title => title.includes("Title"));
    if (!sheetName) {
        return { error: `No visible sheet with "Title" in its name found.`, status: 404 };
    }

    updateRecommendationCell(sheets, data.sheetId, sheetName, data.currentClientName,true);

    const values = await getSheetValues(sheets, data.sheetId, sheetName);
    const pageNameRow = await findPageNameRow(values);

    if (pageNameRow === -1) {
        return { error: `"PAGE NAME" not found in the Title sheet.`, status: 404 };
    }

    const rowsNeeded = data.webpages.length;
    await ensureSufficientRows(sheets, data.sheetId, sheetName, pageNameRow, rowsNeeded);

    const requests = [];

    let rowIndex = pageNameRow + 1;
    for (let page of data.webpages) {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.name } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.url } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.keywords.join('\n') } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } }] }], fields: 'userEnteredValue' } },
        );
        if (page.titleNew) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.titleNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
            );
        } else {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.title } , userEnteredFormat: { backgroundColor: WHITE_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
            );
        }

        rowIndex++;
    }

    await updateSheet(sheets, data.sheetId, requests);

    return { sheetName, sheetId: await getSheetId(sheets, data.sheetId, sheetName), startRowIndex: pageNameRow + 1, endRowIndex: rowIndex };
}

// ` H1/Meta Wrapper Procedure       
async function processH1MetaSheets(sheets, data, titleSheetInfo) {
    const processResults = [];

    const processSheet = async (keyword, processRow) => {
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId: data.sheetId,
            fields: 'sheets(properties(title,hidden))',
        });

        const visibleSheets = sheetMetadata.data.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);

        const sheetName = visibleSheets.find(title => title.includes(keyword));
        if (!sheetName) {
            return { error: `No visible sheet with "${keyword}" in its name found.`, status: 404 };
        }
        
        if(keyword == "Meta"){
            updateRecommendationCell(sheets, data.sheetId, sheetName, data.currentClientName, true);
        }
        else{
            updateRecommendationCell(sheets, data.sheetId, sheetName, data.currentClientName, false);
        }

        const values = await getSheetValues(sheets, data.sheetId, sheetName);
        const pageNameRow = await findPageNameRow(values);

        if (pageNameRow === -1) {
            return { error: `"PAGE NAME" not found in the ${keyword} sheet.`, status: 404 };
        }

        const rowsNeeded = titleSheetInfo.endRowIndex - titleSheetInfo.startRowIndex;
        const newRowRange = await ensureSufficientRows(sheets, data.sheetId, sheetName, pageNameRow, rowsNeeded);

        const requests = [];
        let rowIndex = pageNameRow + 1;

        // Insert formulas for A, B, C, E, G columns
        if (newRowRange) {
            for (let i = newRowRange.startRowIndex; i <= newRowRange.endRowIndex; i++) {
                requests.push(
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!A${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!B${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                    { updateCells: { range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { formulaValue: `='${titleSheetInfo.sheetName}'!C${rowIndex}` } }] }], fields: 'userEnteredValue' } },
                );
                // Column E: Length of the value in column D
                requests.push(
                    { 
                        updateCells: { 
                            range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 4, endColumnIndex: 5 }, // Column E
                            rows: [{ values: [{ userEnteredValue: { formulaValue: `=LEN('${titleSheetInfo.sheetName}'!D${rowIndex})` } }] }],
                            fields: 'userEnteredValue' 
                        } 
                    }
                );

                // Column G: Length of the value in column F
                requests.push(
                    { 
                        updateCells: { 
                            range: { sheetId: titleSheetInfo.sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 6, endColumnIndex: 7 }, // Column G
                            rows: [{ values: [{ userEnteredValue: { formulaValue: `=LEN('${titleSheetInfo.sheetName}'!F${rowIndex})` } }] }],
                            fields: 'userEnteredValue' 
                        } 
                    }
                );
                rowIndex++;
            }
        }

        // Apply original data for meta, h1, h2 |
        await processRow(pageNameRow + 1, requests, sheetName);
        await updateSheet(sheets, data.sheetId, requests);
        processResults.push({ sheetName, startRowIndex: pageNameRow + 1, endRowIndex: rowIndex });
    };

    // ` Meta Procedure       
    await processSheet("Meta", async (rowIndex, requests, sheetName) => {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        for (let page of data.webpages) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta } }] }], fields: 'userEnteredValue' } }, // highlight white
            );

            if (page.metaNew) {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.metaNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                );
            } else {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.meta }, userEnteredFormat: { backgroundColor: WHITE_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                );
            }
            rowIndex++;
        }
    });
    
    // ` Header Procedure       
    await processSheet("H1/H2", async (rowIndex, requests, sheetName) => {
        const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

        for (let page of data.webpages) {
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.header } }] }], fields: 'userEnteredValue' } },
            );

            if (page.headerNew) {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.headerNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                );
            } else {
                requests.push(
                    { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.header }, userEnteredFormat: { backgroundColor: WHITE_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
                );
            }
            rowIndex++;
        }
    });

    return processResults;
}


// ` Alt Tag Procedure       
async function processAltTagsSheet(sheets, data) {
    const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: data.sheetId,
        fields: 'sheets(properties(title,gridProperties))', // Added gridProperties to get rowCount
    });

    const visibleSheets = sheetMetadata.data.sheets
        .filter(sheet => !sheet.properties.hidden)
        .map(sheet => ({
            title: sheet.properties.title,
            rowCount: sheet.properties.gridProperties.rowCount  // Get current row count
        }));

    const sheet = visibleSheets.find(sheet => sheet.title.includes("Alt Tag"));
    if (!sheet) {
        return { error: `No visible sheet with "Alt Tag" in its name found.`, status: 404 };
    }

    const sheetName = sheet.title;
    const currentRowCount = sheet.rowCount;

    const rowsNeeded = data.altTags.length + 3;  // Alt tags length + 4 extra rows

    const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

    // # We're using sheetId from the request for the spreadsheet ID and then sheetID is for the actual sheet
    // # whoops... 
    
    // Step 1: Ensure there are enough rows
    if (rowsNeeded > currentRowCount - 1) { // Preserve the last row
        await insertRows(sheets, data.sheetId, sheetId, currentRowCount - 1, rowsNeeded - (currentRowCount - 1)); // Insert rows before the last row
        await applyBordersAndFormulas(sheets, data.sheetId, sheetId, currentRowCount - 1, rowsNeeded); // Apply black borders and insert formulas in column E
    }

    // Step 2: If there are too many rows, delete the extra rows but keep the last one
    if (rowsNeeded < currentRowCount - 1) { // Ignore the last row during trimming
        await trimRows(sheets, data.sheetId, sheetId, rowsNeeded, currentRowCount - 1); // Keep the last row intact
    }

    const requests = [];

    updateRecommendationCell(sheets, data.sheetId, sheetName, data.currentClientName, true);

    for (let [index, item] of data.altTags.entries()) {
        const baseIndex = index + 4;
        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.page } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 1, endColumnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.url } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.originalAlt } }] }], fields: 'userEnteredValue' } },
            // Highlight the new alt tag if it's different
            { updateCells: { range: { sheetId, startRowIndex: baseIndex - 1, endRowIndex: baseIndex, startColumnIndex: 3, endColumnIndex: 4 }, rows: [{ values: [{ userEnteredValue: { stringValue: item.newAlt }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } }
            // For alt tags, we're not leaving any old ones in the sheet. We clear them all out first.
        );
    }

    await updateSheet(sheets, data.sheetId, requests);
    return { updatedCells: requests.length };
}

// Function to insert rows above the last row (to preserve the last row)
async function insertRows(sheets, spreadsheetId, sheetId, beforeLastRowIndex, rowsToAdd) {
    const requests = [
        {
            insertDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: beforeLastRowIndex, // Insert above the last row
                    endIndex: beforeLastRowIndex + rowsToAdd
                },
                inheritFromBefore: true // Ensure styles from above row are inherited
            }
        }
    ];
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: { requests }
    });
}

// Function to trim excess rows but preserve the last row
async function trimRows(sheets, spreadsheetId, sheetId, rowsNeeded, currentRowCount) {
    const requests = [
        {
            deleteDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: rowsNeeded,  // Start from where the data ends
                    endIndex: currentRowCount  // Trim until one row before the last row
                }
            }
        }
    ];
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: { requests }
    });
}

// Function to apply black borders and insert formulas in column E
async function applyBordersAndFormulas(sheets, spreadsheetId, sheetId, startRow, endRow) {
    const requests = [];

    for (let row = startRow; row < endRow; row++) {
        // Apply black border to the row
        requests.push({
            updateBorders: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: startRow,
                    endRowIndex: endRow, // Apply borders for all rows between startRow and endRow
                    startColumnIndex: 0, // Column A (0-based index)
                    endColumnIndex: 5 // Column E (0-based index, non-inclusive)
                },
                top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
                bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
                left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
                right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
                innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }, // Inner horizontal borders
                innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } }  // Inner vertical borders
            }
        });

        // Insert the formula into column E of the row
        const formula = `=LEN(D${row + 1})`;
        requests.push({
            updateCells: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: row, 
                    endRowIndex: row + 1,
                    startColumnIndex: 4, // Column E (index 4)
                    endColumnIndex: 5
                },
                rows: [{
                    values: [{ userEnteredValue: { formulaValue: formula } }]
                }],
                fields: 'userEnteredValue'
            }
        });
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: { requests }
    });
}

// ` On-Page Procedure       
async function processOnPageSheet(sheets, data) {
    const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: data.sheetId,
        fields: 'sheets(properties(title,hidden))',
    });

    const visibleSheets = sheetMetadata.data.sheets
        .filter(sheet => !sheet.properties.hidden)
        .map(sheet => sheet.properties.title);

    const sheetName = visibleSheets.find(title => title.includes("On-Page"));
    if (!sheetName) {
        return { error: `No visible sheet with "On-Page" in its name found.`, status: 404 };
    }

    updateRecommendationCell(sheets, data.sheetId, sheetName, data.currentClientName, false);

    const pagesWithOnPage = data.webpages.filter(page => page.onpage);

    const rowsPerEntry = 7; // As we have 7 rows per entry
    const requiredRows = 6 + (rowsPerEntry * pagesWithOnPage.length); // Starting at row 6

    // Ensure there are enough rows
    await ensureSufficientRows(sheets, data.sheetId, sheetName, 5, requiredRows);

    const requests = [];
    let rowIndex = 4; // Starting index based on the image provided, adjust as needed.

    const sheetId = await getSheetId(sheets, data.sheetId, sheetName);

    pagesWithOnPage.forEach((page) => {
        const webpageText = `Web Page: ${page.url}`;
        const targetedKeywords = `Targeted Keyword(s):\n${page.keywords.join('\n')}`;

        requests.push(
            { updateCells: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: webpageText } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex + 1, endRowIndex: rowIndex + 2, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: targetedKeywords } }] }], fields: 'userEnteredValue' } },
            { updateCells: { range: { sheetId, startRowIndex: rowIndex + 3, endRowIndex: rowIndex + 4, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.onpage } }] }], fields: 'userEnteredValue' } },
            // Add more updateCells requests as needed for other rows
        );
        if(page.onpageNew){
            console.log("highlighting onpage");
            requests.push(
                { updateCells: { range: { sheetId, startRowIndex: rowIndex + 5, endRowIndex: rowIndex + 6, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.onpageNew }, userEnteredFormat: { backgroundColor: HIGHLIGHT_COLOR }  }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
            )
        }
        else{
        requests.push(          
            { updateCells: { range: { sheetId, startRowIndex: rowIndex + 5, endRowIndex: rowIndex + 6, startColumnIndex: 0, endColumnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: page.onpage } , userEnteredFormat: { backgroundColor: WHITE_COLOR } }] }], fields: 'userEnteredValue,userEnteredFormat.backgroundColor' } },
            )
        }
        rowIndex += rowsPerEntry; // Move to the next set of rows for the next page.
    });

    await updateSheet(sheets, data.sheetId, requests);  
    return { sheetName, updatedCells: requests.length };
}

// ` Main POST       
export async function POST(request) {
    const data = await request.json();

    // console.log(data);

    const client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'http://localhost:3000',
    );

    client.setCredentials(data.tokens);
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log("Writing to Google...");
    
    const titleSheetInfo = await processTitleTagSheet(sheets, data);

    if (titleSheetInfo.error) {
        return NextResponse.json({ error: titleSheetInfo.error }, { status: titleSheetInfo.status });
    }

    const h1MetaResults = await processH1MetaSheets(sheets, data, titleSheetInfo);
    const altTagResults = await processAltTagsSheet(sheets, data);
    const onPageResults = await processOnPageSheet(sheets, data);

    // todo: make some kind of reporting that makes sense
    const totalUpdatedCells = h1MetaResults.reduce((acc, { updatedCells }) => acc + updatedCells, 0)  + altTagResults.updatedCells + onPageResults.updatedCells;
    return NextResponse.json({ success: true, updatedCells: totalUpdatedCells }, { status: 200 });
}

export async function GET(request) {
    return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

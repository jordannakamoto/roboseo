// Implement Later...
//
// // LOAD CLIENT DATA INTO PROGRAM MEMORY
// const handleLoadClient = async () => {
//   const url = document.getElementById('active-client-url').value;
//   const sheetId = extractSheetIdFromUrl(url);

//   setSheetUrl(url);

//   if (sheetId && tokens) {
//     // 1. Get Sheet Titles
//     try {
//       const response = await fetch('/api/get-sheet-titles', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           tokens,
//           spreadsheetId: sheetId,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }

//       const res = await response.json();
//       const sheetTitles = res.visibleSheetTitles; // Assuming the backend sends an array of titles
//       setSheetTitles(sheetTitles);

//       // now that we have sheetTitles...
//       // 2. Get Client Webpage Names
//       const titleTagSheet = sheetTitles.find(title => title.startsWith("Title Tag"));
//       if (!titleTagSheet) {
//         throw new Error("The client workbook input is unexpected: 'Title Tag' sheet not found.");
//       }
//       try {
//         const webpagesResponse = await fetch('/api/get-client-webpages', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             tokens,
//             spreadsheetId: sheetId,
//             sheetName: titleTagSheet,
//           }),
//         });

//         if (!webpagesResponse.ok) {
//           throw new Error(`HTTP error! Status: ${webpagesResponse.status}`);
//         }

//         const webpagesResult = await webpagesResponse.json();
//         const webPages = webpagesResult.webpages; // Assuming the backend sends an object with a webpages array

//         // Now we have a list of webpages

//         // ...
//         // 3. Get Webpage Keywords
//         // Dependencies: Webpages already set
//         const keywordSheet = sheetTitles.find(title => title.startsWith("Keyword"));
//         // Expect something like 'Keyword Research & Strategy (Mid-Year Refresh)'
//         if (!keywordSheet) {
//           throw new Error("The client workbook input is unexpected: Keyword sheet not found.");
//         }
//         try {
//           const keywordResponse = await fetch('/api/get-keywords', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               tokens,
//               spreadsheetId: sheetId,
//               sheetName: keywordSheet,
//               pages: webPages,
//             }),
//           });

//           const keywordResult = await keywordResponse.json();
//           setPages(keywordResult.webpagesWithKeywords);
          
//           // Store Data in Context Provider
//           // setPages(webpagesWithKeywords);

//           if (!keywordResult.ok) {
//             throw new Error(`HTTP error! Status: ${webpagesResponse.status}`);
//           }
          
//           // Now we have the keywords corresponding to the pages
//         } catch (error) {
//           console.error('Failed to load keywords:', error);
//         }   
//       } catch (error) {
//         console.error('Failed to load client webpages:', error);
//       }

//     } catch (error) {
//       console.error('Failed to load sheet titles:', error);
//     }
//   } else {
//     console.log("Error: either URL is missing, or user is not authenticated");
//   }
// }
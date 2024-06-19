'use client'
// TODO
// Flash effect on field when url changes

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { useClientWebpage } from '@/contexts/ClientWebpageContext';
import { useClientsContext } from '@/contexts/ClientsContext'
import { useGoogleLogin } from '@react-oauth/google';

export default function TopBar () {
  const [tokens, setTokens] = useState(null);
  // Local clients state
  const [clientList, setClientList] = useState([]);
  const { pages, setPages, setSheetTitles, setSheetUrl } = useClientWebpage(); // Use the hook at the top level
  // Global clients context state
  const {allClients, currentClient, setAllClients, setCurrentClient} = useClientsContext();

  // > On Page Load
  // Restore Saved Tokens, URLS, ClientList
  useEffect(() => {
    // LOAD TOKENS
    try {
      const storedTokens = localStorage.getItem('tokens');
      if (storedTokens) {
        const savedTokens = JSON.parse(storedTokens);
        // Ensure that the parsed tokens are in the expected format or not null
        if (savedTokens && typeof savedTokens === 'object') {
          setTokens(savedTokens);
        }
      }
    } catch (error) {
      console.error("Error loading tokens from local storage:", error);
      // Handle error or clear corrupted local storage item if necessary
      localStorage.removeItem('tokens');
    }
    // LOAD MASTER SHEET URL
    try {
      const storedMSheet = localStorage.getItem('masterSheetURL');
      if (storedMSheet) {
        // Remove quotation marks from the retrieved string
        const cleanedMSheet = storedMSheet.replace(/^"|"$/g, '');
        document.getElementById('master-sheet-url').value = cleanedMSheet;
      }
    } catch (error) {
      console.error("Error loading master sheet URL from local storage:", error);
      localStorage.removeItem('masterSheetURL');
    };
    // LOAD CLIENT LIST
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
        try {
            let clientArray = JSON.parse(storedClients); // Parse the JSON string to an array
            clientArray = clientArray.filter(cl => cl.workbookURL.length >= 12);
            console.log(clientArray);
            setClientList(clientArray); // Update the local clientList state with the retrieved array
            setAllClients(clientArray);
        } catch (error) {
            console.error("Error parsing clientNames from local storage:", error);
        }
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: async ({ code }) => {
      const response = await axios.post('http://localhost:3000/api/auth', {
        code,
      });

      const { tokens } = response.data;
      setTokens(tokens);
      // Save tokens to local storage
      localStorage.setItem('tokens', JSON.stringify(tokens));
    },
    onError:error=>{
      console.log(error)
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    flow: 'auth-code',
  });

  // > When we Load a new Master Sheet...
  // LOAD CLIENT LIST
  const handleLoadSheet = async () => {
    const url = document.getElementById('master-sheet-url').value;
    const sheetId = extractSheetIdFromUrl(url);

    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const test_date = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const range = `${test_date}!C:G`;
    console.log(range);
    
    if (sheetId && tokens) {
      try {
        const response = await fetch('/api/google_sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens,
            spreadsheetId: sheetId,
            range,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let res = await response.json();
        // console.log(res.response.data.values)
        let data = res.response.data.values.slice(1) // Skip the first row
        .filter(row => row[0] && row.length > 2 ) // Filter out empty rows or rows that have notes in them

        let clientArray = data.map(row => ({
          name: row[0],
          workbookURL: row[4],
        }));

        clientArray = clientArray.filter(cl => cl.workbookURL.length >= 12);
        console.log(clientArray);
        // Update the clientList state with the retrieved array
        setClientList(clientArray);
        localStorage.setItem('masterSheetURL', JSON.stringify(url));
        localStorage.setItem('clients', JSON.stringify(clientArray));

      } catch (error) {
        console.error('Failed to load sheet:', error);
      }
    } else {
      console.log("Handle error: either URL is missing, or user is not authenticated");
    }
  };

  // > When we select a client from the UI...
  // LOAD CURRENT CLIENT DATA INTO PROGRAM MEMORY
  const handleLoadClient = async () => {
    const url = document.getElementById('active-client-url').value;
    const sheetId = extractSheetIdFromUrl(url);
    console.log(sheetId)

    setSheetUrl(url);

    if (sheetId && tokens) {
      // 1. Get Sheet Titles
      try {
        const response = await fetch('/api/get-sheet-titles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens,
            spreadsheetId: sheetId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const res = await response.json();
        const sheetTitles = res.visibleSheetTitles; // Assuming the backend sends an array of titles
        setSheetTitles(sheetTitles);

        // now that we have sheetTitles...
        // 2. Get Client Webpage Names
        const titleTagSheet = sheetTitles.find(title => title.startsWith("Title Tag"));
        if (!titleTagSheet) {
          throw new Error("The client workbook input is unexpected: 'Title Tag' sheet not found.");
        }
        try {
          const webpagesResponse = await fetch('/api/get-client-webpages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokens,
              spreadsheetId: sheetId,
              sheetName: titleTagSheet,
            }),
          });

          if (!webpagesResponse.ok) {
            throw new Error(`HTTP error! Status: ${webpagesResponse.status}`);
          }

          const webpagesResult = await webpagesResponse.json();
          const webPages = webpagesResult.webpages; // Assuming the backend sends an object with a webpages array

          // Now we have a list of webpages

          // ...
          // 3. Get Webpage Keywords
          // Dependencies: Webpages already set
          const keywordSheet = sheetTitles.find(title => title.startsWith("Keyword"));
          // Expect something like 'Keyword Research & Strategy (Mid-Year Refresh)'
          if (!keywordSheet) {
            throw new Error("The client workbook input is unexpected: Keyword sheet not found.");
          }
          try {
            const keywordResponse = await fetch('/api/get-keywords', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tokens,
                spreadsheetId: sheetId,
                sheetName: keywordSheet,
                pages: webPages,
              }),
            });

            if (!keywordResponse.ok) {
              throw new Error(`HTTP error! Status: ${keywordResponse.status}`);
            }
            
            const keywordResult = await keywordResponse.json();
            setPages(keywordResult.webpagesWithKeywords);
            
            // Store Data in Context Provider
            // setPages(webpagesWithKeywords);

            
            // Now we have the keywords corresponding to the pages
          } catch (error) {
            console.error('Failed to load keywords:', error);
          }   
        } catch (error) {
          console.error('Failed to load client webpages:', error);
        }

      } catch (error) {
        console.error('Failed to load sheet titles:', error);
      }
    } else {
      console.log("Error: either URL is missing, or user is not authenticated");
    }
  }


  const extractSheetIdFromUrl = (url) => {
    const matches = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
    return matches ? matches[1] : null;
    console.log(matches[1]);
  };

  // > When a client is clicked from the list panel
  const selectClient = (client) => {
    setCurrentClient(client);
    localStorage.setItem('currentClient', JSON.stringify(client));
    document.getElementById('active-client-url').value = client.workbookURL;
    handleLoadClient();
  }


  // > Call this to prepare homepage list for frog
  // & set the global clients context
  const loadFrogScraper = async () => {
    let clientList_modified = clientList
    .map((client) => {
      let workbookSheetId = extractSheetIdFromUrl(client.workbookURL);
      if (workbookSheetId == null) {
        alert("Error loading sheetID for client, " + client.name + " workbook url: " + client.workbookURL);
        return null; // Return null for clients with null workbookSheetId
      }
      client.workbookSheetId = workbookSheetId;
      return client;
    })
    .filter(client => client !== null); // Filter out the clients that are null

  setClientList(clientList_modified);
    // urlList = urlList.filter(url => url !== null); // Optional filtering...
    if(tokens){
      try {
        const response = await fetch('/api/get-all-client-urls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens,
            clients: clientList,
          }),
        });
    
        // Handle response data
        const result = await response.json();
        const resultArray = result.responseList;
        // set the local Client list
        // - stored client list
        // - global client list context
        setClientList(resultArray);
        localStorage.setItem('clients', JSON.stringify(resultArray));
        setAllClients(resultArray);
      }
      catch (err) {
        console.error('Failed to process files:', err);}
      }
  }

  // _ Component Render _
  return (
      <div className={`absolute top-0 left-0 right-0 z-10 border-b border-gray-200`} style={{ background: 'rgba(255, 255, 255, 0.7)'}}>
        <div className="flex justify-between items-center">
          <div className="flex flex-grow items-center space-x-4">
            <span style={{marginLeft:"20px"}}>{currentClient.name}</span>
            <input
                id="active-client-url"
                onChange={handleLoadClient}
                className="p-2 border border-gray-300 rounded"
                placeholder="Active Client"
                style={{flexGrow: 1, fontSize: "11px"}}
            />
            <input
                id="master-sheet-url"
                onChange={handleLoadSheet}
                className="p-2 border border-gray-300 rounded"
                placeholder="Master sheet URL"
                style={{flexGrow: 1, fontSize: "11px"}}
            />
            {/* Conditionally render button text and style based on `tokens` state */}
            <Button
                onClick={login}
                style={{ opacity: tokens ? 0.5 : 1, fontSize: "11px"}}
            >
                {tokens ? 'Signed In' : <><FcGoogle size={25} /> Sign in</>}
            </Button>
          </div>
          {/* Dropdown for client list */}
              <div className="absolute top-10 right-0 z-10 mt-1 w-48 py-1 bg-white border border-gray-300 rounded shadow-lg" style={{"height": "70vh", overflow:"scroll"}}>
                <ul className="text-sm text-gray-700">
                  {clientList.map((item, index) => (
                      <li key={index} onClick={() => selectClient(item)} className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                        currentClient === item ? 'bg-blue-600 text-white': ''}`}>
                          {item.name}
                      </li>
                  ))}
                </ul>
              </div>
          {/* <button className="block h-10 w-20 rounded-sm border border-gray-300 bg-white p-2">
              Next
            </button> */}
            <button onClick={loadFrogScraper} className="block h-10 w-20 rounded-sm border border-gray-300 bg-white p-2">
             FeedFrog
            </button>
        </div>
      </div>

  );
}

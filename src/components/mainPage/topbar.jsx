'use client';
// TODO
// Flash effect on field when url changes

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import LoadingModal from '@/components/loader';
import axios from 'axios';
import { useClientWebpage } from '@/contexts/ClientWebpageContext';
import { useClientsContext } from '@/contexts/ClientsContext';
import { useGoogleLogin } from '@react-oauth/google';

// Helper function to extract the Sheet ID from the Google Sheets URL
const extractSheetIdFromUrl = (url) => {
  const matches = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
  return matches ? matches[1] : null;
};

export default function TopBar({onPrepareData}) {
  const [tokens, setTokens] = useState(null);
  const [clientList, setClientList] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false); // Defaults to not showing completed clients in the list
  const [isMasterSheetVisible, setIsMasterSheetVisible] = useState(false); // State to manage visibility of master-sheet-url input
  const { pages, setPages, sheetTitles, sheetUrl, altImages,altImagesProcessed, setAltImages, setSheetTitles, setSheetUrl, setClientUrl, showH2, finalizationState, setFinalizationState } = useClientWebpage();
  const { currentClient, setCurrentClient, setAllClients } = useClientsContext();
  // - Loading Modal
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hModeTemp, setHModeTemp] = useState('h1');

  // Ref to track if testCSVParse has already been called for the current pages state
  const csvParsedRef = useRef(false);
  
  // Load initial data from local storage when component mounts
  useEffect(() => {
    try {
      const storedTokens = localStorage.getItem('tokens');
      if (storedTokens) setTokens(JSON.parse(storedTokens));

      const storedMSheet = localStorage.getItem('masterSheetURL');
      if (storedMSheet) document.getElementById('master-sheet-url').value = JSON.parse(storedMSheet);

      const storedClients = localStorage.getItem('clients');
      if (storedClients) {
        const clientArray = JSON.parse(storedClients).filter(cl => cl.workbookURL.length >= 12);
        setClientList(clientArray);
        setAllClients(clientArray);
      }
    } catch (error) {
      console.error("Error loading data from local storage:", error);
    }
  }, [setAllClients]);

  // Google login function
  const login = useGoogleLogin({
    onSuccess: async ({ code }) => {
      try {
        const response = await axios.post('http://localhost:3000/api/auth', { code });
        const { tokens } = response.data;
        setTokens(tokens);
        localStorage.setItem('tokens', JSON.stringify(tokens));
      } catch (error) {
        console.error('Error during login:', error);
      }
    },
    onError: error => {
      console.error('Google login error:', error);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    flow: 'auth-code',
  });

  // Load client list from the master sheet
  const handleLoadSheet = async () => {
    const url = document.getElementById('master-sheet-url').value;
    const sheetId = extractSheetIdFromUrl(url);
    const now = new Date();
    const test_date = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const range = `${test_date}!C:J`;

    if (sheetId && tokens) {
      try {
        setIsLoading(true);
        setLoadingMessage('Loading client list...');
        const response = await fetch('/api/get-client-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, range }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const res = await response.json();
        const data = res.response.data.values.slice(1).filter(row => row[0] && row.length > 2);
        const clientArray = data.map(row => ({ name: row[0], workbookURL: row[4], isRefresh: row[7] })).filter(cl => cl.workbookURL.length >= 12);

        setClientList(clientArray);
        localStorage.setItem('masterSheetURL', JSON.stringify(url));
        localStorage.setItem('clients', JSON.stringify(clientArray));
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load sheet:', error);
        setIsLoading(false);
      }
    } else {
      console.log("Master sheet already loaded");
    }
  };

  // Load selected client's data
  const handleLoadClient = async (client) => {
    const url = client.workbookURL;
    const sheetId = extractSheetIdFromUrl(url);
    setSheetUrl(url);

    if (sheetId && tokens) {
      try {
        // set isLoading during select client

        // -- Fetch Sheet Titles
        // .. First we get all the sheet titles in the spreadsheet document so we can make calls to the right data range

        const titlesResponse = await fetch('/api/get-sheet-titles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId }),
        });
        if (!titlesResponse.ok) throw new Error(`HTTP error! Status: ${titlesResponse.status}`);

        const titlesRes = await titlesResponse.json();
        const titles = titlesRes.visibleSheetTitles;
        setSheetTitles(titles);

        // -- GET CLIENT WEBPAGES -- //
        // -- Pulls from Keyword Research and Strategy

        // Find Title Tag sheet and fetch webpage data
        const titleTagSheet = titles.find(title => title.startsWith("Title Tag"));
        if (!titleTagSheet) throw new Error("Title Tag sheet not found.");
        // ! Commented out title tag sheet, not sure if we need it retrieved later

        // > Find Keyword sheet and fetch keyword data
        const keywordSheet = titles.find(title => title.startsWith("Keyword"));
        if (!keywordSheet) throw new Error("Keyword sheet not found.");

        const webpagesResponse = await fetch('/api/get-client-webpages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, titleSheet: titleTagSheet, sheetName: keywordSheet, currentClient: currentClient }),
        });
        if (!webpagesResponse.ok) throw new Error(`HTTP error! Status: ${webpagesResponse.status}`);

        const webpagesRes = await webpagesResponse.json();
        const webPages = webpagesRes.webpages;

        // ... keywords
        const keywordsResponse = await fetch('/api/get-keywords', {
          method: 'POST',
          headers: { 'Content-Type': '`application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, sheetName: keywordSheet, titleSheet: titleTagSheet, pages: webPages }),
        });
        if (!keywordsResponse.ok) throw new Error(`HTTP error! Status: ${keywordsResponse.status}`);

        const keywordsRes = await keywordsResponse.json();
        setPages(keywordsRes.webpagesWithKeywords);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load client data:', error);
        setIsLoading(false);
      }
    } else {
      if(!sheetId){

      }
      else{
      console.error("Either no client sheet or user is not authenticated");
      }
    }
  };

  // Handle client selection from the list
  const selectClient = (client) => {
    if(client == currentClient){
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Loading client...');
    setPages([]); // Reset pages before loading new client data
    setAltImages([]); // Reset alt images
    setSheetTitles([]); // Reset sheet titles
    setCurrentClient(client);
    localStorage.setItem('currentClient', JSON.stringify(client));
    // document.getElementById('active-client-url').value = client.workbookURL;
  };

  const markClientDone = async () => {


    // Make API call to highlight the row

    const url = document.getElementById('master-sheet-url').value;
    const sheetId = extractSheetIdFromUrl(url);
    const now = new Date();
    const test_date = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const range = `${test_date}!A:L`;

    const updatedClient = { ...currentClient, completed: !currentClient.completed }; // Toggle the completed value
    setCurrentClient({
      ...currentClient, 
      completed: !currentClient.completed
    });

    const response = await fetch('/api/mark-client-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        sheetId,
        range,
        currentClient: updatedClient,
        sheetName: test_date,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mark client as done. Status: ${response.status}`);
    }

    const res = await response.json();
    console.log('Row highlighted:', res.highlightedRow);
    const updatedClientList = clientList.map(client =>
      client.name === updatedClient.name ? updatedClient : client
    );
  
    // Find the index of the current client in the list
    const currentIndex = updatedClientList.findIndex(client => client.name === updatedClient.name);
  
    // > Set next client if marking DONE, set to next client
    if(updatedClient.completed){
    // Determine the next client, or loop back to the first client if at the end of the list
    const nextIndex = (currentIndex + 1) % updatedClientList.length;
    const nextClient = updatedClientList[nextIndex];
    // selecting next client... 
    setIsLoading(true);
    setLoadingMessage('Loading client...');
    setPages([]); // Reset pages before loading new client data
    setAltImages([]); // Reset alt images
    setSheetTitles([]); // Reset sheet titles
    setCurrentClient(nextClient); // Set the next client as the current client
    }

    setClientList(updatedClientList); // Update the state with the new list
    localStorage.setItem('clients', JSON.stringify(updatedClientList)); // Persist the updated client list to local storage
  };
  
  

  // TRIGGER API CALL TO G-SHEET CLIENT DATA
  // When currentClient changes, load the client data
  useEffect(() => {
    if (currentClient) {
      csvParsedRef.current = false;
      handleLoadClient(currentClient);
    }
  }, [currentClient]);

  // TRIGGER PARSE CSV FROM FROG DATA
  // When currentClient and pages change, parse the CSV
  useEffect(() => {
    if (currentClient && pages.length > 0 && !csvParsedRef.current) {
      csvParsedRef.current = true; // Set the ref to true to indicate parsing has started
      testCSVParse();
    }
  }, [currentClient, pages]);

  // Parse CSV data for the current client
  const testCSVParse = async () => {
    if (!currentClient) {
      console.error('No current client selected.');
      return;
    }
    // error sometimes gets thrown here
    let currClientHomepage = currentClient.homepage.replace(/^https?:\/\//, '');
    setClientUrl(currClientHomepage.replace(/\/$/, ''));

    try {
      // Load data from Frog CSVs
      console.log('Sending request to Frog API...');
      const payload = JSON.stringify({ dir: currClientHomepage, webpages: pages });
      console.log('Sending payload to Frog API:', payload);
      const response = await fetch('/api/load-from-frog-data-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: currClientHomepage, webpages: pages }),
      });

      if (!response.ok) throw new Error('Error processing files');

      const { result } = await response.json();

      // -- Merge the Data
      // > Frog csv files contain the whole scrape
      // > Call to GSheets API to get only the pages we're interested in
      const mergedData = pages.map(page => {
        const urlPath = page.url.replace(/https:\/\/[^/]+/, ''); // Remove the root URL
        let pageName;

        if (!urlPath || urlPath === '/') {
          pageName = 'Home Page'; // Assign "Home Page" to the root URL
        } else {
          // Remove file extension if present
          const cleanPath = urlPath.split('/').map(segment => {
            return segment.split('.')[0]; // Remove everything after the first dot (.)
          });

          pageName = cleanPath
            .filter(Boolean) // Remove empty strings
            .map(word => 
              word
                .split('-') // Split by hyphen
                .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)) // Capitalize each segment
                .join(' ') // Join segments with a space
            )
            .join(' '); // Join the words with a space
        }

        return {
          ...result.find(r => r.url === page.url),
          ...page,
          name: pageName, // Set the name property with the formatted page name
        };
      });

      setPages(mergedData);
    } catch (error) {
      console.error('Failed to process files:', error);
    }

    try {
      // Load alt tags from Frog
      const response = await fetch('/api/load-from-frog-alt-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: currClientHomepage, alts: altImages }),
      });

      if (!response.ok) throw new Error('Error processing files');

      const { result } = await response.json();
      setAltImages(result);
    } catch (error) {
      console.error('Failed to load alt tags:', error);
    }
  };

  // Trigger workbook writing
  useEffect(() => {
    if (finalizationState.status === "write" &&
        finalizationState.altTagsReady &&
        finalizationState.metaTagsReady) {
          console.log("alt and meta tags ready for write");
      writeToWorkbook(hModeTemp).then(() => {
        // Reset the state after writing
        setFinalizationState({
          status: "idle",
          altTagsReady: false,
          metaTagsReady: false,
        });
      });
    }
  }, [finalizationState]);

  // Write data to the workbook
const writeToWorkbook = async (mode) => {
  try {
    setIsLoading(true);
    setLoadingMessage("Writing " + currentClient.name + " to workbook...");
    const response = await fetch('/api/write-to-workbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetId: extractSheetIdFromUrl(sheetUrl),
        sheetTitles,
        webpages: pages,  // Use directly, after ensuring it's updated
        tokens,
        altTags: altImagesProcessed,  // Use directly, after ensuring it's updated
        hMode: mode,
      }),
    });
    setIsLoading(false);

    if (!response.ok) throw new Error('Error writing to workbook');
    console.log(`Changes written to workbook ${sheetUrl}`);
  } catch (error) {
    console.error('Failed to write to workbook:', error);
  }
};

const triggerFinalization = (mode) => {
  setHModeTemp(mode);
  setFinalizationState({
    ...finalizationState,
    status: "finalize",
  });
};

  // Load Frog scraper with client data
  const loadFrogScraper = async () => {
    
    setIsLoading(true);
    setPages([]); // Reset pages before loading new client data
    setAltImages([]); // Reset alt images
    setSheetTitles([]); // Reset sheet titles
    setLoadingMessage("Getting all clients, homepages, and workbookURLSs from master sheet.\n Check HomepageList.txt when done");
    const modifiedClientList = clientList.map(client => {
      const workbookSheetId = extractSheetIdFromUrl(client.workbookURL);
      if (!workbookSheetId) {
        alert(`Error loading sheetID for client, ${client.name}`);
        return null;
      }
      return { ...client, workbookSheetId };
    }).filter(client => client !== null);

    setClientList(modifiedClientList);

    if (tokens) {
      try {
        const response = await fetch('/api/get-all-client-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, clients: modifiedClientList }),
        });

        const res = await response.json();
        const resultArray = res.responseList;

        if (res.failedClients.length > 0) console.log(res.failedClients);

        setClientList(resultArray);
        localStorage.setItem('clients', JSON.stringify(resultArray));
        setAllClients(resultArray);

        console.log("Clients loaded into screaming frog for scraping");
      } catch (error) {
        console.error('Failed to process files:', error);
      }
    }
    setIsLoading(false);
    const response = await fetch('/api/open-homepagelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  };
  
  // execute scrape
  const runScraper = () => {
    fetch('/api/run-scraper-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({  }),
    })
      .then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  }


  // *** UI ************************************************* //
  const toggleClientCompletion = (clientIndex) => {
    const updatedClientList = clientList.map((client, index) => 
      index === clientIndex ? { ...client, completed: !client.completed } : client
    );
    setClientList(updatedClientList);
    localStorage.setItem('clients', JSON.stringify(updatedClientList));
  };

    // Toggle visibility of master-sheet-url input
    const toggleMasterSheetVisibility = () => {
      setIsMasterSheetVisible(!isMasterSheetVisible);
    };

  // ******************************************************** //

  return (
    <div className="relative z-50">
    <div style = {{position:'absolute', left:'34px', top: '20px'}}>
      <h1 style= {{fontWeight:'bold', }}>{currentClient.name}</h1>
    </div>
    <LoadingModal isVisible={isLoading} message={loadingMessage} />
    <div className="fixed top-0 z-10 border-b border-gray-200" style={{ right: '0px', width: '200px', background: 'rgba(255, 255, 255, 1.0)' }}>
      <div className="flex justify-between items-center">
        <div className="flex flex-grow items-center space-x-4">
          {/* <span style={{ marginLeft: "20px" }}>{currentClient.name}</span> */}
          {/* <input
            id="master-sheet-url"
            onChange={handleLoadSheet}
            className="p-2 border border-gray-300 rounded"
            placeholder="Master sheet URL"
            style={{ flexGrow: 1, fontSize: "11px" }}
          /> */}
          {/* style={{ opacity: tokens ? 0.5 : 1, fontSize: "11px" }} */}
          <Button onClick={login} variant="outline">
            <FcGoogle size={10} />
          </Button>
        </div>
        <Button style={{color:'grey', backgroundColor: isMasterSheetVisible ? '#deeff5' : 'white',}} onClick={toggleMasterSheetVisibility} className="h-10 w-20 rounded-sm border border-gray-300 p-2">
            MSheet
          </Button>
          
            <input
              id="master-sheet-url"
              onChange={handleLoadSheet}
              className="p-2 border border-gray-300 rounded"
              placeholder="Master sheet URL"
              style={{ visibility: isMasterSheetVisible ? 'visible' : 'hidden', width: '300px',position:'absolute', zIndex:'1000', top:'40px', right:'-50px',flexGrow: 1, fontSize: "11px" }}
            />
        <Button variant="outline" style={{color:'grey'}} onClick={loadFrogScraper} className="block h-10 w-20 rounded-sm border border-gray-300 bg-white p-2">
          Init
        </Button>
        <Button variant="outline" style={{color:'grey'}} onClick={runScraper} className="block h-10 w-20 rounded-sm border border-gray-300 bg-white p-2">
          Scrape
        </Button>
         {/* Right Sidebar */}
        <div className="fixed top-10 right-0 z-10 mt-1 py-1 bg-white border border-gray-300 rounded" style={{ height: "70vh", width: "200px", overflow: "scroll" }}>
          <ul className="text-sm text-gray-700">
            {clientList
              .filter(client => showCompleted || !client.completed)
              .map((client, index) => (
                <li
                  key={index}
                  onClick={() => selectClient(client)}
                  className={`flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                    currentClient && currentClient.name === client.name ? 'bg-gray-100' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className={`flex-grow ${client.completed ? 'line-through' : ''}`}>
                    {client.name}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
      </div>
      {/* Bottom card for additional buttons */}
      <Card className="max-w-md mx-auto" style={{ width: '200px', position: 'fixed', right: '0', bottom: '0' }}>
        <CardHeader />
        <CardContent className="flex flex-col items-center space-y-2">
          <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="py-2 text-sm text-gray-700 bg-white"
            >
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </button>
                    {/* Button to open active client URL in a new tab */}
                    <Button
              onClick={() => window.open(currentClient?.workbookURL, '_blank')}
              variant="outline"
              className="p-2 border border-gray-300 rounded"
              style={{ flexGrow: 1, fontSize: "11px" }}
            >
              Open {currentClient.name} Workbook
          </Button>
          {/* <Button onClick={testCSVParse} variant="outline">Parse CSV</Button> */}
  
          <Button 
            onClick={() => triggerFinalization(showH2 ? "h2" : "h1")} 
            variant="outline"
          >
            Write To Workbook {showH2 ? "h2" : ""}
          </Button>
          <Button onClick={() => markClientDone()} variant="outline">{currentClient.completed ? 'Un-Mark Done' : 'Mark Done'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
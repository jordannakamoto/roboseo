'use client';
// TODO
// Flash effect on field when url changes

import { ArrowLeftRight, CheckCircle, Globe, Link, PenLine } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
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
  const [masterSheetURL, setMasterSheetURL] = useState('');
  const [isRefresh, setIsRefresh] = useState('initial'); // Default state

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
      if (storedMSheet) setMasterSheetURL(JSON.parse(storedMSheet));

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
    const sheetId = extractSheetIdFromUrl(masterSheetURL);
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
        localStorage.setItem('masterSheetURL', JSON.stringify(masterSheetURL));
        localStorage.setItem('clients', JSON.stringify(clientArray));
        setIsLoading(false);
        await loadFrogScraper(clientArray);
      } catch (error) {
        console.error('Failed to load sheet:', error);
        setIsLoading(false);
      }
    } else {
      console.log("Master sheet already loaded or wrong url");
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

        // .. Toggle visibility first to get the right title set
        const visibilityResponse = await fetch('/api/get-client-toggle-visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, currentClient: currentClient, 
            action: "initialize" }),
        });
        if (!visibilityResponse.ok) throw new Error(`HTTP error! Status: ${visibilityResponse.status}`);

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

    // Scroll to the top of the window
  window.scrollTo(0, 0);
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
  
      // Merge the Data with the Frog API results
      const mergedData = pages.map(page => {
        const urlPath = page.url.replace(/https:\/\/[^/]+/, ''); // Remove the root URL
        let pageName = ''; // Initialize an empty string to build the page name
      
        // Generate Page Name from URL
        if (!urlPath || urlPath === '/') {
          pageName = 'Home Page'; // Assign "Home Page" to the root URL
        } else {
          const pathSegments = urlPath.split('/').filter(Boolean);
          let previousPageName = ''; // To keep track of the previous valid segment
  
          pathSegments.forEach(segment => {
            const formattedSegment = segment
              .split('.')[0] // Remove file extension if present
              .split('-') // Split by hyphen
              .map(part => part.charAt(0).toUpperCase() + part.slice(1)) // Capitalize each part
              .join(' '); // Join parts with a space
  
            previousPageName = pageName;
            pageName = formattedSegment;
          });
  
          if (!isNaN(pageName)) {
            pageName = previousPageName;
          }
        }
      
        return {
          ...result.find(r => r.url === page.url),
          ...page,
          name: pageName, // Set the name property with the final page name
        };
      });
  
      // Insert API Call to Fetch OnPage Data
      try {
        const onPageResponse = await fetch('/api/load-from-frog-onpage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: currClientHomepage, pages: mergedData }), // Send the merged data
        });

        let finalData;

        if (!onPageResponse.ok) {
          console.error('Error fetching OnPage data');
          finalData = mergedData; // Use mergedData directly if the OnPage API call fails
        } else {
          const { processedPages } = await onPageResponse.json() || { processedPages: [] };

          // Merge the OnPage data back into the mergedData
          finalData = mergedData.map(page => {
            const matchedOnPage = processedPages.find(p => p.url === page.url);
            return matchedOnPage ? { ...page, ...matchedOnPage } : page;
          });
        }

        setPages(finalData);

      } catch (error) {
        console.error('Failed to process OnPage data:', error);
        setPages(mergedData); // Ensure that mergedData is used if there's an exception
      }

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

  // end testscvParse

    // -- Toggle IsRefresh
    // Function to toggle sheet visibility
    const toggleIsRefresh = async () => {
      setIsLoading(true);
      setLoadingMessage(`Toggling Visible Sheets to ${isRefresh === 'refresh' ? 'Initial' : 'Refresh'}`);
      try {
        const response = await fetch('/api/get-client-toggle-visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens,
            spreadsheetId: extractSheetIdFromUrl(sheetUrl),
            currentClient: {isRefresh},
            action: "toggle"
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to toggle sheet visibility');
        }
  
        const result = await response.json();
        setIsRefresh(result.isRefresh); // Update local state with the new value
        // console.log('Sheet visibility toggled:', result);
        setIsLoading(false);
      } catch (error) {
        console.error('Error toggling sheet visibility:', error);
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
        currentClientName: currentClient.name
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
  const loadFrogScraper = async (clients) => {
    setIsLoading(true);
    setPages([]);
    setAltImages([]);
    setSheetTitles([]);
    setLoadingMessage("Getting all clients, homepages, and workbookURLs from master sheet.\nCheck HomepageList.txt when done");
  
    const modifiedClientList = clients.map(client => {
      const workbookSheetId = extractSheetIdFromUrl(client.workbookURL);
      if (!workbookSheetId) {
        alert(`Error loading sheetID for client, ${client.name}`);
        return null;
      }
      return { ...client, workbookSheetId };
    }).filter(Boolean);
  
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
  
        if (res.failedClients.length > 0) {
          console.log("Failed clients:", res.failedClients);
        }
  
        setClientList(resultArray);
        setAllClients(resultArray);
        localStorage.setItem('clients', JSON.stringify(resultArray));
        console.log("Clients loaded into screaming frog for scraping");
      } catch (error) {
        console.error('Failed to process files:', error);
      }
    }
  
    setIsLoading(false);
    await fetch('/api/open-homepagelist', {
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
    <div className="relative" style={{zIndex:'500'}}>
{isLoading && (
  <div className="fixed top-0 left-0 h-1" style={{ width: 'calc(100vw - 180px)', zIndex: 9999 }}>
    <div
      className="h-full bg-blue-400 animate-grow"
      style={{ animationDuration: '3s' }}
    />
  </div>
)}
{isLoading && loadingMessage && (
  <div
    className="fixed top-2 text-xs text-gray-700 bg-white bg-opacity-80 px-2 py-1 rounded shadow"
    style={{ zIndex: 1001, right: '200px' }}
  >
    {loadingMessage}
  </div>
)}
    <div style = {{position:'absolute', left:'34px', top: '20px', width:'500px'}}>
      <h1 style= {{fontWeight:'bold', }}>{currentClient.name}</h1>
    </div>
    <div className="fixed top-0 z-10 border-b border-gray-200" style={{ right: '-20px', width: '200px', background: 'rgba(255, 255, 255, 1.0)' }}>
      <div style= {{border:'solid 1px rgb(231, 231, 231)', width: '180px',}} className="flex justify-between items-center" >
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
          <Button onClick={login} className="bg-white border-right border-gray-300 hover:bg-gray-100 rounded-none">
            <FcGoogle size={15} />
          </Button>
        </div>
        {/* Toggle Master Sheet Input */}

        <Button
  style={{
    color: 'grey',
    backgroundColor: isMasterSheetVisible ? '#deeff5' : 'white',
    width:'52px'
  }}
  onClick={toggleMasterSheetVisibility}
  className="bg-white border border-gray-100 hover:bg-gray-100 rounded-none p-2"
>
  <Link className="w-4 h-4" />
</Button>

{/* Conditionally rendered input + load button */}
<div
  className="absolute z-50 flex gap-1 shadow-sm bg-white p-5"
  style={{
    top: '40px',
    right: '30px',
    opacity: isMasterSheetVisible ? 1 : 0,
    visibility: isMasterSheetVisible ? 'visible' : 'hidden',
    pointerEvents: isMasterSheetVisible ? 'auto' : 'none',
    transition: 'opacity 0.2s ease'
  }}
>
  <input
    id="master-sheet-url"
    value={masterSheetURL}
    className="p-2 rounded text-xs"
    onChange={(e) => setMasterSheetURL(e.target.value)}
    placeholder="Master sheet URL"
    style={{ width: '400px' }}
  />
  <Button
    onClick={handleLoadSheet}
    className="bg-slate-100 border-none hover:bg-slate-300 text-gray-700 text-xs px-3 py-2"
  >
    Load
  </Button>
</div>
        <Button style={{color:'grey'}} onClick={runScraper} className="bg-white border-none hover:bg-gray-100 rounded-none">
          Scrape
        </Button>
         {/* Right Sidebar */}
        <div className="fixed top-10 right-0 z-10 bg-white " style={{ paddingTop: '20px', paddingBottom: '20px', borderLeft:'solid 1px rgb(231, 231, 231)', background: '#f9f9f9',borderRadius: '0', height: "70vh", width: "180px", overflow: "scroll" }}>
          <ul className="text-sm text-gray-700">
            {clientList
              .filter(client => showCompleted || !client.completed)
              .map((client, index) => (
<li
  key={index}
  onClick={() => selectClient(client)}
  className={`flex items-center mx-2 my-1 px-4 py-2 cursor-pointer rounded-md hover:bg-gray-200 ${
    currentClient && currentClient.name === client.name
      ? 'bg-gray-200 rounded-md'
      : ''
  }`}
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
      <Card className="max-w-md mx-auto" style={{ background: '#f9f9f9',width: '180px', border: 'none',borderLeft:'solid 1px rgb(231, 231, 231)', borderRadius: '0',position: 'fixed', right: '0', bottom: '0', paddingBottom: '30px'}}>
        <CardHeader />
        <CardContent className="flex p-1 flex-col items-center gap-1 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(prev => !prev)}
            className="w-full text-gray-700 text-[0.7rem]"
          >
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </Button>

          <Button
            onClick={() => window.open(currentClient?.workbookURL, '_blank')}
            variant="outline"
            className="w-full h-10 text-[0.8rem] flex items-center justify-start gap-2 p-2"
          >
            <Globe size={16} /> Open Workbook
          </Button>

          {/* New Button to Toggle Sheet Visibility */}
          <Button
            onClick={toggleIsRefresh}
            variant="outline"
            className="w-full h-10 text-[0.8rem] flex items-center justify-start gap-2 p-2"
          >
                        <ArrowLeftRight size={16} /> Toggle {isRefresh.charAt(0).toUpperCase() + isRefresh.slice(1)}
          </Button>

          <Button
            onClick={() => triggerFinalization(showH2 ? "h2" : "h1")}
            variant="outline"
            className="w-full h-10 text-[0.8rem] flex items-center justify-start gap-2 p-2"
          >
            <PenLine size={16} /> Write To Workbook
          </Button>

          <Button
            onClick={() => markClientDone()}
            variant="outline"
            className="w-full h-10 text-[0.8rem] flex items-center justify-start gap-2 p-2"
          >
            <CheckCircle size={16} />
            {currentClient.completed ? 'Un-Mark Done' : 'Mark Done'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
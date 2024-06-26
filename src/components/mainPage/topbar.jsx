'use client';
// TODO
// Flash effect on field when url changes

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState } from 'react';

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

export default function TopBar() {
  const [tokens, setTokens] = useState(null);
  const [clientList, setClientList] = useState([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const { pages, setPages, sheetTitles, sheetUrl, altImages, setAltImages, setSheetTitles, setSheetUrl } = useClientWebpage();
  const { currentClient, setCurrentClient, setAllClients } = useClientsContext();
  // - Loading Modal
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Load initial data from local storage when component mounts
  useEffect(() => {
    try {
      const storedTokens = localStorage.getItem('tokens');
      if (storedTokens) setTokens(JSON.parse(storedTokens));
2
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
    const range = `${test_date}!C:G`;

    if (sheetId && tokens) {
      try {
        setIsLoading(true);
        setLoadingMessage('Loading client list...');
        const response = await fetch('/api/google_sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, range }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const res = await response.json();
        const data = res.response.data.values.slice(1).filter(row => row[0] && row.length > 2);
        const clientArray = data.map(row => ({ name: row[0], workbookURL: row[4] })).filter(cl => cl.workbookURL.length >= 12);

        setClientList(clientArray);
        localStorage.setItem('masterSheetURL', JSON.stringify(url));
        localStorage.setItem('clients', JSON.stringify(clientArray));
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load sheet:', error);
        setIsLoading(false);
      }
    } else {
      console.error("Error: either URL is missing, or user is not authenticated");
    }
  };

  // Load selected client's data
  const handleLoadClient = async (client) => {
    const url = client.workbookURL;
    const sheetId = extractSheetIdFromUrl(url);
    setSheetUrl(url);

    if (sheetId && tokens) {
      try {
        setIsLoading(true);
        setLoadingMessage('Loading client...');
        // Fetch sheet titles
        const titlesResponse = await fetch('/api/get-sheet-titles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId }),
        });
        if (!titlesResponse.ok) throw new Error(`HTTP error! Status: ${titlesResponse.status}`);

        const titlesRes = await titlesResponse.json();
        const titles = titlesRes.visibleSheetTitles;
        setSheetTitles(titles);

        // Find Title Tag sheet and fetch webpage data
        const titleTagSheet = titles.find(title => title.startsWith("Title Tag"));
        if (!titleTagSheet) throw new Error("Title Tag sheet not found.");

        const webpagesResponse = await fetch('/api/get-client-webpages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, sheetName: titleTagSheet }),
        });
        if (!webpagesResponse.ok) throw new Error(`HTTP error! Status: ${webpagesResponse.status}`);

        const webpagesRes = await webpagesResponse.json();
        const webPages = webpagesRes.webpages;

        // Find Keyword sheet and fetch keyword data
        const keywordSheet = titles.find(title => title.startsWith("Keyword"));
        if (!keywordSheet) throw new Error("Keyword sheet not found.");

        const keywordsResponse = await fetch('/api/get-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens, spreadsheetId: sheetId, sheetName: keywordSheet, pages: webPages }),
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
      console.error("Error: either URL is missing, or user is not authenticated");
    }
  };

  // Handle client selection from the list
  const selectClient = (client) => {
    setCurrentClient(client);
    localStorage.setItem('currentClient', JSON.stringify(client));
    document.getElementById('active-client-url').value = client.workbookURL;
  };

  // When currentClient changes, load the client data
  useEffect(() => {
    if (currentClient) {
      handleLoadClient(currentClient);
    }
  }, [currentClient]);

  // When currentClient and pages change, parse the CSV
  useEffect(() => {
    if (currentClient && pages.length > 0) {
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

    try {
      // Load data from Frog CSVs
      const response = await fetch('/api/load-from-frog-csvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: currClientHomepage, webpages: pages }),
      });

      if (!response.ok) throw new Error('Error processing files');

      const { result } = await response.json();
      const mergedData = pages.map(page => ({
        ...result.find(r => r.url === page.url),
        ...page,
        name: page.name,
      }));
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

  // Write data to the workbook
  const writeToWorkbook = async (mode) => {
    try {
      const response = await fetch('/api/write-to-workbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: extractSheetIdFromUrl(sheetUrl),
          sheetTitles,
          webpages: pages,
          tokens,
          hMode: mode,
        }),
      });

      if (!response.ok) throw new Error('Error writing to workbook');
      console.log(`Changes written to workbook ${sheetUrl}`);
    } catch (error) {
      console.error('Failed to write to workbook:', error);
    }
  };

  // Load Frog scraper with client data
  const loadFrogScraper = async () => {
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
  };

  // *** UI ************************************************* //
  const toggleClientCompletion = (clientIndex) => {
    const updatedClientList = clientList.map((client, index) => 
      index === clientIndex ? { ...client, completed: !client.completed } : client
    );
    setClientList(updatedClientList);
    localStorage.setItem('clients', JSON.stringify(updatedClientList));
  };

  // ******************************************************** //

  return (
    <>
    <LoadingModal isVisible={isLoading} message={loadingMessage} />
    <div className="fixed top-0 left-0 right-0 z-10 border-b border-gray-200" style={{ background: 'rgba(255, 255, 255, 1.0)' }}>
      <div className="flex justify-between items-center">
        <div className="flex flex-grow items-center space-x-4">
          <span style={{ marginLeft: "20px" }}>{currentClient.name}</span>
          <input
            id="active-client-url"
            onChange={handleLoadClient}
            className="p-2 border border-gray-300 rounded"
            placeholder="Active Client"
            style={{ flexGrow: 1, fontSize: "11px" }}
          />
          <input
            id="master-sheet-url"
            onChange={handleLoadSheet}
            className="p-2 border border-gray-300 rounded"
            placeholder="Master sheet URL"
            style={{ flexGrow: 1, fontSize: "11px" }}
          />
          <Button onClick={login} style={{ opacity: tokens ? 0.5 : 1, fontSize: "11px" }}>
            {tokens ? 'Signed In' : <><FcGoogle size={25} /> Sign in</>}
          </Button>
        </div>
        <div className="fixed top-10 right-0 z-10 mt-1 py-1 bg-white border border-gray-300 rounded" style={{ height: "70vh", width: "230px", overflow: "scroll" }}>
          <ul className="text-sm text-gray-700">
            {clientList
              .filter(client => showCompleted || !client.completed)
              .map((client, index) => (
                <li key={index} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={client.completed || false}
                    onChange={() => toggleClientCompletion(index)}
                    className="mr-2"
                  />
                  <span
                    onClick={() => selectClient(client)}
                    className={`flex-grow ${client.completed ? 'line-through' : ''}`}
                  >
                    {client.name}
                  </span>
                </li>
              ))}
          </ul>
          <button
            onClick={() => setShowCompleted(prev => !prev)}
            className="absolute bottom-0 left-0 right-0 py-2 text-sm text-gray-700"
          >
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </button>
        </div>
        <button onClick={loadFrogScraper} className="block h-10 w-20 rounded-sm border border-gray-300 bg-white p-2">
          FeedFrog
        </button>
      </div>
      </div>
      {/* Bottom card for additional buttons */}
      <Card className="max-w-md mx-auto" style={{ position: 'fixed', right: '0', bottom: '0' }}>
        <CardHeader />
        <CardContent className="flex flex-col items-center space-y-2">
          {/* <Button onClick={testCSVParse} variant="outline">Parse CSV</Button> */}
          <Button onClick={() => writeToWorkbook("h1")} variant="outline">Write To Workbook h1</Button>
          <Button onClick={() => writeToWorkbook("h2")} variant="outline">Write To Workbook h2</Button>
          <Button onClick={() => writeToWorkbook("done")} variant="outline">Mark Done</Button>
        </CardContent>
      </Card>
    </>
  );
}
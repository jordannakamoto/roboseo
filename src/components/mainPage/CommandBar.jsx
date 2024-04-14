'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
// import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import React, {useEffect, useState} from 'react'

import { Button } from "@/components/ui/button"
import { useClientWebpage } from '@/contexts/ClientWebpageContext';
import { useClientsContext } from "@/contexts/ClientsContext";

//Helper
const extractSheetIdFromUrl = (url) => {
  const matches = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
  return matches ? matches[1] : null;
};

export default function TestBar() {
  const { pages, setPages, sheetTitles, sheetUrl, altImages, setAltImages } = useClientWebpage();
  const {allClients, currentClient, setAllClients, setCurrentClient} = useClientsContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [tokens, setTokens] = useState(null);

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
    }
    catch (error) {
        console.error("Error loading tokens from local storage:", error);
        // Handle error or clear corrupted local storage item if necessary
        localStorage.removeItem('tokens');
      }
  }, []);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const renameFrogFolders = async () => {
    try {
      const response = await fetch('/api/rename-frog-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send any necessary data
      });
  
      if (!response.ok) {
        throw new Error('Error processing files');
      }
  
      // Handle response data
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Failed to process files:', error);
    }
  };

  // I'm gonna have to use a context provider
  const testCSVParse = async () => {
    let currClientHomepage = currentClient.homepage;
    currClientHomepage = currClientHomepage.replace(/^https?:\/\//, '');

    try {
      const response = await fetch('/api/load-from-frog-csvs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dir: currClientHomepage,
          webpages: pages // Add the webpages array here
        })
      });
  
      if (!response.ok) {
        throw new Error('Error processing files');
      }
  
      // Handle response data
      const { result } = await response.json();

      // Assuming 'result' is the array of objects with the scraped data
      // Make sure to include the 'name' field when mapping over your data
      let mergedData = pages.map(page => {
        const matchingResult = result.find(r => r.url === page.url);
        return {
          ...matchingResult, // This spreads all properties from the matching result
          ...page,           // This spreads all properties from the page, potentially overwriting duplicates from result
          name: page.name    // Ensure the 'name' field is explicitly set from the page object
        };
      });

      setPages(mergedData);
      console.log(pages);
    } catch (error) {
      console.error('Failed to process files:', error);
    }
  };

  const logPages = () => {
    console.log(pages);
  }

  // Write to workbook
  const writeToWorkbook = async (mode) => {
    try {
      if(mode == "h2"){
        alert("h2 Mode selected");
      }
      const response = await fetch('/api/write-to-workbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: extractSheetIdFromUrl(sheetUrl),      // Sheet URL
          sheetTitles: sheetTitles, // Sheet Titles
          webpages: pages,         // Webpages
          tokens,
          hMode: mode === "h1" ? "h1" : "h2" // Specify h1 or h2 for hMode based on the argument provided.
        })
      });
      
  
      if (!response.ok) {
        throw new Error('Error processing files');
      }
      // DONE WRITING CHANGES
      console.log("Changes written to workbook " + sheetUrl);

    } catch (error) {
      console.error('Failed to process files:', error);
    }
  };

  // Populate Alt Images
  const populateAltImages = async () => {
    try {
      const response = await fetch('/api/populate-alt-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dir: "unionknoxville",
        })
      });
  
      if (!response.ok) {
        throw new Error('Error processing files');
      }
      const { result } = await response.json();
      setAltImages(result);
      // DONE POPULATING
      console.log("Populated Alt Images ");

    } catch (error) {
      console.error('Failed to process files:', error);
    }
  };

  

  return (
    (
      <Card className="max-w-md mx-auto" style={{position: 'fixed', right: '0', bottom: '0'}}>
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          {/* <Button onClick={toggleMinimize} variant="ghost">
            {isMinimized ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </Button> */}
        </div>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="flex flex-col items-center space-y-2">
          <Button onClick={testCSVParse} variant="outline">Parse CSV</Button>
          <Button onClick={() => writeToWorkbook("h1")} variant="outline">Write To Workbook h1</Button>
          <Button onClick={() => writeToWorkbook("h2")} variant="outline">Write To Workbook h2</Button>
          {/* <Button onClick={populateAltImages} variant="outline">Populate Alt Images</Button> */}
        </CardContent>
      )}
    </Card>)
  );
}

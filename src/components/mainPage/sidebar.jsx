'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { useClientWebpage } from '@/contexts/ClientWebpageContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function Sidebar () {
    const [tokens, setTokens] = useState(null);
    const [clientList, setClientList] = useState([]);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true); // State to control visibility
    const { setPages, setSheetTitles, setSheetUrl } = useClientWebpage(); // Use the hook at the top level

    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    // Toggles the visibility of the dropdown
    const toggleDropdown = () => {
      setIsDropdownVisible(!isDropdownVisible);
    };
    
    // Load Stored Tokens
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
              // Parse the JSON string to an array
              const clientArray = JSON.parse(storedClients);
              // Update the clientList state with the retrieved array
              setClientList(clientArray);
          } catch (error) {
              console.error("Error parsing clientNames from local storage:", error);
              // Handle parsing error (e.g., corrupted data)
          }
      }
    }, []);

    useEffect(() => {
      // Event handler to capture key combinations
      const handleKeyDown = (event) => {
          if (event.metaKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
            setIsSidebarVisible(!isSidebarVisible);
            console.log(isSidebarVisible);
          }
      };

      // Add event listener for keyboard events
      document.addEventListener('keydown', handleKeyDown);

      // Cleanup function to remove the event listener
      return () => {
          document.removeEventListener('keydown', handleKeyDown);
      };
  }, [isSidebarVisible]);

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

    const test = async () => {
      const response = await axios.post('http://localhost:3000/api/image-to-text');
    }

    // LOAD CLIENT DATA INTO PROGRAM MEMORY
    const handleLoadClient = async () => {
      const url = document.getElementById('active-client-url').value;
      const sheetId = extractSheetIdFromUrl(url);

      if (sheetId && tokens) {
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

          // now that we have sheetTitles...
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
            setPages(webPages);
            setSheetTitles(sheetTitles);
            setSheetUrl(url);
            // Now we have a list of webpages
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

    // LOAD CLIENT LIST
    const handleLoadSheet = async () => {
      const url = document.getElementById('master-sheet-url').value;
      const sheetId = extractSheetIdFromUrl(url);

      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      // TODO date corresponding to sheet name...
      const test_date = 'January 2023'; //'${monthNames[now.getMonth()]} 2023'
      const range = `${test_date}!C:G`;

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

          let clients = data.map(row => ({
            name: row[0],
            workbookURL: row[4]
          }));

          setClientList(clients);
          localStorage.setItem('masterSheetURL', JSON.stringify(url));
          localStorage.setItem('clients', JSON.stringify(clients));

        } catch (error) {
          console.error('Failed to load sheet:', error);
        }
      } else {
        console.log("Handle error: either URL is missing, or user is not authenticated");
      }
    };

    const extractSheetIdFromUrl = (url) => {
      const matches = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
      return matches ? matches[1] : null;
    };

    return (
        <div className={`absolute top-0 left-0 right-0 z-10 border-b border-gray-200 ${isSidebarVisible ? '' : 'hidden'}`} style={{ background: 'rgba(255, 255, 255, 0.7)'}}>
          <div className="flex justify-between items-center">
            <div className="flex flex-grow items-center space-x-4">
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
            <div className="relative">
              <button onClick={toggleDropdown} className="block h-10 w-full rounded-sm border border-gray-300 bg-white p-2">
                Clients
              </button>
              {isDropdownVisible && (
                <div className="absolute right-0 z-10 mt-1 w-48 py-1 bg-white border border-gray-300 rounded shadow-lg">
                  <ul className="text-sm text-gray-700">
                    {clientList.map((item, index) => (
                        <li key={index} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                            {item.name}
                        </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

    );
}

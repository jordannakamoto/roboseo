'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { useGoogleLogin } from '@react-oauth/google';

export default function Sidebar () {
    const [tokens, setTokens] = useState(null);
    const [clientList, setClientList] = useState([]);

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
      }
      // LOAD CLIENT LIST
      try {
        const storedTokens = localStorage.getItem('client');
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
      // LOAD CLIENT LIST
      const storedClientNames = localStorage.getItem('clientNames');
      if (storedClientNames) {
          try {
              // Parse the JSON string to an array
              const clientNamesArray = JSON.parse(storedClientNames);
              // Update the clientList state with the retrieved array
              setClientList(clientNamesArray);
          } catch (error) {
              console.error("Error parsing clientNames from local storage:", error);
              // Handle parsing error (e.g., corrupted data)
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

    const test = async () => {
      const response = await axios.post('http://localhost:3000/api/image-to-text');
    }
  

    const handleLoadSheet = async () => {
      const url = document.getElementById('master-sheet-url').value;
      const sheetId = extractSheetIdFromUrl(url);

      // TODO date corresponding to sheet name...
      const test_date = 'January 2023';
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
          console.log(res.response.data.values)
          let data = res.response.data.values.slice(1) // Skip the first row
          .filter(row => row[0] && row.length > 2 ) // Filter out empty rows or rows that have notes in them
          
          const clientNames = data.map(row => row[0]);

          setClientList(clientNames);
          localStorage.setItem('masterSheetURL', JSON.stringify(url));
          localStorage.setItem('clientNames', JSON.stringify(clientNames));

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
        <div className="md:col-span-1 border-r border-gray-200 mr-10 p-5" style={{ background: 'rgba(255, 255, 255, 0.3)', width: '180px' }}>
            <ul className="list-inside" style={{ fontSize: "13px" }}>
              {clientList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <div id="userConfig" className="mt-20">
            <input id="active-client" className="w-full p-2 border border-gray-300 rounded mb-2" placeholder="Active Client"></input>
            <input onChange={handleLoadSheet} id="master-sheet-url" className="w-full p-2 border border-gray-300 rounded mb-2" placeholder="mastersheet url" style={{fontSize:"11px"}}></input>
                {/* Conditionally render button text and style based on `tokens` state */}
                <Button onClick={!tokens ? login : undefined} disabled={!!tokens} style={{ opacity: tokens ? 0.5 : 1, cursor: tokens ? 'not-allowed' : 'pointer' }}>
                    {tokens ? 'Signed In' : <><FcGoogle size={25} /> Sign in</>}
                </Button>
            </div>
        </div>
    );
}

'use client'

import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react'

export default function Sidebar () {
    const [accessToken, setAccessToken] = useState(null);

    const handleLoginSuccess = (response) => {
      setAccessToken(response.accessToken);
    };

    const handleLoadSheet = async () => {
      const url = document.getElementById('master-sheet-url').value;
      const sheetId = extractSheetIdFromUrl(url);
      const test_my = 'January 2023';
      const range = `${test_my}!C:G`;
  
      if (sheetId && accessToken) {
        try {
          const response = await fetch('/api/google_sheets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accessToken,
              spreadsheetId: sheetId,
              range,
            }),
          });
  
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
  
          const data = await response.json();
          console.log(data); // Process data
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
        <div className="md:col-span-1 bg-white border-r border-gray-200 mr-10 p-5" style={{ width: '160px' }}>
            <ul className="list-inside" style={{ fontSize: "13px" }}>
                <li>Sidebar 1</li>
                <li>Item 2</li>
                {/* Add more list items as needed */}
            </ul>
            <div id="userConfig" className="mt-20">
                <input id="master-sheet-url" className="w-full p-2 border border-gray-300 rounded" placeholder="mastersheet url" style={{fontSize:"11px"}}></input>
                <GoogleLogin
                    onSuccess={credentialResponse => {
                        console.log(credentialResponse);
                    }}
                    onError={() => {
                        console.log('Login Failed');
                    }}
                    useOneTap
                    />
            </div>
        </div>
    );
}

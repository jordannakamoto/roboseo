'use client'

import React, { useState } from 'react';

function ImageList() {
  const [urls, setUrls] = useState(""); // State to store the pasted URLs as a string
  const urlArray = urls.split('\n'); // Split the string into an array of URLs
  const [captions, setCaptions] = useState(new Array(urlArray.length).fill("")); // State to store captions

  const handleCaptionChange = (index, caption) => {
    const updatedCaptions = [...captions];
    updatedCaptions[index] = caption;
    setCaptions(updatedCaptions);
  };

  return (
    <div className="flex flex-col h-full">
      <textarea
        id="altPasteArea"
        onChange={(e) => setUrls(e.target.value)} // Update the URLs when the textarea changes
        value={urls}
      ></textarea>
      <main className="flex-1 overflow-y-auto p-4 pt-20">
        <table className="w-full max-w-2xl mx-auto">
          <thead>
            <tr>
              <th>Image</th>
              <th>Caption</th>
            </tr>
          </thead>
          <tbody>
            {urlArray.map((url, index) => (
              <tr key={index}>
                <td>
                  <img
                    alt={`Image ${index + 1}`}
                    className="aspect-square object-cover"
                    height={200}
                    src={url}
                    width={200}
                  />
                </td>
                <td>
                  <textarea
                    className="w-full h-20 p-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none dark:border-gray-800"
                    value={captions[index]}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                  ></textarea>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default ImageList;

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context with initial values and setter functions placeholders
const ClientWebpageContext = createContext({
  clientName: '',
  clientUrl: '',
  sheetTitles: [],
  pages: [], // Added pages array
  sheetUrl: '',
  altImages: [],
  altImagesProcessed: [],
  setClientName: () => {},
  setClientUrl: () => {},
  setPages: () => {}, // Setter function for pages
  setSheetTitles: () => {},
  setSheetUrl: () => {},
  setAltImages: () => {},
  setAltImagesProcessed: () => {}
});

// Hook to use the context
export const useClientWebpage = () => useContext(ClientWebpageContext);

// Provider component
export const ClientWebpageProvider = ({ children }) => {
  const [clientName, setClientName] = useState('');
  const [clientUrl, setClientUrl] = useState('');
  const [sheetTitles, setSheetTitles] = useState([]);
  const [pages, setPages] = useState([]); // State for pages
  const [sheetUrl, setSheetUrl] = useState('');
  const [showH2, setShowH2] = useState(false);
  const [altImages, setAltImages] = useState([]);
  const [altImagesProcessed, setAltImagesProcessed] = useState([]);
  const [finalizationState, setFinalizationState] = useState({
    status: "idle", // Can be "idle", "finalize", or "write"
    altTagsReady: false, // Tracks if AltTagsPanel is ready
    metaTagsReady: false, // Tracks if TableView is ready
  });

  // .. Logging state changes...
  useEffect(() => {
    console.log('Client webpage data changed:', { clientName, clientUrl, pages });
  }, [clientName, pages]); // Dependency array

  useEffect(() => {
    console.log('Processed Alt Images changed:', { altImagesProcessed });
  }, [altImagesProcessed]); // Dependency array

  useEffect(() => {
    console.log('Finalization State changed:', { finalizationState });
  }, [finalizationState]); // Dependency array

  // Context value now includes setter functions and the pages array
  const value = {
    clientName,
    clientUrl,
    pages,
    sheetTitles,
    sheetUrl,
    altImages,
    altImagesProcessed,
    finalizationState,
    showH2,
    setClientName,
    setClientUrl,
    setPages,
    setSheetTitles,
    setSheetUrl,
    setAltImages,
    setAltImagesProcessed,
    setShowH2,
    setFinalizationState,
  };

  return (
    <ClientWebpageContext.Provider value={value}>
      {children}
    </ClientWebpageContext.Provider>
  );
};

  // // Example of a custom setter function to add a page to the pages array
  // const addPage = (page) => {
  //   setPages((currentPages) => [...currentPages, page]);
  // };

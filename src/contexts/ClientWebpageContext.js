'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context with initial values and setter functions placeholders
const ClientWebpageContext = createContext({
  clientName: '',
  title: '',
  h1: '',
  metadata: {},
  pages: [], // Added pages array
  setClientName: () => {},
  setTitle: () => {},
  setH1: () => {},
  setMetadata: () => {},
  setPages: () => {}, // Setter function for pages
});

// Hook to use the context
export const useClientWebpage = () => useContext(ClientWebpageContext);

// Provider component
export const ClientWebpageProvider = ({ children }) => {
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [h1, setH1] = useState('');
  const [metadata, setMetadata] = useState({});
  const [pages, setPages] = useState([]); // State for pages

  // // Example of a custom setter function to add a page to the pages array
  // const addPage = (page) => {
  //   setPages((currentPages) => [...currentPages, page]);
  // };

  // Logging state changes for demonstration
  useEffect(() => {
    console.log('Client webpage data changed:', { clientName, title, h1, metadata, pages });
  }, [clientName, title, h1, metadata, pages]); // Dependency array

  // Context value now includes setter functions and the pages array
  const value = {
    clientName,
    title,
    h1,
    metadata,
    pages,
    setClientName,
    setTitle,
    setH1,
    setMetadata,
    setPages
  };

  return (
    <ClientWebpageContext.Provider value={value}>
      {children}
    </ClientWebpageContext.Provider>
  );
};

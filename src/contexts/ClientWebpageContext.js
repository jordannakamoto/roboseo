'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context with initial values and setter functions placeholders
const ClientWebpageContext = createContext({
  clientName: '',
  pages: [], // Added pages array
  setClientName: () => {},
  setPages: () => {}, // Setter function for pages
});

// Hook to use the context
export const useClientWebpage = () => useContext(ClientWebpageContext);

// Provider component
export const ClientWebpageProvider = ({ children }) => {
  const [clientName, setClientName] = useState('');
  const [pages, setPages] = useState([]); // State for pages

  // // Example of a custom setter function to add a page to the pages array
  // const addPage = (page) => {
  //   setPages((currentPages) => [...currentPages, page]);
  // };

  // Logging state changes for demonstration
  useEffect(() => {
    console.log('Client webpage data changed:', { clientName, pages });
  }, [clientName, pages]); // Dependency array

  // Context value now includes setter functions and the pages array
  const value = {
    clientName,
    pages,
    setClientName,
    setPages
  };

  return (
    <ClientWebpageContext.Provider value={value}>
      {children}
    </ClientWebpageContext.Provider>
  );
};

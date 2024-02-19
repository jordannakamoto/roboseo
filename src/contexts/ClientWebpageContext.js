'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const ClientWebpageContext = createContext({
  clientWebpageData: {}, // Provide a default shape for the context
  setClientWebpageData: () => {} // Provide a noop function
});

// Hook to use the context
export const useClientWebpage = () => useContext(ClientWebpageContext);

// Provider component
export const ClientWebpageProvider = ({ children }) => {
  const [clientWebpageData, setClientWebpageData] = useState({});

  // Use useEffect to log the state variable when it changes
  useEffect(() => {
    console.log('clientWebpageData changed:', clientWebpageData);
  }, [clientWebpageData]); // Dependency array, re-run the effect when clientWebpageData changes

  return (
    <ClientWebpageContext.Provider value={{ clientWebpageData, setClientWebpageData }}>
      {children}
    </ClientWebpageContext.Provider>
  );
};

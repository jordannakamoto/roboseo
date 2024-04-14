'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context with initial values and setter functions placeholders
const ClientsContext = createContext({
    allClients: [],
    currentClient: {},
});

// Hook to use the context
export const useClientsContext = () => useContext(ClientsContext);

// Provider component
export const ClientsContextProvider = ({ children }) => {
  const [allClients, setAllClients] = useState([]);
  const [currentClient, setCurrentClient] = useState({});

  // Logging state changes...
  useEffect(() => {
    console.log('All Clients List Changed:', { allClients });
  }, [allClients]); // Dependency array
  useEffect(() => {
    console.log('Current Client Changed:', { currentClient });
  }, [currentClient]); // Dependency array

  // Context value now includes setter functions and the pages array
  const value = {
    allClients,
    currentClient,
    setAllClients,
    setCurrentClient
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};

  // // Example of a custom setter function to add a page to the pages array
  // const addPage = (page) => {
  //   setPages((currentPages) => [...currentPages, page]);
  // };

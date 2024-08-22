"use client";

import React, { useEffect, useState } from "react";

import AltTagsPanel from "@/components/mainPage/alt-tags-panel";
import OnPagePanel from "@/components/mainPage/on-page-panel";
import TableView from "@/components/mainPage/meta-tags-panel";
import TopBar from "@/components/mainPage/topbar";
import { useClientWebpage } from "@/contexts/ClientWebpageContext";

export default function Component() {
  const { pages, altImages, altImagesProcessed } = useClientWebpage();

  const [tableViewFinalState, setTableViewFinalState] = useState(() => () => {});
  const [altTagsPanelFinalState, setAltTagsPanelFinalState] = useState(() => () => {});

  useEffect(() => {
    // Prevent back navigation
    const handlePopState = (event) => {
      event.preventDefault();
      window.history.pushState(null, null, window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, null, window.location.pathname);

    // Confirmation on refresh or close
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ''; // Show the confirmation dialog
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handlePrepareData = () => {
    return new Promise((resolve) => {
      console.log("finalizing data for write");
      
      if (tableViewFinalState && typeof tableViewFinalState === 'function') {
        tableViewFinalState();
      }
      
      if (altTagsPanelFinalState && typeof altTagsPanelFinalState === 'function') {
        altTagsPanelFinalState();
      }
      resolve();
    });
  };

  return (
    <div className="flex w-full" style={{ marginBottom: "300px" }}>
      <TopBar onPrepareData={handlePrepareData} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <OnPagePanel />
        <TableView 
          webpages={pages} 
          registerFinalState={(fn) => setTableViewFinalState(() => fn)} 
        />
        <AltTagsPanel 
          alts={altImages} 
          registerFinalState={(fn) => setAltTagsPanelFinalState(() => fn)} 
        />
      </div>
    </div>
  );
}
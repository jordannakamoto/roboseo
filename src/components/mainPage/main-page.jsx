"use client";

import React, { useEffect, useState } from "react";

import AltTagsPanel from "@/components/mainPage/alt-tags-panel";
import TableView from "@/components/mainPage/tableview";
import TestBar from "@/components/mainPage/CommandBar";
import TopBar from "@/components/mainPage/topbar";
import { useClientWebpage } from "@/contexts/ClientWebpageContext";

export default function Component() {
  // Using the context to get the webpages
  const { pages, setPages, altImages } = useClientWebpage();

  // Ensure there's an array to map over, even if it's empty
  const webpages = pages.length ? pages : [];

  return (
    <>
      <div className="flex h-screen w-full" style={{ marginBottom: "300px" }}>
        <TopBar />
        <div style={{display: "flex", flexDirection: "column"}}>
          <TableView webpages={pages} />  
          <AltTagsPanel alts={altImages}/>
          </div>
        <TestBar />
      </div>
    </>
  );
}

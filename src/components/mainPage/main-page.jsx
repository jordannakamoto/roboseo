"use client";

import React, { useEffect, useState } from "react";

import AltTagsPanel from "@/components/mainPage/alt-tags-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link2Icon } from "@radix-ui/react-icons";
import Sidebar from "@/components/mainPage/sidebar";
import TableView from "@/components/mainPage/tableview";
import TestBar from "@/components/misc/testbar";
import { Textarea } from "@/components/ui/textarea";
import { useClientWebpage } from "@/contexts/ClientWebpageContext";

export default function Component() {
  // Using the context to get the webpages
  const { pages, setPages } = useClientWebpage();

  // Ensure there's an array to map over, even if it's empty
  const webpages = pages.length ? pages : [];

  return (
    <>
      <div className="flex h-screen w-full" style={{ marginBottom: "300px" }}>
        <Sidebar />
        <TableView webpages={pages} />
        <AltTagsPanel />
      <TestBar />

      </div>
    </>
  );
}

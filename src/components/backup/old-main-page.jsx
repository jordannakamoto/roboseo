'use client';

import React, { useEffect, useState } from 'react';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link2Icon } from "@radix-ui/react-icons";
import Sidebar from "@/components/mainPage/sidebar";
import TestBar from '@/components/misc/testbar';
import { Textarea } from "@/components/ui/textarea";
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

export default function Component() {
  // Using the context to get the webpages
  const { pages, setPages } = useClientWebpage();
  const [activeTab, setActiveTab] = useState(null);

  // Ensure there's an array to map over, even if it's empty
  const webpages = pages.length ? pages : [];
  
  // Set the first webpage as the active tab on initial 
  useEffect(() => {
    if (webpages.length > 0 && activeTab === null) {
      setActiveTab(webpages[0].webpageTitle);
    }
  }, [webpages, activeTab]);

  return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <div className="grid gap-6 p-4 md:p-6" style={{ width: 800 }}>
          <div className="bg-white rounded-lg shadow-md dark:bg-gray-950">
            <div className="flex justify-between items-center">
              {/* Tab Headers */}
              <div className="flex">
              {webpages.map((webpage) => (
                <Button
                  key={webpage.webpageTitle}
                  variant="outline"
                  onClick={() => setActiveTab(webpage.webpageTitle)}
                  style={{
                    borderBottom: "none",
                    borderRadius: 0,
                    textDecoration: activeTab === webpage.webpageTitle ? 'underline' : 'none',
                  }}
                >
                  {webpage.webpageTitle}
                </Button>
              ))}
              </div>
              <a href={webpages.find(webpage => webpage.webpageTitle === activeTab)?.webpageUrl || '#'}>
                <Button variant="outline">
                  <Link2Icon className="h-4 w-4" />
                </Button>
              </a>
            </div>
            {/* Tab Content */}
            <div className="p-4">
              {webpages
                .filter(webpage => webpage.webpageTitle === activeTab)
                .map((webpage) => (
                  <div key={webpage.webpageTitle}>
                    <Label>{webpage.webpageTitle}</Label>
                    <Textarea placeholder={`Content for ${webpage.webpageTitle}`} />
                    <Textarea placeholder={`Content for ${webpage.webpageTitle}`} />
                    <Textarea placeholder={`Content for ${webpage.webpageTitle}`} />
                    {/* You may want to include other fields from the webpage object */}
                  </div>
                ))}
            </div>
          </div>
        </div>
        <TestBar />
      </div>
  );
}

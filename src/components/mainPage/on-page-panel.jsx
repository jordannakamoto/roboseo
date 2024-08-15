'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button'; // Import your button component
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const OnPagePanel = () => {
  const { pages, clientUrl } = useClientWebpage();
  const [images, setImages] = useState([]);
  const [showEmptyOriginals, setShowEmptyOriginals] = useState(true); // State to control visibility
  const containerRefs = useRef([]); // Array to hold refs for each image container
  
  useEffect(() => {
    if (clientUrl && pages.length > 0) {
      const fetchedImages = pages.map(page => {
        const formattedUrl = page.url.replace(/https?:\/\//, '').replace(/[\/#]/g, '_');
        return {
          url: page.url,
          imgSrc: `/frog/${clientUrl}/screenshots/https_${formattedUrl}.jpg`, // Adjust the file extension if necessary
          onpage: page.onpage || '',
          name: page.name || '', // Page name
          keywords: page.keywords.join(', ') || '', // Keywords joined by comma
          originalCopy: '', // Store original copy text
          proposedCopy: '', // Store proposed copy text
          isVisible: true, // Track visibility of each item
        };
      });
      setImages(fetchedImages);
    }
  }, [clientUrl, pages]);

  useEffect(() => {
    // Set the scroll position for each image container
    containerRefs.current.forEach((container) => {
      if (container) {
        container.scrollTop = container.scrollHeight * 0.2; // Scroll 20% down
      }
    });
  }, [images]);

  const handlePaste = (e, index) => {
    const pastedText = e.clipboardData.getData('text');
    setImages(prevImages => {
      const updatedImages = [...prevImages];
      updatedImages[index].proposedCopy = pastedText;
      return updatedImages;
    });
  };

  const handleOriginalCopyChange = (e, index) => {
    const newText = e.target.value;
    setImages(prevImages => {
      const updatedImages = [...prevImages];
      updatedImages[index].originalCopy = newText;
      return updatedImages;
    });
  };

  const handleProposedCopyChange = (e, index) => {
    const newText = e.target.value;
    setImages(prevImages => {
      const updatedImages = [...prevImages];
      updatedImages[index].proposedCopy = newText;
      return updatedImages;
    });
  };

  const toggleShowEmptyOriginals = () => {
    setShowEmptyOriginals(prev => !prev);
  };

  const handleImageClick = (e, index) => {
    if (e.shiftKey) {
      window.open(images[index].url, '_blank'); // Open link in new tab
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Button 
        variant="outline"
        style={{ position: 'absolute', bottom: '20px', left: '40px', zIndex: '1000' }} 
        onClick={toggleShowEmptyOriginals}
      >
        {showEmptyOriginals ? 'Hide' : 'Show'}
      </Button>
      <div style={{ overflowX: 'scroll', marginLeft: '20px', border: 'solid 1px #d3d3d3', height: '1400px', width: '84vw', display: 'flex', padding: '20px' }}>
        {images.map((image, index) => (
          (image.isVisible && (showEmptyOriginals || image.originalCopy.trim() !== '')) && ( // Conditionally render based on visibility and showEmptyOriginals state
            <div key={index} style={{ flexShrink: 0, marginRight: '10px', textAlign: 'center' }}>
              <div
                ref={el => containerRefs.current[index] = el} // Assign each container ref to the corresponding element
                style={{ overflowY: 'scroll', height: '400px', width: '330px', maxWidth: '330px' }}
              >
                <img
                  src={image.imgSrc}
                  alt={`Screenshot of ${image.url}`}
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={(e) => handleImageClick(e, index)} // Handle image click or shift-click
                />
              </div>
              <div style={{ fontWeight: 'bold', marginTop: '10px' }}>
                {image.name} {/* Display the page name */}
              </div>
              <textarea
                value={image.originalCopy}
                placeholder="Original Copy"
                style={{ width: '100%', height: '400px', fontSize: '13px', resize: 'none', marginTop: '10px' }}
                onPaste={(e) => handlePaste(e, index)}
                onChange={(e) => handleOriginalCopyChange(e, index)}
              />
              <div style={{ fontSize: '12px',borderBottom: 'solid 1px #d3d3d3',borderTop: 'solid 1px #d3d3d3', height: '3em', color: 'gray', marginTop: '5px', marginBottom: '5px',maxWidth: '330px' }}>
                {image.keywords} {/* Display the keywords */}
              </div>
              <textarea
                value={image.proposedCopy}
                placeholder="Proposed Copy"
                style={{ width: '100%', height: '400px', fontSize: '13px', resize: 'none', marginTop: '10px' }}
                onChange={(e) => handleProposedCopyChange(e, index)}
              />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default OnPagePanel;

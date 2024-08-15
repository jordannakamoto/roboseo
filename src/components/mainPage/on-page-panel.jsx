'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const OnPagePanel = () => {
  const { pages, clientUrl, setPages } = useClientWebpage(); // Assuming setPages is available in the context
  const [images, setImages] = useState([]);
  const containerRefs = useRef([]); // Array to hold refs for each image container
  const scrollContainerRef = useRef(null);
  const panelRef = useRef(null); // Reference for the focusable panel

  useEffect(() => {
    if (clientUrl && pages.length > 0) {
      const fetchedImages = pages.map((page) => {
        const formattedUrl = page.url.replace(/https?:\/\//, '').replace(/[\/#]/g, '_');
        return {
          url: page.url,
          imgSrc: `/frog/${clientUrl}/screenshots/https_${formattedUrl}.jpg`,
          onpage: page.onpage || '',
          name: page.name || '',
          keywords: page.keywords.join(', ') || '',
          h1: page.h1,
          originalCopy: '',
          isVisible: true,
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
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (panelRef.current === document.activeElement && e.key === 'Tab') {
        const scrollAmount = e.shiftKey ? -390 : 390;
        const scrollContainer = scrollContainerRef.current;
  
        if (scrollContainer) {
          // Scroll the container
          scrollContainer.scrollBy({
            left: scrollAmount,
            behavior: 'smooth',
          });
  
          // Calculate new scroll position
          const newScrollLeft = scrollContainer.scrollLeft + scrollAmount;
  
          // Check if we have reached the start or end of the scroll
          const atStart = newScrollLeft <= 0;
          const atEnd = newScrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth;
  
          if (atEnd) {
            // Get all textarea elements inside the panel
            const textareas = panelRef.current.querySelectorAll('textarea');
            
            // Focus the last textarea
            if (textareas.length > 0) {
              const lastTextarea = textareas[textareas.length - 1];
              lastTextarea.focus();
  
              // Allow browser's native tab behavior to move to the next element
              setTimeout(() => {
                lastTextarea.blur(); // Blur the last textarea to allow Tab to move to the next element
              }, 0);
            }
          } else {
            e.preventDefault(); // Prevent default Tab behavior only when this component is focused
          }
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelRef, scrollContainerRef]);
  
  
  

  const handlePaste = (e, index) => {
    const pastedText = e.clipboardData.getData('text');
    // e.target.value = pastedText;
  };

  const handleImageClick = (e, index) => {
    if (e.shiftKey) {
      window.open(images[index].url, '_blank');
      const textarea = document.querySelector(`#textarea-${index}`);
      if (textarea) {
        textarea.focus(); // Focus the corresponding textarea
      }
    }
  };

  const handleTextareaChange = (e, index) => {
    const newText = e.target.value;

    // Update the corresponding page's onpage value
    setPages(prevPages => {
      return prevPages.map((page, i) => {
        if (i === index) {
          return { ...page, onpage: newText }; // Update onpage for the correct page
        }
        return page;
      });
    });

    // Also update the local images state for immediate UI reflection (optional)
    setImages(prevImages => {
      const updatedImages = [...prevImages];
      updatedImages[index].onpage = newText;
      return updatedImages;
    });
  };

  return (
    <div
      ref={panelRef}
      tabIndex={0} // Make the div focusable
      style={{ position: 'relative', marginTop: '40px', outline: 'none' }} // Outline set to none to avoid focus ring
    >
      <div
        ref={scrollContainerRef}
        style={{
          overflowX: 'scroll',
          marginLeft: '60px',
          height: '100%',
          width: '70vw',
          display: 'flex',
          paddingTop: '30px',
          paddingLeft: '10px',
          scrollbarWidth: 'none', // For Firefox
          WebkitOverflowScrolling: 'touch', // For smooth scrolling on iOS
          paddingRight: '1100px' 
        }}
      >
        {images.map((image, index) => (
          (image.isVisible) && (
            <div key={index} style={{ flexShrink: 0, marginRight: '10px', textAlign: 'center'}}>
              <div
                ref={el => containerRefs.current[index] = el} // Assign each container ref to the corresponding element
                style={{ border:'solid 1px #d5d5d5', overflowY: 'scroll', height: '380px', width: '380px', padding: '30px', maxWidth: '380px' }}
              >
                <img
                  src={image.imgSrc}
                  alt={`Screenshot of ${image.url}`}
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={(e) => handleImageClick(e, index)} // Handle image click or shift-click
                />
              </div>
              <textarea
                id={`textarea-${index}`} // Unique ID for each textarea
                value={image.onpage} // Bind the textarea value to the onpage value
                placeholder={image.name}
                style={{ width: '100%', height: '100px', border: 'solid 1px #d5d5d5', fontSize: '13px', resize: 'none', marginTop: '10px' }}
                onChange={(e) => handleTextareaChange(e, index)} // Update onpage on change
                onPaste={(e) => handlePaste(e, index)}
              />
            </div>
          )
        ))}
      </div>
      <style jsx>{`
        /* Minimal scrollbar styling for WebKit browsers (Safari, Chrome, etc.) */
        ::-webkit-scrollbar {
          width: 4px;
          height: 0px; /* Height for horizontal scrollbar */
        }

        ::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2); /* Darker thumb */
          border-radius: 0px;
        }

        ::-webkit-scrollbar-track {
          background: transparent; /* Transparent track */
        }
      `}</style>
    </div>
  );
};

export default OnPagePanel;

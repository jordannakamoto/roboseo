'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useClientWebpage } from '@/contexts/ClientWebpageContext'; // Assuming you have this context set up

const TableView = ({ webpages, registerFinalState }) => {
  const [showH2, setShowH2] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [modalData, setModalData] = useState(null); // State for modal data
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 }); // Position of the modal
  const modalRef = useRef(); // Ref for the modal to track its visibility
  const [isModalVisible, setIsModalVisible] = useState(true); // State to toggle modal visibility
  const [isUpdated, setIsUpdated] = useState(false); // State to track if pages array is updated

  const { pages, setPages, finalizationState, setFinalizationState } = useClientWebpage(); // Accessing pages from context

  const refs = useRef([]); // Ref array to store all refs
  const [focusedTextarea, setFocusedTextarea] = useState({ type: null, index: null });
  const [charCount, setCharCount] = useState(0); // State to track character count

  const toggleH2 = () => setShowH2(!showH2);
  const toggleTable = () => setShowTable(!showTable);


  // Modal Component
  const Modal = ({ isOpen, originalData, modalPosition }) => {
    if (!isOpen || !isModalVisible) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: modalPosition.top,
          left: modalPosition.left,
          backgroundColor: 'white',
          padding: '5px',
          borderLeft: 'solid 1px grey',
          zIndex: 1000,
          width: '580px',
        }}
        ref={modalRef}
      >
        <table className="customTable" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '100%', paddingLeft: '10px' }}>
                <div style={{ paddingBottom: '10px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.title}</div>
                </div>
                <div style={{ paddingBottom: '14px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.meta}</div>
                </div>
                <div style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.h1}</div>
                </div>
                {showH2 && (
                  <div style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}>
                    <div style={{ color: 'blue' }}>{originalData.h2}</div>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const handleFocus = (e, page, rowRef, textareaType, index) => {
    const rect = rowRef.current.getBoundingClientRect(); // Get the bounding rect of the entire row
    setModalPosition({
      top: rect.top + - 3, //+ window.scrollY 
      left: rect.left + rect.width + 10 - 530,
    });
    setModalData(page); 
    setFocusedTextarea({ type: textareaType, index });
    setCharCount(e.target.value.length);
  };

  const handleBlur = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget)) {
      setModalData(null);
    }
    setFocusedTextarea({ type: null, index: null });  // Reset both type and index
  };

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
  };

  // Global listener for Shift + Tab to toggle modal visibility
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault(); // Prevent default Tab action
        setIsModalVisible((prev) => !prev); // Toggle modal visibility
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleKeyDown = (e, currentIndex, textareaType) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
  
      // Calculate the next textarea type within the same page
      let nextTextareaType;
  
      if (textareaType === 'title') {
        nextTextareaType = 'meta';
      } else if (textareaType === 'meta') {
        nextTextareaType = 'h1';
      } else if (textareaType === 'h1' && showH2) {
        nextTextareaType = 'h2';
      } else if (textareaType === 'h1' && !showH2) {
        nextTextareaType = 'title';
        currentIndex += 1;  // Move to the next page's title textarea
      } else if (textareaType === 'h2') {
        nextTextareaType = 'title';
        currentIndex += 1;  // Move to the next page's title textarea
      }
  
      // Focus the next textarea within the same page
      const nextTextarea = refs.current[currentIndex]?.[`ref${nextTextareaType.charAt(0).toUpperCase() + nextTextareaType.slice(1)}`];
  
      if (nextTextarea && nextTextarea.current) {
        nextTextarea.current.focus();
      }
    }
  };
  
  useEffect(() => {
    if (finalizationState.status === "finalize" && finalizationState.altTagsReady === true && finalizationState.metaTagsReady === false) {
      createFinalState();
      setFinalizationState({
        ...finalizationState,
        metaTagsReady: true,
        altTagsReady: true,
        status: "write", // Indicate that this part is done
      });
    }
  }, [finalizationState]);

  const createFinalState = useCallback(() => {
    console.log("creating final state for meta data tableview...")
    const updatedPages = pages.map((page, pageIndex) => {
      const matchingWebpage = webpages[pageIndex];
      if (matchingWebpage) {
        const updatedPage = { ...page };
        
        const titleValue = refs.current[pageIndex].refTitle.current.value;
        const h1Value = refs.current[pageIndex].refH1.current.value;
        const h2Value = showH2 ? refs.current[pageIndex].refH2.current.value : null;
        const metaValue = refs.current[pageIndex].refMeta.current.value;
  
        if (titleValue !== page.title) {
          updatedPage.titleNew = titleValue;
        }
        if (h1Value !== page.h1) {
          updatedPage.h1New = h1Value;
        }
        if (showH2 && h2Value !== page.h2) {
          updatedPage.h2New = h2Value;
        }
        if (metaValue !== page.meta) {
          updatedPage.metaNew = metaValue;
        }
  
        return updatedPage;
      }
      return page;
    });

    setPages(updatedPages); // Update the context with the new fields
    setIsUpdated(true); // Set the updated state to true
    console.log('Updated pages:', updatedPages);
  });

  const renderCharacterCounter = (text, minCount, maxCount) => {
    const count = text.length;
    let color = 'black';
    let fontWeight = 'normal';

    if (count > maxCount) {
      color = 'red';
    } else if (count >= minCount) {
      fontWeight = 'bold';
    }

    return (
      <span
        style={{
          position: 'absolute',
          right: '-20px',
          bottom: '5px',
          fontSize: '12px',
          color,
          fontWeight,
        }}
      >
        {count}
      </span>
    );
  };

  return (
    <>
      <div
        style={{
          marginLeft: '30px',
          position: 'relative',
          minHeight: 'auto',
          overflow: showTable ? 'visible' : 'hidden',
          marginTop: '60px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <Modal isOpen={!!modalData} originalData={modalData} modalPosition={modalPosition} />
        <div className="tableColumn" style={{ flexGrow: 1}}>
          {showTable &&
            webpages.map((page, pageIndex) => {
              const rowRef = React.createRef(); // Create a ref for the entire row

              // Create refs for each input and store them in the refs array
              if (!refs.current[pageIndex]) {
                refs.current[pageIndex] = {
                  refTitle: React.createRef(),
                  refH1: React.createRef(),
                  refH2: showH2 ? React.createRef() : null,
                  refMeta: React.createRef(),
                };
              }

              return (
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '10px', marginTop: '10px', position: 'relative' }}>
                  <table className="customTable" style={{ tableLayout: 'fixed',borderBottom: 'solid 1px #e5e5e5', height: '120px', width: '800px'  }}>
                    <tbody>
                      <tr style={{ width: '750px'}} key={`page-name-${pageIndex}`} className="pageNameRow">
                        <td style={{ verticalAlign: 'top', width: '200px',flexShrink: 0, flexGrow: 0   }}>
                          <div
                            style={{
                              fontWeight: 'bold',
                              fontSize: '14px',
                              padding: '5px',
                              verticalAlign: 'top',
                              width: '100%',
                            }}
                          >
                            {page.name}
                          </div>
                          <div style={{ padding: '5px', fontSize: '12px', verticalAlign: 'top' }}>{page.keywords.join(', ')}</div>
                        </td>
                        <td style={{ width: '580px', paddingLeft: '50px', verticalAlign: 'top'}}>
  
  <div style={{ position: 'relative' }}>
    <textarea
      ref={refs.current[pageIndex].refTitle}
      style={{ 
        width: '100%', 
        resize: 'none', 
        height: '1.8em',
        overflow: 'hidden',
        padding: '2px', 
        paddingLeft: '4px', 
        fontSize: '14px', 
        verticalAlign: 'top',
        border: '1px solid transparent',
      }}
      defaultValue={page.title}
      tabIndex={0}
      onFocus={(e) => {
        e.target.style.outline = '1px solid lightblue'; // Change border on focus
        handleFocus(e, page, rowRef, 'title', pageIndex);
      }}
      onBlur={(e) => {
        e.target.style.outline = '1px solid transparent'; // Revert border on blur
        handleBlur(e);
      }}
      onChange={handleChange}
      onKeyDown={(e) => handleKeyDown(e, pageIndex, 'title')}
    />
    {focusedTextarea.type === 'title' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refTitle.current.value, 55, 60)}
</div>

  <div style={{ position: 'relative', marginTop: '5px' }}>
    <textarea 
      ref={refs.current[pageIndex].refMeta}
      style={{ 
        width: '100%', 
        resize: 'none', 
        height: '3.6em',
        padding: '2px',  
        paddingLeft: '4px', 
        margin: '2px 0px 0px 0px', 
        fontSize: '14px', 
        verticalAlign: 'top',
        border: '1px solid transparent',
      }}
      defaultValue={page.meta}
      tabIndex={0}
      onFocus={(e) => {
        e.target.style.outline = '1px solid lightblue';
        handleFocus(e, page, rowRef, 'meta', pageIndex);
      }}
      onBlur={(e) => {
        e.target.style.outline = '1px solid transparent';
        handleBlur(e);
      }}
      onChange={handleChange}
      onKeyDown={(e) => handleKeyDown(e, pageIndex, 'meta')}
    />
    {focusedTextarea.type === 'meta' && focusedTextarea.index === pageIndex &&renderCharacterCounter(refs.current[pageIndex].refMeta.current.value, 155, 160)}
  </div>
  
  <div style={{ position: 'relative', marginTop: '5px' }}>
    <textarea
      ref={refs.current[pageIndex].refH1}
      style={{ 
        width: '100%', 
        overflow: 'hidden', 
        resize: 'none', 
        height: '1.8em', 
        padding: '2px', 
        paddingLeft: '4px', 
        paddingBottom: '5px', 
        fontSize: '14px', 
        verticalAlign: 'top',
        border: '1px solid transparent',
      }}
      defaultValue={page.h1}
      tabIndex={0}
      onFocus={(e) => {
        e.target.style.outline = '1px solid lightblue';
        handleFocus(e, page, rowRef, 'h1', pageIndex);
      }}
      onBlur={(e) => {
        e.target.style.outline = '1px solid transparent';
        handleBlur(e);
      }}
      onChange={handleChange}
      onKeyDown={(e) => handleKeyDown(e, pageIndex, 'h1')}
    />
    {focusedTextarea.type === 'h1' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refH1.current.value, 20, 70)}
  </div>
  
  {showH2 && (
    <div style={{ position: 'relative', marginTop: '5px' }}>
      <textarea
        ref={refs.current[pageIndex].refH2}
        style={{ 
          width: '100%', 
          overflow: 'hidden',
          resize: 'none',
          height: '1.5em', 
          padding: '2px', 
          paddingLeft: '4px',
          paddingBottom: '5px', 
          fontSize: '14px', 
          verticalAlign: 'top', 
          color: 'blue',
          border: '1px solid transparent',
        }}
        defaultValue={page.h2}
        tabIndex={0}
        onFocus={(e) => {
          e.target.style.outline = '1px solid lightblue';
          handleFocus(e, page, rowRef, 'h2', pageIndex);
        }}
        onBlur={(e) => {
          e.target.style.outline = '1px solid transparent';
          handleBlur(e);
        }}
        onChange={handleChange}
        onKeyDown={(e) => handleKeyDown(e, pageIndex, 'h2')}
      />
      {focusedTextarea.type === 'h2' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refH2.current.value, 20, 70)}
    </div>
  )}
</td>

                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
        </div>
      </div>
      <Button
        style={{
          marginLeft: '60vw',
          width: '300px',
          marginBottom: '20px',
          fontSize: '12px',
          height: '20px'
        }}
        variant="outline"
        onClick={toggleH2}
        tabIndex="-1"
      >
        Show H2s
      </Button>
      {/* <Button
        style={{
          width: '300px',
          marginLeft: '60vw',
          marginBottom: '20px',
          backgroundColor: isUpdated ? '#f5f5f5' : 'white',
        }}
        variant="outline"
        onClick={createFinalState}
      >
        {isUpdated ? 'Changes Approved' : 'Approve Page Changes'}
      </Button> */}
    </>
  );
};

export default TableView;

import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useClientWebpage } from '@/contexts/ClientWebpageContext'; // Assuming you have this context set up

// Main TableView Component
const TableView = ({ webpages }) => {
  const [showH2, setShowH2] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [modalData, setModalData] = useState(null); // State for modal data
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 }); // Position of the modal
  const modalRef = useRef(); // Ref for the modal to track its visibility
  const [isModalVisible, setIsModalVisible] = useState(true); // State to toggle modal visibility
  const [isUpdated, setIsUpdated] = useState(false); // State to track if pages array is updated

  const { pages, setPages } = useClientWebpage(); // Accessing pages from context

  const refs = useRef([]); // Ref array to store all refs

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
                <div style={{ paddingBottom: '6px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.title}</div>
                </div>
                <div style={{ paddingBottom: '8px', fontSize: '14px', verticalAlign: 'top' }}>
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

  const handleFocus = (e, page, rowRef) => {
    const rect = rowRef.current.getBoundingClientRect(); // Get the bounding rect of the entire row
    setModalPosition({
      top: rect.top + - 3, //+ window.scrollY 
      left: rect.left + rect.width + 10 - 570,
    });
    setModalData(page); 
  };

  const handleBlur = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget)) {
      setModalData(null);
    }
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

  const createFinalState = () => {
    const updatedPages = pages.map((page, pageIndex) => {
      const matchingWebpage = webpages[pageIndex];
      if (matchingWebpage) {
        return {
          ...page,
          titleNew: refs.current[pageIndex].refTitle.current.value,
          h1New: refs.current[pageIndex].refH1.current.value,
          h2New: showH2 ? refs.current[pageIndex].refH2.current.value : null,
          metaNew: refs.current[pageIndex].refMeta.current.value,
        };
      }
      return page;
    });

    setPages(updatedPages); // Update the context with the new fields
    setIsUpdated(true); // Set the updated state to true
    console.log('Updated pages:', updatedPages);
  };

  return (
    <>
      <div
        style={{
          marginLeft: '30px',
          position: 'relative',
          minHeight: 'auto',
          // height: showTable ? '100%' : '0',
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
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '10px', marginTop: '10px' }}>
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
                          {/* <div style={{ padding: '5px', fontSize: '12px', verticalAlign: 'top' }}>{page.url}</div> */}
                          <div style={{ padding: '5px', fontSize: '12px', verticalAlign: 'top' }}>{page.keywords.join(', ')}</div>
                        </td>
                        <td style={{ width: '580px', paddingLeft: '50px', verticalAlign: 'top'}}>
  {/* <div style={{ paddingBottom: '10px' }}></div> */}
  
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
      handleFocus(e, page, rowRef);
    }}
    onBlur={(e) => {
      e.target.style.outline = '1px solid transparent'; // Revert border on blur
      handleBlur(e);
    }}
  />
  
  <textarea 
    ref={refs.current[pageIndex].refMeta}
    style={{ 
      width: '100%', 
      resize: 'none', 
      height: '3.6em',
      padding: '2px',  
      paddingLeft: '4px', 
      margin: '2px 0px 0px 0px', 
      // paddingBottom: '5px', 
      fontSize: '14px', 
      verticalAlign: 'top',
      border: '1px solid transparent',
    }}
    defaultValue={page.meta}
    tabIndex={0}
    onFocus={(e) => {
      e.target.style.outline = '1px solid lightblue';
      handleFocus(e, page, rowRef);
    }}
    onBlur={(e) => {
      e.target.style.outline = '1px solid transparent';
      handleBlur(e);
    }}
  />
  
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
      handleFocus(e, page, rowRef);
    }}
    onBlur={(e) => {
      e.target.style.outline = '1px solid transparent';
      handleBlur(e);
    }}
  />
  
  {showH2 && (
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
        handleFocus(e, page, rowRef);
      }}
      onBlur={(e) => {
        e.target.style.outline = '1px solid transparent';
        handleBlur(e);
      }}
    />
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
            style={{ marginLeft: '60vw', marginBottom: '20px', fontSize: '12px', height: '20px'}}
            variant="outline"
            onClick={toggleH2}
            tabIndex="-1"
          >
            Show H2s
          </Button>
      <Button
        style={{
          marginLeft: '60vw',
          marginBottom: '20px',
          backgroundColor: isUpdated ? '#f5f5f5' : 'white', // Change color based on update status
          // color: 'white',
        }}
        variant="outline"
        onClick={createFinalState}
      >
        {isUpdated ? 'Changes Approved' : 'Approve Page Changes'} {/* Change text based on update status */}
      </Button>
    </>
  );
};

export default TableView;

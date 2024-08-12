import './tableview.css'; // Ensure the CSS is properly set up

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
          width: '550px',
        }}
        ref={modalRef}
      >
        <table className="customTable flex" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '100%', paddingLeft: '20px' }}>
                <div style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.title}</div>
                </div>
                <div style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.h1}</div>
                </div>
                {showH2 && (
                  <div style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}>
                    <div style={{ color: 'blue' }}>{originalData.h2}</div>
                  </div>
                )}
                <div style={{ paddingBottom: '5px', fontSize: '13px', verticalAlign: 'top' }}>
                  <div>{originalData.meta}</div>
                </div>
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
      top: rect.top + 30, //+ window.scrollY 
      left: rect.left + rect.width + 10 - 600,
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
          minHeight: showTable ? '100vh' : '0',
          height: showTable ? '100%' : '0',
          overflow: showTable ? 'visible' : 'hidden',
          marginTop: '60px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <Modal isOpen={!!modalData} originalData={modalData} modalPosition={modalPosition} />
        <div className="tableColumn" style={{ flexGrow: 1 }}>
          <Button
            style={{ fontSize: '12px', height: '20px', position: 'absolute', bottom: '80px', left: '10px' }}
            variant="outline"
            onClick={toggleH2}
          >
            H2
          </Button>
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
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '20px' }}>
                  <table className="customTable flex" style={{ marginTop: '0px', width: '100%' }}>
                    <tbody>
                      <tr style={{ borderBottom: 'solid 1px #e5e5e5' }} key={`page-name-${pageIndex}`} className="pageNameRow">
                        <td style={{ verticalAlign: 'top', width: '200px' }}>
                          <div
                            style={{
                              fontWeight: 'bold',
                              fontSize: '14px',
                              padding: '5px',
                              verticalAlign: 'top',
                            }}
                          >
                            {page.name}
                          </div>
                          <div style={{ padding: '5px', fontSize: '12px', verticalAlign: 'top' }}>{page.keywords.join(', ')}</div>
                        </td>
                        <td style={{ width: '550px', paddingLeft: '60px' }}>
                          <div style={{ paddingBottom: '15px' }}>⠀</div>
                          <div
                            style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}
                            tabIndex={0} // Make the div focusable to capture key events
                            onFocus={(e) => handleFocus(e, page, rowRef)}
                            onBlur={handleBlur}
                          >
                            <input ref={refs.current[pageIndex].refTitle} style={{ width: '100%' }} defaultValue={page.title} />
                          </div>
                          <div
                            style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}
                            tabIndex={0}
                            onFocus={(e) => handleFocus(e, page, rowRef)}
                            onBlur={handleBlur}
                          >
                            <input ref={refs.current[pageIndex].refH1} style={{ width: '100%' }} defaultValue={page.h1} />
                          </div>
                          {showH2 && (
                            <div
                              style={{ paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top' }}
                              tabIndex={0}
                              onFocus={(e) => handleFocus(e, page, rowRef)}
                              onBlur={handleBlur}
                            >
                              <input ref={refs.current[pageIndex].refH2} style={{ width: '100%', color: 'blue' }} defaultValue={page.h2} />
                            </div>
                          )}
                          <div
                            style={{ paddingBottom: '5px', fontSize: '13px', verticalAlign: 'top' }}
                            tabIndex={0}
                            onFocus={(e) => handleFocus(e, page, rowRef)}
                            onBlur={handleBlur}
                          >
                            <textarea ref={refs.current[pageIndex].refMeta} style={{ width: '100%', resize: 'none' }} defaultValue={page.meta} />
                          </div>
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

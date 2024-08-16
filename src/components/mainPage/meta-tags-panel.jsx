'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const TableView = ({ webpages, registerFinalState }) => {

  const { pages, setPages, finalizationState, setFinalizationState, showH2, setShowH2 } = useClientWebpage();

  const [showTable, setShowTable] = useState(true); // .. Unused
  const [modalData, setModalData] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);


  const [focusedTextarea, setFocusedTextarea] = useState({ type: null, index: null });
  const [charCount, setCharCount] = useState(0);

  const toggleH2 = () => setShowH2(!showH2);

  const refs = useRef([]);
  const previousOnpageValues = useRef([]);
  const modalRef = useRef();


  // ` Modal Component
  const Modal = ({ isOpen, originalData, modalPosition }) => {
    if (!isOpen || !isModalVisible || !originalData) return null;
  
    const { page, textareaType } = originalData;  // Destructure the page and textareaType
    
    let fieldValue;
    switch (textareaType) {
        case 'title':
            fieldValue = page.title;
            break;
        case 'meta':
            fieldValue = page.meta;
            break;
        case 'h1':
            fieldValue = page.h1;
            break;
        case 'h2':
            fieldValue = page.h2;
            break;
        case 'onPage':
            fieldValue = page.onpage;
            break;
        default:
            fieldValue = '';  // Fallback if no type matches
    }
  
    return (
        <div
            style={{
                position: 'absolute',
                top: modalPosition.top,
                left: modalPosition.left,
                height: '0',
                // padding: '5px',
                zIndex: 1000,
                width: '569px',
                background: '#f7f7f7',
                borderSize: 'border-box',
            }}
            ref={modalRef}
        >
          {/* modal style */}
            <table className="customTable" style={{ border: 'solid 1px #d7d7d7',borderBottom: textareaType !== 'onPage' ? 'none': 'solid 1px #d7d7d7' ,  height: 'auto', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ 
                            width: '100%', 
                            paddingBottom: textareaType !== 'onPage' ? '8px' : '0', 
                            paddingLeft: textareaType === 'onPage' ? '10px' : '0',
                            background: '#f7f7f7' }}>
                            <textarea
                                ref={(textareaRef) => {
                                    if (textareaRef) {
                                        if (textareaType === 'onPage') {
                                            textareaRef.style.height = 'auto';
                                            textareaRef.style.height = `${textareaRef.scrollHeight}px`;
                                        } else if (textareaType === 'meta') {
                                            textareaRef.style.height = '4.4em';
                                        } else {
                                            textareaRef.style.height = '2.6em';
                                        }
                                    }
                                }}
                                style={{ 
                                    background: 'aliceblue',
                                    width: '100%',
                                    // maxHeight: '12em',
                                    padding: '12px 10px',
                                    fontSize: '14px', 
                                    verticalAlign: 'top', 
                                    overflow: 'scroll', 
                                    resize: 'none', 
                                    outline: 'none',
                                }}
                                value={fieldValue}
                                readOnly
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
  };
  // .. end Modal Component


  // When OnPage data change from on-page-panel.jsx:
  // `UseEffect for OnPageValues
  useEffect(() => {
    pages.forEach((page, pageIndex) => {
      const textareaRef = refs.current[pageIndex]?.refOnPage?.current;

      if (textareaRef) {
        const prevOnpage = previousOnpageValues.current[pageIndex];
        const currentOnpage = page.onpage;

        if (currentOnpage !== prevOnpage) {
          // Update the specific textarea with the new onpage value
          textareaRef.value = currentOnpage;

          // Adjust the height dynamically as the content changes
          textareaRef.style.height = 'auto';
          textareaRef.style.height = `${textareaRef.scrollHeight}px`;

          // Update the previous value to the current one
          previousOnpageValues.current[pageIndex] = currentOnpage;
        }
      }
    });
  }, [pages]); // Depend on pages, so it runs when pages state changes
  

  // Set Modal information when field gets focus
  // Also, trigger CharCounter
  // `Handle Field Focus
  const handleFocus = (e, page, rowRef, textareaType, index) => {
    const textareaRect = e.target.getBoundingClientRect();
    const rowRect = rowRef.current.getBoundingClientRect();

    // ` Modal Coordinates
    let topPos = window.scrollY + rowRect.top; // Adjust to consider scrolling
    let leftPos = rowRect.left + (110);

    switch (textareaType) {
      case 'title':
          topPos -= 647;
          break;
      case 'meta':
          topPos -= 635;
          break;
      case 'h1':
          topPos -= 546;
          break;
      case 'h2':
          topPos -= 526;
          break;
          break;
      case 'onPage':
          topPos -= 459;
          leftPos += 569;
          break;
      default:
  }
    setModalPosition({
      top: topPos, // Position based on the row
      left: leftPos, // Adjust for modal width
    });
    
    setModalData({page, textareaType});
    setFocusedTextarea({ type: textareaType, index });
    setCharCount(e.target.value.length);
  };

  const handleBlur = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget)) {
      setModalData(null);
    }
    setFocusedTextarea({ type: null, index: null });
  };

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
  };

  // * Global Key Handler for Shift + Tab * //
  //` Shift + Tab
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        setIsModalVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // * Enter Key Handler for cycling through fields
  // ` Enter Key Handler
  const handleKeyDown = (e, currentIndex, textareaType) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      let nextTextareaType;

      if (textareaType === 'title') {
        nextTextareaType = 'meta';
      } else if (textareaType === 'meta') {
        nextTextareaType = 'h1';
      } else if (textareaType === 'h1' && showH2) {
        nextTextareaType = 'h2';
      } else if (textareaType === 'h1' && !showH2) {
        if(pages[currentIndex].onpage){
        nextTextareaType = 'onPage';
        }
        else{
        nextTextareaType = 'title';
        currentIndex += 1;
        }
      } else if (textareaType === 'h2') {
        nextTextareaType = 'onPage';
        currentIndex += 1;
      }
        else if (textareaType === 'onPage') {
        nextTextareaType = 'title';
        currentIndex += 1;
      }

      const nextTextarea = refs.current[currentIndex]?.[`ref${nextTextareaType.charAt(0).toUpperCase() + nextTextareaType.slice(1)}`];

      if (nextTextarea && nextTextarea.current) {
        nextTextarea.current.focus();
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      let prevTextareaType;

      if (textareaType === 'title') {
        if(pages[currentIndex-1]){
          if(pages[currentIndex-1].onpage){
            prevTextareaType = 'onPage';
          }
          else{
            prevTextareaType = showH2 ? 'h2' : 'h1';
          }
          currentIndex -= 1;
        }
        else{ // break the loop
          return;
        }
      } else if (textareaType === 'meta') {
        prevTextareaType = 'title';
      } else if (textareaType === 'h1') {
        prevTextareaType = 'meta';
      } else if (textareaType === 'h2') {
        prevTextareaType = 'h1';
      } else if (textareaType === 'onPage') {
        prevTextareaType = showH2 ? 'h2' : 'h1';
      }

      const prevTextarea = refs.current[currentIndex]?.[`ref${prevTextareaType.charAt(0).toUpperCase() + prevTextareaType.slice(1)}`];

      if (prevTextarea && prevTextarea.current) {
        prevTextarea.current.focus();
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
        status: "write",
      });
    }
  }, [finalizationState]);
  

  const createFinalState = useCallback(() => {
    const updatedPages = pages.map((page, pageIndex) => {
      const matchingWebpage = webpages[pageIndex];
      if (matchingWebpage) {
        const updatedPage = { ...page };
        const nameValue = refs.current[pageIndex].refName.current.value;
        const titleValue = refs.current[pageIndex].refTitle.current.value;
        const h1Value = refs.current[pageIndex].refH1.current.value;
        const h2Value = showH2 ? refs.current[pageIndex].refH2.current.value : null;
        const metaValue = refs.current[pageIndex].refMeta.current.value;
        const onpageValue = page.onpage ? refs.current[pageIndex].refOnPage.current.value : null;

        if (nameValue !== page.name) {
          updatedPage.name = nameValue;
        }
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
        if (onpageValue !== page.onpage) {
          updatedPage.onpageNew = onpageValue;
        }

        return updatedPage;
      }
      return page;
    });

    setPages(updatedPages);
    // setIsUpdated(true);
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
          marginLeft: '100px',
          position: 'relative',
          minHeight: 'auto',
          overflow: showTable ? 'visible' : 'hidden',
          marginTop: '60px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <Modal isOpen={!!modalData} originalData={modalData} modalPosition={modalPosition} />
        <div className="tableColumn" style={{ flexGrow: 1 }}>
          {showTable &&
            webpages.map((page, pageIndex) => {
              const rowRef = React.createRef();

              if (!refs.current[pageIndex]) {
                refs.current[pageIndex] = {
                  refName: React.createRef(),
                  refTitle: React.createRef(),
                  refH1: React.createRef(),
                  refH2: showH2 ? React.createRef() : null,
                  refMeta: React.createRef(),
                  refOnPage: React.createRef(),
                };
              }

              return (
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '4px', marginTop: '4px', position: 'relative' }}>
                  <table className="customTable" style={{ borderCollapse: 'collapse',  borderBottom: 'solid 1px #e5e5e5', height: 'auto', width: '780px' }}>
                    <tbody>
                      <tr style={{ width: '750px' }} key={`page-name-${pageIndex}`} className="pageNameRow">
                        <td style={{ verticalAlign: 'top', width: '210px', flexShrink: 0, flexGrow: 0, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', verticalAlign: 'top', width: '100%' }}>
                            <textarea
                              ref={refs.current[pageIndex].refName}
                              style={{
                                width: '93%',
                                resize: 'none',
                                height: '1.8em',
                                overflow: 'hidden',
                                padding: '2px',
                                paddingLeft: '4px',
                                marginRight: '10px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                borderBottom: 'none',
                                outline: 'none',
                              }}
                              defaultValue={page.name}
                              tabIndex={300 + pageIndex}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'lightblue';
                                handleFocus(e, page, rowRef, 'name', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid #d3d3d3';
                                handleBlur(e);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'name')}
                            />
                          </div>
                          <div style={{ textAlign: 'center', overflow: 'scroll', flexGrow: 1, minHeight: '8em', maxHeight: 'auto', background: '#f9f9f9',border:'solid 1px grey', paddingLeft: '5px', paddingTop: '5px',marginRight: '15px', fontSize: '14px', verticalAlign: 'top' }}>
                            {page.keywords.join(', ').split(', ').map((keyword, index) => (
                              <span key={index}>
                                {keyword},
                                <br />
                              </span>
                            ))}
                          </div>
                        </td>
                        {/* --------
                          TD #2
                          -------- */}
                        <td style={{ width: '570px', paddingBottom: '4px', paddingLeft: '0px', verticalAlign: 'top', boxSizing: 'border-box' }}>
                          <div style={{height: '1.5em'}}></div>
                          {/* TITLE AREA */}
                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refTitle}
                              style={{
                                width: '100%',
                                resize: 'none',
                                height: '2.7em',
                                overflow: 'hidden',
                                padding: '8px 10px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                borderBottom: 'none',
                                outline: 'none',
                              }}
                              defaultValue={page.title}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'lightblue';
                                refs.current[pageIndex].refMeta.current.style.borderTop = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'title', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#d3d3d3';
                                refs.current[pageIndex].refMeta.current.style.borderTop = '1px solid #d3d3d3';
                                handleBlur(e);
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'title')}
                            />
                            {focusedTextarea.type === 'title' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refTitle.current.value, 55, 60)}
                          </div>

                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refMeta}
                              style={{
                                width: '100%',
                                resize: 'none',
                                height: '4.5em',
                                padding: '8px 10px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                borderBottom: 'none',
                                outline: 'none'
                              }}
                              defaultValue={page.meta}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'lightblue';
                                refs.current[pageIndex].refH1.current.style.borderTop = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'meta', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor= '#d3d3d3';
                                refs.current[pageIndex].refH1.current.style.borderTop = '1px solid #d3d3d3';
                                handleBlur(e);
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'meta')}
                            />
                            {focusedTextarea.type === 'meta' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refMeta.current.value, 155, 160)}
                          </div>

                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refH1}
                              style={{
                                width: '100%',
                                overflow: 'hidden',
                                resize: 'none',
                                // marginBottom: '-1px',
                                height: '3em',
                                paddingTop: '14px',

                                boxSizing: 'border-box',
                                padding: '8px 10px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                outline: 'none',
                              }}
                              defaultValue={page.h1}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'lightblue';
                                handleFocus(e, page, rowRef, 'h1', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#d3d3d3';
                                handleBlur(e);
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'h1')}
                            />
                            {focusedTextarea.type === 'h1' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refH1.current.value, 20, 70)}
                          </div>

                          {showH2 && (
                            <div style={{ position: 'relative' }}>
                              <textarea
                                ref={refs.current[pageIndex].refH2}
                                style={{
                                  width: '100%',
                                  overflow: 'hidden',
                                  resize: 'none',
                                  height: '2.7em',
                                  padding: '8px 10px',
                                  fontSize: '14px',
                                  boxSizing: 'border-box',
                                  verticalAlign: 'top',
                                  color: 'blue',
                                  border: '1px solid #d3d3d3',
                                  outline: 'none'
                                }}
                                defaultValue={page.h2}
                                tabIndex={0}
                                onFocus={(e) => {
                                  e.target.style.border = '1px solid lightblue';
                                  handleFocus(e, page, rowRef, 'h2', pageIndex);
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = '1px solid #d3d3d3';
                                  handleBlur(e);
                                }}
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, pageIndex, 'h2')}
                              />
                              {focusedTextarea.type === 'h2' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refH2.current.value, 20, 70)}
                            </div>
                          )}
                          {/* ONPAGE AREA */}
                          {page.onpage && (
                            <div style={{ position: 'relative' }}>
                              <textarea
                                ref={refs.current[pageIndex].refOnPage}
                                style={{
                                  width: '100%',
                                  overflow: 'hidden',
                                  resize: 'none',
                                  height: 'auto',
                                  padding: '18px 10px',
                                  paddingTop: '14px',
                                  boxSizing: 'border-box',
                                  fontSize: '14px',
                                  verticalAlign: 'top',
                                  border: '1px solid #d3d3d3',
                                  borderTop: 'none',
                                  outline: 'none'
                                }}
                                defaultValue={page.onpage}
                                tabIndex={0}
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'lightblue';
                                  refs.current[pageIndex].refH1.current.style.borderBottom = '1px solid lightblue';
                                  handleFocus(e, page, rowRef, 'onPage', pageIndex);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#d3d3d3';
                                  refs.current[pageIndex].refH1.current.style.borderBottom = '1px solid #d3d3d3';
                                  handleBlur(e);
                                }}
                                onChange={(e) => {
                                  handleChange(e);
                          
                                  // Adjust the height dynamically as the content changes
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onKeyDown={(e) => handleKeyDown(e, pageIndex, 'onPage')}
                              />
                              {focusedTextarea.type === 'h2' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refOnPage.current.value, 20, 70)}
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
    </>
  );
};

export default TableView;

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const TableView = ({ webpages, registerFinalState }) => {
  const [showTable, setShowTable] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const modalRef = useRef();
  const [isModalVisible, setIsModalVisible] = useState(true);

  const { pages, setPages, finalizationState, setFinalizationState, showH2, setShowH2 } = useClientWebpage();

  const refs = useRef([]);
  const [focusedTextarea, setFocusedTextarea] = useState({ type: null, index: null });
  const [charCount, setCharCount] = useState(0);

  const toggleH2 = () => setShowH2(!showH2);

  // Modal Component
  const Modal = ({ isOpen, originalData, modalPosition }) => {
    if (!isOpen || !isModalVisible) return null;

    console.log("Modal data:", originalData);

    return (
      <div
        style={{
          position: 'fixed',
          top: modalPosition.top,
          left: modalPosition.left,
          // backgroundColor: 'white',
          padding: '5px',
          // borderLeft: 'solid 1px grey',
          zIndex: 1000,
          width: '580px',
        }}
        ref={modalRef}
      >
        <table className="customTable" style={{ border: 'solid 1px grey', width: '100%', tableLayout: 'fixed',
  borderCollapse: 'collapse'}}>
          <tbody>
            <tr>
              <td style={{ width: '100%', paddingLeft: '10px' }}>
                <div style={{ paddingBottom: '10px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.title}</div>
                </div>
                <div style={{ paddingBottom: '20px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.meta}</div>
                </div>
                <div style={{ paddingBottom: '12px', fontSize: '14px', verticalAlign: 'top' }}>
                  <div>{originalData.h1}</div>
                </div>
                {showH2 && (
                  <div style={{ paddingBottom: '10px', fontSize: '14px', verticalAlign: 'top' }}>
                    <div style={{ color: 'blue' }}>{originalData.h2}</div>
                  </div>
                )}
                {originalData.onpage && (
                <textarea
                  ref={textareaRef => {
                    if (textareaRef) {
                      textareaRef.style.height = 'auto';
                      textareaRef.style.height = `${textareaRef.scrollHeight}px`;
                    }
                  }}
                  value={originalData.onpage || ''}
                  readOnly
                  style={{ width: '100%', paddingBottom: '5px', fontSize: '14px', verticalAlign: 'top', overflow: 'hidden', resize: 'none' }}
                />
              )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    pages.forEach((page, pageIndex) => {
      if (refs.current[pageIndex]?.refOnPage?.current) {
        const textarea = refs.current[pageIndex].refOnPage.current;
  
        // Update the textarea value directly when onpage changes
        textarea.value = page.onPageNew !== undefined ? page.onPageNew : page.onpage || '';
      }
    });
  }, [pages]); // Depend on pages, so it runs when pages state changes

  const handleFocus = (e, page, rowRef, textareaType, index) => {
    const textareaRect = e.target.getBoundingClientRect();
    const rowRect = rowRef.current.getBoundingClientRect();

    setModalPosition({
      top: rowRect.top - 3, // Position based on the row
      left: rowRect.left + rowRect.width + 10 - 520, // Adjust for modal width
    });

    setModalData(page);
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
        nextTextareaType = 'title';
        currentIndex += 1;
      } else if (textareaType === 'h2') {
        nextTextareaType = 'title';
        currentIndex += 1;
      }

      const nextTextarea = refs.current[currentIndex]?.[`ref${nextTextareaType.charAt(0).toUpperCase() + nextTextareaType.slice(1)}`];

      if (nextTextarea && nextTextarea.current) {
        nextTextarea.current.focus();
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      let prevTextareaType;

      if (textareaType === 'title') {
        prevTextareaType = showH2 ? 'h2' : 'h1';
        currentIndex -= 1;
      } else if (textareaType === 'meta') {
        prevTextareaType = 'title';
      } else if (textareaType === 'h1') {
        prevTextareaType = 'meta';
      } else if (textareaType === 'h2') {
        prevTextareaType = 'h1';
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
        const onPageValue = refs.current[pageIndex].refOnPage.current.value;
        const metaValue = refs.current[pageIndex].refMeta.current.value;

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
        if (onPageValue !== page.onpage) {
          updatedPage.onPageNew = onPageValue;
        }

        return updatedPage;
      }
      return page;
    });

    setPages(updatedPages);
    setIsUpdated(true);
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
          marginLeft: '60px',
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
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '10px', marginTop: '10px', position: 'relative' }}>
                  <table className="customTable" style={{ tableLayout: 'fixed', borderBottom: 'solid 1px #e5e5e5', height: '120px', width: '780px' }}>
                    <tbody>
                      <tr style={{ width: '750px' }} key={`page-name-${pageIndex}`} className="pageNameRow">
                        <td style={{ verticalAlign: 'top', width: '210px', flexShrink: 0, flexGrow: 0, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', verticalAlign: 'top', width: '100%' }}>
                            <textarea
                              ref={refs.current[pageIndex].refName}
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
                              defaultValue={page.name}
                              tabIndex={300 + pageIndex}
                              onFocus={(e) => {
                                e.target.style.outline = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'name', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.outline = '1px solid transparent';
                                handleBlur(e);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'name')}
                            />
                          </div>
                          <div style={{ overflow: 'scroll', flexGrow: 1, height: '8em', background: '#f9f9f9', paddingLeft: '5px', paddingTop: '5px',marginRight: '15px', fontSize: '13.5px', verticalAlign: 'top' }}>
                            {page.keywords.join(', ').split(', ').map((keyword, index) => (
                              <span key={index}>
                                {keyword},
                                <br />
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ width: '570px', paddingLeft: '0px', verticalAlign: 'top', boxSizing: 'border-box' }}>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refTitle}
                              style={{
                                width: '100%',
                                resize: 'none',
                                height: '2.2em',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                padding: '2px 4px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid transparent',
                                outline: 'none',
                              }}
                              defaultValue={page.title}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'title', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid transparent';
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
                                height: '4.4em',
                                padding: '2px 4px',
                                boxSizing: 'border-box',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid transparent',
                                outline: 'none',
                              }}
                              defaultValue={page.meta}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'meta', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid transparent';
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
                                height: '2.2em',
                                boxSizing: 'border-box',
                                padding: '2px 4px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid transparent',
                                outline: 'none',
                              }}
                              defaultValue={page.h1}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid lightblue';
                                handleFocus(e, page, rowRef, 'h1', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid transparent';
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
                                  height: '1.5em',
                                  padding: '2px 4px',
                                  fontSize: '14px',
                                  verticalAlign: 'top',
                                  color: 'blue',
                                  border: '1px solid transparent',
                                  outline: 'none',
                                }}
                                defaultValue={page.h2}
                                tabIndex={0}
                                onFocus={(e) => {
                                  e.target.style.border = '1px solid lightblue';
                                  handleFocus(e, page, rowRef, 'h2', pageIndex);
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = '1px solid transparent';
                                  handleBlur(e);
                                }}
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, pageIndex, 'h2')}
                              />
                              {focusedTextarea.type === 'h2' && focusedTextarea.index === pageIndex && renderCharacterCounter(refs.current[pageIndex].refH2.current.value, 20, 70)}
                            </div>
                          )}
                          {page.onpage && (
                            <div style={{ position: 'relative' }}>
                              <textarea
                                ref={refs.current[pageIndex].refOnPage}
                                style={{
                                  width: '100%',
                                  overflow: 'hidden',
                                  resize: 'none',
                                  height: 'auto',
                                  padding: '8px 4px',
                                  fontSize: '14px',
                                  verticalAlign: 'top',
                                  border: '1px solid transparent',
                                  outline: 'none',
                                }}
                                defaultValue={page.onpage}
                                tabIndex={0}
                                onFocus={(e) => {
                                  e.target.style.border = '1px solid lightblue';
                                  handleFocus(e, page, rowRef, 'onPage', pageIndex);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.border = '1px solid transparent';
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

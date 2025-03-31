'use client';
// hello

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const TableView = ({ webpages, registerFinalState }) => {

  // STATES
  const { pages, setPages, finalizationState, setFinalizationState } = useClientWebpage();
  const [showTable, setShowTable] = useState(true); // .. Unused
  const [modalData, setModalData] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [focusedTextarea, setFocusedTextarea] = useState({ type: null, index: null });
  const [charCount, setCharCount] = useState(0);

  const refs = useRef([]);
  const previousOnpageValues = useRef([]);
  const previousHeaderValues = useRef([]);
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
        case 'header':
            fieldValue = page.header;
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
                width: '430px',
                background: '#f7f7f7',
                borderSize: 'border-box',
            }}
            ref={modalRef}
        >
          {/* modal style */}
            <table className="customTable" style={{ border: 'solid 1px #d7d7d7', height: 'auto', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ 
                            width: '100%', 
                            // paddingBottom: textareaType !== 'onPage' ? '8px' : '0', 
                            padding: '0',
                            // paddingLeft: textareaType === 'onPage' ? '10px' : '0',
                             }}>
                            <textarea
                                ref={(textareaRef) => {
                                    if (textareaRef) {
                                        if (textareaType === 'onPage') {
                                            textareaRef.style.height = 'auto';
                                            textareaRef.style.height = `${textareaRef.scrollHeight * 1.2}px`;
                                            textareaRef.style.padding = `18px 12px`;
                                        } else if (textareaType === 'meta') {
                                            textareaRef.style.height = '5.6em';
                                        } else {
                                            textareaRef.style.height = '2.6em';
                                        }
                                    }
                                }}
                                style={{ 
                                    background: 'aliceblue',
                                    width: '100%',
                                    // maxHeight: '12em',
                                    padding: '8px 10px',
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
    // * Global Key Handler for Shift + Tab * //
  //` Show/Hide Modal
  // ?! Changed this to `
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!e.shiftKey && e.key === '`') {
        e.preventDefault();
        setIsModalVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // .. end Modal Component

  // When OnPage data change from on-page-panel.jsx:
  // `UseEffect for OnPageValues and HeaderValues
  useEffect(() => {
    pages.forEach((page, pageIndex) => {
      const textareaOnPageRef = refs.current[pageIndex]?.refOnPage?.current;
      const textareaHeaderRef = refs.current[pageIndex]?.refHeader?.current;


      if (textareaOnPageRef && textareaHeaderRef) {
        const prevOnpage = previousOnpageValues.current[pageIndex];
        const currentOnpage = page.onpage;
        const prevHeader = previousHeaderValues.current[pageIndex];
        const currentHeader = page.header;
// 
        if (currentOnpage !== prevOnpage) {
          // Update the specific textarea with the new onpage value
          textareaOnPageRef.value = currentOnpage;

          // Adjust the height dynamically as the content changes
          textareaOnPageRef.style.height = 'auto';
          textareaOnPageRef.style.height = `${textareaOnPageRef.scrollHeight}px`;

          // Update the previous value to the current one
          previousOnpageValues.current[pageIndex] = currentOnpage;
        }

        if (currentHeader !== prevHeader) {
          textareaHeaderRef.value = currentHeader;
          previousHeaderValues.current[pageIndex] = currentHeader;
        }
      }
    });
  }, [pages]); // Depend on pages, so it runs when pages state changes


  // Set Modal information when field gets focus
  // Also, trigger CharCounter
  // `Handle Field Focus
  const handleFocus = (e, page, rowRef, textareaType, index) => {
    const textarea = e.target;
    const textareaRect = textarea.getBoundingClientRect();
    const rowRect = rowRef.current.getBoundingClientRect();


    // ` Modal Coordinates
    let topPos = window.scrollY + rowRect.top - 42; // Adjust to consider scrolling
    let leftPos = rowRect.left;

    switch (textareaType) {
      case 'title':
          topPos -= 641;
          break;
      case 'meta':
          topPos -= 607;
          break;
      case 'header':
          topPos -= 544;
          break;
      case 'onPage':
          topPos -= 510; // 40 old 
          // leftPos += 569;
          break;
      default:
  }
  leftPos -= 420;
    setModalPosition({
      top: topPos, // Position based on the row
      left: leftPos, // Adjust for modal width
    });
    
    setModalData({page, textareaType});
    setFocusedTextarea({ type: textareaType, index });
    setCharCount(e.target.value.length);
  };

  // ` Event Handlers

  const charLimits = {
    title: { min: 55, max: 60 },
    meta: { min: 155, max: 160 },
    header: { min: 20, max: 70 },
    onPage: { min: 50, max: 200 }, // example range for onPage
  };
  
  const handleBlur = (e, page, textareaType) => {
    const textarea = e.target;
    let originalValue = '';
    let currentValue = textarea.value;
    const charCount = currentValue.length;
  
    // Determine which field is being blurred and get its original value
    switch (textareaType) {
      case 'name':
        originalValue = page.name;
        break;
      case 'title':
        originalValue = page.title;
        break;
      case 'meta':
        originalValue = page.meta;
        break;
      case 'header':
        originalValue = page.header;
        break;
      case 'onPage':
        originalValue = page.onpage;
        break;
      default:
        originalValue = ''; // Fallback
    }
  
    // Check if the value has changed
    const hasValueChanged = currentValue !== originalValue;

    // Check the character count and apply color if it's out of range
    const limits = charLimits[textareaType] || { min: 0, max: Infinity };
    const isCharCountOutOfRange = charCount < limits.min || charCount > limits.max;

    // // Determine the background color based on both conditions
    // if (isCharCountOutOfRange) {
    //   textarea.style.backgroundColor = '#fbeeed'; // Highlight the field red if out of bounds
    // } else if (hasValueChanged) {
    //   textarea.style.backgroundColor = '#eef6ec'; // Green if the value has changed
    // } else {
    //   textarea.style.backgroundColor = 'white'; // Set to white if value hasn't changed and within character limits
    // }html
  
    // Hide modal if applicable
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget)) {
      setModalData(null);
    }
  
    setFocusedTextarea({ type: null, index: null });
  };

  // textarea change handler. Set CharCount and highlight keywords
  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    // alert(pageIndex);
    highlightKeywords(focusedTextarea.index);
  };

  // * Enter Key Handler for cycling through fields
  // ` Enter Key Handler
  const handleKeyDown = (e, currentIndex, textareaType) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      let nextTextareaType;

      if (textareaType === 'title') {
        nextTextareaType = 'meta';
      } else if (textareaType === 'meta') {
        nextTextareaType = 'header';
      } else if (textareaType === 'header') {
        nextTextareaType = 'onPage';
        currentIndex += 1;
      } else if (textareaType === 'onPage') {
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
        prevTextareaType = 'onPage';
        currentIndex -= 1;
      } else if (textareaType === 'meta') {
        prevTextareaType = 'title';
      } else if (textareaType === 'header') {
        prevTextareaType = 'meta';
      } else if (textareaType === 'onPage') {
        prevTextareaType = 'header';
      }

      const prevTextarea = refs.current[currentIndex]?.[`ref${prevTextareaType.charAt(0).toUpperCase() + prevTextareaType.slice(1)}`];

      if (prevTextarea && prevTextarea.current) {
        prevTextarea.current.focus();
      }
    }
  };

  // ` Keyword Highlighting
  useEffect(() => {
    webpages.forEach((_, pageIndex) => {
      highlightKeywords(pageIndex);
    });
  }, [pages]);

  const highlightKeywords = (pageIndex) => {
    const page = pages[pageIndex];
    const keywordPhrases = page.keywords; // Keep phrases intact
    const titleValue = refs.current[pageIndex]?.refTitle?.current?.value?.toLowerCase() || '';
    const metaValue = refs.current[pageIndex]?.refMeta?.current?.value?.toLowerCase() || '';
    const headerValue = refs.current[pageIndex]?.refHeader?.current?.value?.toLowerCase() || '';
    const onPageValue = page.onpage ? (refs.current[pageIndex]?.refOnPage?.current?.value?.toLowerCase() || '') : '';
  
    keywordPhrases.forEach((keywordPhrase, phraseIndex) => {
      const words = keywordPhrase.split(' '); // Split the phrase into individual words
  
      words.forEach((word, wordIndex) => {
        const wordLower = word.toLowerCase();
        const isFound = titleValue.includes(wordLower) ||
                        metaValue.includes(wordLower) ||
                        headerValue.includes(wordLower) ||
                        onPageValue.includes(wordLower);
  
        const keywordElement = document.getElementById(`keyword-${pageIndex}-${phraseIndex}-${wordIndex}`);
        if (keywordElement) {
          // HIGHLIGHT COLOR
          keywordElement.style.backgroundColor = isFound ? '#fff2cc' : 'transparent';
        }
      });
    });
  };
  // ` Create Final State
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
        const headerValue = refs.current[pageIndex].refHeader.current.value;
        const metaValue = refs.current[pageIndex].refMeta.current.value;
        const onpageValue = page.onpage ? refs.current[pageIndex].refOnPage.current.value : null;

        if (nameValue !== page.name) {
          updatedPage.name = nameValue;
        }
        if (titleValue !== page.title) {
          updatedPage.titleNew = titleValue;
        }
        if (headerValue !== page.header) {
          updatedPage.headerNew = headerValue;
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
    let color = '';
    let badcolor = 'gray';
    let goodcolor = 'green';
    let fontWeight = 'bold';
    let relativeCount;
  
    if (count > maxCount) {
      relativeCount = count - maxCount;
      color = badcolor;
    } else if (count >= minCount && count <= maxCount) {
      relativeCount = 0; // Within range, so no relative count needed
      color = goodcolor;
    } else {
      relativeCount = count - minCount;
      color = badcolor;
    }
  
    return (
      <span
        style={{
          position: 'absolute',
          right: '5px',
          top: '4px',
          fontSize: '12px',
          color,
          fontWeight,
        }}
      >
        {relativeCount === 0 ? count : relativeCount > 0 ? `+${relativeCount}` : relativeCount}
      </span>
    );
  };

  return (
    <>
    <div
        style={{
          marginLeft: '220px',
          position: 'relative',
          minHeight: 'auto',
          overflow: showTable ? 'visible' : 'hidden',
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
                  refHeader: React.createRef(),
                  refMeta: React.createRef(),
                  refOnPage: React.createRef(),
                };
              }

              return (
                <div key={`page-${pageIndex}`} ref={rowRef} style={{ marginBottom: '4px', marginTop: '4px', position: 'relative' }}>
                  <table className="customTable" style={{borderCollapse: 'collapse',  borderBottom: 'solid 1px #e5e5e5', height: 'auto', width: '820px' }}>
                    <tbody>
                      <tr style={{ width: '850px' }} key={`page-name-${pageIndex}`} className="pageNameRow">
                      <td style={{ verticalAlign: 'top', width: '230px', flexShrink: 0, flexGrow: 0, display: 'flex', flexDirection: 'column' }}>
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
                              e.target.style.borderColor = '#4fc1ff';
                              handleFocus(e, page, rowRef, 'name', pageIndex);
                            }}
                            onBlur={(e) => {
                              e.target.style.border = '1px solid #d3d3d3';
                              handleBlur(e, page, 'name');
                            }}
                            onKeyDown={(e) => handleKeyDown(e, pageIndex, 'name')}
                          />
                        </div>
                        <div style={{ textAlign: 'center', overflow: 'scroll', flexGrow: 1, minHeight: '8em', maxHeight: 'auto', background: '#f9f9f9', border: 'solid 1px #ccc', paddingLeft: '5px', paddingTop: '5px', marginRight: '15px', fontSize: '14px', verticalAlign: 'top' }}>
                        {page.keywords.map((keywordPhrase, phraseIndex) => (
                          <span key={`phrase-${pageIndex}-${phraseIndex}`}>
                            {keywordPhrase.split(' ').map((word, wordIndex) => (
                              <span key={`word-${pageIndex}-${phraseIndex}-${wordIndex}`} id={`keyword-${pageIndex}-${phraseIndex}-${wordIndex}`}>
                                {word}
                                {wordIndex < keywordPhrase.split(' ').length - 1 ? ' ' : ''}
                              </span>
                            ))}
                            {phraseIndex < page.keywords.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                      </td>
                        {/* --------
                          TD #2
                          -------- */}
                        <td style={{ width: '640px', paddingBottom: '4px', paddingLeft: '2px', verticalAlign: 'top', boxSizing: 'border-box' }}>
                          <div style={{height: '1.5em'}}></div>
                          {/* TITLE AREA */}
                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refTitle}
                              style={{
                                width: '100%',
                                resize: 'none',
                                height: '2.4em',
                                overflow: 'hidden',
                                padding: '6px 22px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                borderBottom: 'none',
                                outline: 'none',
                              }}
                              defaultValue={page.title}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#4fc1ff';
                                refs.current[pageIndex].refMeta.current.style.borderTop = '1px solid #4fc1ff';
                                handleFocus(e, page, rowRef, 'title', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#d3d3d3';
                                refs.current[pageIndex].refMeta.current.style.borderTop = '1px solid #d3d3d3';
                                handleBlur(e, page, 'title');
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'title')}
                            />
                            {refs.current[pageIndex].refTitle.current && renderCharacterCounter(refs.current[pageIndex].refTitle.current.value, 55, 60)}
                          </div>
                          {/* Meta Area */}
                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refMeta}
                              style={{
                                 
                                width: '100%',
                                resize: 'none',
                                height: '5.5em',
                                padding: '8px 22px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                borderBottom: 'none',
                                outline: 'none'
                              }}
                              defaultValue={page.meta}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#4fc1ff';
                                refs.current[pageIndex].refHeader.current.style.borderTop = '1px solid #4fc1ff';
                                handleFocus(e, page, rowRef, 'meta', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor= '#d3d3d3';
                                refs.current[pageIndex].refHeader.current.style.borderTop = '1px solid #d3d3d3';
                                handleBlur(e,page,'meta');
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'meta')}
                            />
                            {refs.current[pageIndex].refMeta.current && renderCharacterCounter(refs.current[pageIndex].refMeta.current.value, 155, 160)}
                          </div>
                          {/* Header Area */}
                          <div style={{ position: 'relative' }}>
                            <textarea
                              ref={refs.current[pageIndex].refHeader}
                              style={{
                                width: '100%',
                                overflow: 'hidden',
                                resize: 'none',
                                // marginBottom: '-1px',
                                height: '2.5em', // Adjusted height to better match a single line of text
                                boxSizing: 'border-box',
                                padding: '6px 22px',
                                fontSize: '14px',
                                verticalAlign: 'top',
                                border: '1px solid #d3d3d3',
                                outline: 'none',
                              }}
                              defaultValue={page.header}
                              tabIndex={0}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#4fc1ff';
                                handleFocus(e, page, rowRef, 'header', pageIndex);
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#d3d3d3';
                                handleBlur(e, page, 'header');
                              }}
                              onChange={handleChange}
                              onKeyDown={(e) => handleKeyDown(e, pageIndex, 'header')}
                            />
                            {refs.current[pageIndex].refHeader.current && renderCharacterCounter(refs.current[pageIndex].refHeader.current.value, 20, 70)}
                          </div>
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
                                  padding: '18px 22px',
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
                                  e.target.style.borderColor = '#4fc1ff';
                                  refs.current[pageIndex].refHeader.current.style.borderBottom = '1px solid #4fc1ff';
                                  handleFocus(e, page, rowRef, 'onPage', pageIndex);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = '#d3d3d3';
                                  refs.current[pageIndex].refHeader.current.style.borderBottom = '1px solid #d3d3d3';
                                  handleBlur(e, page, 'onPage');
                                }}
                                onChange={(e) => {
                                  handleChange(e);
                          
                                  // Adjust the height dynamically as the content changes
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onKeyDown={(e) => handleKeyDown(e, pageIndex, 'onPage')}
                              />
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
      {/* <input placeholder="Clear Page Names" style= {{fontSize: '12px', marginLeft: '80px', width: '200px'}} /> */}
    </>
  );
};

export default TableView;

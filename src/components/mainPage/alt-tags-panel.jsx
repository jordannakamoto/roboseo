'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRowSelect, useSortBy, useTable } from 'react-table';

import { Button } from '@/components/ui/button';
import axios from 'axios'; // Add this import for making API requests
import { useClientWebpage } from '@/contexts/ClientWebpageContext';

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [resolvedRef, indeterminate]);

    return <input type="checkbox" ref={resolvedRef} {...rest} />;
  }
);

const handleReplaceClick = (e) => {
  e.preventDefault(); // Prevents the button from causing the textarea to lose focus
};

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateMyData,
}) => {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const onChange = e => {
    setValue(e.target.value);
  };

  const onBlur = () => {
    updateMyData(index, id, value);
    setIsEditing(false);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return isEditing ? (
    <textarea
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        resize: 'none',
      }}
      autoFocus
    />
  ) : (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'text',
        maxHeight: '1.2em',
      }}
    >
      {value || '\u00A0'}
    </div>
  );
};

const AltTagsPanel = ({alts, registerFinalState}) => {
  // > State <
  const { pages, altImages, finalizationState, setFinalizationState } = useClientWebpage();
  const { altImagesProcessed, setAltImagesProcessed } = useClientWebpage();
  const [myData, setMyData] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const [lastSelectedAltID, setLastSelectedAltID] = useState(null);
  const [clicked, setClicked] = useState(false);
  const [focusedTextarea, setFocusedTextarea] = useState(null);
  const [focusedTextareaElement, setFocusedTextareaElement] = useState(null);
  const [focusedCaption, setFocusedCaption] = useState(''); // State to store the current focused caption
  const [charCount, setCharCount] = useState(0);
  const [fillInputCharCount, setFillInputCharCount] = useState(0); // Add this line to your state

  const allKeywords = Array.from(new Set(
    pages.flatMap(page => 
      page.keywords.flatMap(keyword => keyword.split(' '))
    )
  )).join(', ');

  useEffect(() => {
    if (altImages) {
      setSelectedImages({});
      setMyData(altImages.map((row, index) => ({ ...row, id: index.toString() })));
      // Clear the fill-input when altImages changes
      const fillInput = document.getElementById('fill-input');
      if (fillInput) {
          fillInput.value = ''; // Clear the input field
          setFillInputCharCount(0); // Reset the character count
      }
    }
  }, [altImages]);

  // Function to group selected images by URL
const groupSelectedImages = useCallback(() => {
  const groupedImages = {};
  for (const [uniqueId, imageData] of Object.entries(selectedImages)) {
    const { url, caption } = imageData;
    if (!groupedImages[url]) {
      groupedImages[url] = {
        uniqueIds: [uniqueId],
        url,
        caption,
        count: 1,
      };
    } else {
      groupedImages[url].uniqueIds.push(uniqueId);
      groupedImages[url].count += 1;
    }
  }
  return groupedImages;
}, [selectedImages]);

  const updateMyData = useCallback((rowIndex, columnId, value) => {
    setMyData(old =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: value,
          };
        }
        return row;
      })
    );
  }, []);

  const handleRowSelection = (row, rows, e) => {
    const uniqueId = row.id; // Use the generated ID as the unique identifier
    if (!uniqueId) return;

    console.log("selected alt image with id:", uniqueId)
    console.log("lastSelectedAltID", lastSelectedAltID);

    if (e.shiftKey && lastSelectedAltID !== null && lastSelectedAltID !== uniqueId) {
      console.log("entering loop");
      const lastID = rows.findIndex(r => r.id === lastSelectedAltID);
      const currID = rows.findIndex(r => r.id === uniqueId);

      console.log ("selection indexes at", lastID, currID);

        let start, end;
        if (lastID > currID) {
            start = currID;
            end = lastID;
            for (let i = start; i <= end-1; i++) {
                const selectedRow = rows[i];
                const selectedId = selectedRow.id;
                if (selectedId) {
                    selectedRow.toggleRowSelected();
                    if (selectedRow.isSelected) {
                        removeImageFromPreview(selectedId);
                    } else {
                        addImageToPreview(selectedRow);
                    }
                }
            }
        } else {
            start = lastID;
            end = currID;
            for (let i = start+1; i <= end; i++) {
                const selectedRow = rows[i];
                const selectedId = selectedRow.id;
                if (selectedId) {
                    selectedRow.toggleRowSelected();
                    if (selectedRow.isSelected) {
                        removeImageFromPreview(selectedId);
                    } else {
                        addImageToPreview(selectedRow);
                    }
                }
            }
        }
        setLastSelectedAltID(uniqueId);
    } else {
        row.toggleRowSelected();
        if (row.isSelected) {
            removeImageFromPreview(uniqueId);
        } else {
            addImageToPreview(row);
        }
        setLastSelectedAltID(uniqueId);
    }
};


  const addImageToPreview = (row) => {
    const uniqueId = row.id;
    const imageUrl = row.original?.Destination;
    if (uniqueId && imageUrl) {
      setSelectedImages(prev => ({
        ...prev,
        [uniqueId]: {
          url: imageUrl,
          caption: row.original['Alt Text'],  // Initialize caption from Alt Text
        },
      }));
    }
  };

  const removeImageFromPreview = (uniqueId) => {
    setSelectedImages(prev => {
      const updatedImages = { ...prev };
      delete updatedImages[uniqueId];
      return updatedImages;
    });
  };

  const handleCaptionChange = (e, url) => {
    const newCaption = e.target.value;
    
    setFocusedCaption(newCaption); // Update central caption state
    setCharCount(newCaption.length); // Update character count
  
    // Update the captions in the selected images immediately
    setSelectedImages(prev => {
      const updatedImages = { ...prev };
      const groupedImages = groupSelectedImages();
  
      // Update all images with this URL
      if (groupedImages[url] && groupedImages[url].uniqueIds) {
        groupedImages[url].uniqueIds.forEach(uniqueId => {
          if (updatedImages[uniqueId]) {
            updatedImages[uniqueId] = {
              ...updatedImages[uniqueId],
              caption: newCaption,
            };
          }
        });
      }
  
      return updatedImages;
    });
    
  };
  
  const handleCaptionBlur = (e, url, captionLength) => {
    const textarea = e.target;
    
    // Now commit the changes to the actual data on blur
    const newCaption = textarea.value;
    setSelectedImages(prev => {
      const updatedImages = { ...prev };
      const groupedImages = groupSelectedImages();
  
      groupedImages[url].uniqueIds.forEach(uniqueId => {
        updatedImages[uniqueId] = {
          ...updatedImages[uniqueId],
          caption: newCaption,
        };
      });
  
      return updatedImages;
    });
  
    // Apply visual feedback on the background color based on caption length
    if (captionLength >= 100 && captionLength <= 125) {
      textarea.style.borderColor = 'white'; // Light green if within limits
    } else if (captionLength > 125) {
      textarea.style.borderColor = '#ff6469'; // Light red if over the limit
    } else {
      // Only show red if the caption length is greater than 0
      textarea.style.borderColor = captionLength > 0 ? '#ff6469' : 'transparent';
    }
  };

  const fillCaptions = () => {
    const fillText = document.getElementById('fill-input').value;
    const updatedImages = { ...selectedImages };

    Object.keys(updatedImages).forEach((uniqueId) => {
      if (!updatedImages[uniqueId].caption) {
        updatedImages[uniqueId].caption = fillText;
      }
    });

    setSelectedImages(updatedImages);
  };

  const clearCaptions = () => {
    const updatedImages = { ...selectedImages };
  
    Object.keys(updatedImages).forEach((uniqueId) => {
      if (updatedImages[uniqueId].caption === updatedImages[uniqueId].originalAlt) {
        updatedImages[uniqueId].caption = ''; // Clear the caption if it matches the initial value
      }
    });
  
    setSelectedImages(updatedImages);
  };

  const handleTabKey = (e, textarea) => {
    const formElements = Array.from(document.querySelectorAll('input, button, textarea')).filter(el => el.tabIndex >= 0);
    const currentIndex = formElements.indexOf(textarea);
  
    if (e.key === 'Tab' && !e.shiftKey) {
      // Forward cycling on 'Tab'
      e.preventDefault();
      const nextElement = formElements[currentIndex + 1] || formElements[0]; // Go to the next element or loop to the first
      nextElement.focus();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      // Forward cycling on 'Enter'
      e.preventDefault();
      const nextElement = formElements[currentIndex + 1] || formElements[0]; // Go to the next element or loop to the first
      nextElement.focus();
    } else if ((e.key === 'Tab' && e.shiftKey) || (e.key === 'Enter' && e.shiftKey)) {
      // Backward cycling on 'Shift + Tab' or 'Shift + Enter'
      e.preventDefault();
      const prevElement = formElements[currentIndex - 1] || formElements[formElements.length - 1]; // Go to the previous element or loop to the last
      prevElement.focus();
    }
  };

  const handleFocus = (uniqueId, caption, textarea) => {
    setFocusedTextarea(uniqueId);
    setFocusedCaption(textarea.value); // Set the focused caption from the current textarea value
    setCharCount(textarea.value.length); // Set the charCount based on the length of the current value
    setFocusedTextareaElement(textarea); // Save the reference to the textarea
  };
  const handleFillInputChange = (e) => {
    setFillInputCharCount(e.target.value.length);
  };

  // Replace Occourances of a selected string in all selectedIMages
  const overwriteMatches = () => {
    if (!focusedTextarea) return;
  
    const fillText = document.getElementById('fill-input').value;
    const groupedImages = groupSelectedImages();
  
    // Get the current caption for the focused URL
    const currentCaption = groupedImages[focusedTextarea]?.caption;
    // if (!currentCaption || !focusedTextareaElement) return;
  
    // Get the selected text from the textarea
    const selectedText = focusedTextareaElement.value.substring(
      focusedTextareaElement.selectionStart,
      focusedTextareaElement.selectionEnd
    );
  
    if (!selectedText) return;
    
    // overwrite selected images
    const updatedImages = { ...selectedImages };
  
    // Iterate over all selected images and replace the selected text in their captions
    Object.keys(updatedImages).forEach((uniqueId) => {
      let caption = updatedImages[uniqueId].caption;

      // Replace the selected text in all captions
      if (caption.includes(selectedText)) {
        updatedImages[uniqueId].caption = caption.replace(new RegExp(selectedText, 'g'), fillText);
      }
    });
  
    setSelectedImages(updatedImages);
  };
  
  useEffect(() => {
    if (finalizationState.status === "finalize" && finalizationState.altTagsReady === false) {
      createFinalState();
      setFinalizationState({
        ...finalizationState,
        altTagsReady: true,
        status: "finalize", // Indicate that this part is done
      });
    }
  }, [finalizationState]);
  
  const createFinalState = useCallback(() => {
    console.log("creating final state for alt images module...")
    const updatedRows = Object.entries(selectedImages).map(([uniqueId, { caption }]) => {
      const row = myData.find(row => row.id === uniqueId);
      if (row) {
        return {
          uniqueId,
          page: row.Source,
          url: row.Destination,
          originalAlt: row['Alt Text'],
          newAlt: caption,
        };
      }
      return null;
    }).filter(Boolean);

    setAltImagesProcessed(updatedRows);
    setClicked(true);

    return updatedRows;
  });

  const generateAltText = async () => {
    const groupedImages = groupSelectedImages();
    const payload = Object.values(groupedImages).map(({ url, caption }) => ({
      url,
      description: caption,
    }));
  
    try {
      // Show some loading indicator
      console.log('Generating alt text...');
      
      const response = await axios.post('/api/openai', {
        option: 'generate-alt-text',
        images: payload,
        keywords: allKeywords
      });
  
      console.log('Response received:', response.data);
      const generatedAltTexts = response.data.altTexts;
  
      if (!generatedAltTexts || generatedAltTexts.length === 0) {
        console.error('No alt texts returned from API');
        return;
      }
  
      // Update the captions with the generated alt text
      setSelectedImages(prev => {
        const updatedImages = { ...prev };
      
        // Debug logging
        console.log('Previous selectedImages:', prev);
        console.log('Generated alt texts:', generatedAltTexts);
      
        for (const uniqueId in updatedImages) {
          const image = updatedImages[uniqueId];
          const generatedAlt = generatedAltTexts.find(alt => alt.url === image.url);
        
          if (generatedAlt) {
            console.log(`Updating image ${uniqueId} with new alt text: ${generatedAlt.altText}`);
            updatedImages[uniqueId] = {
              ...image,
              caption: generatedAlt.altText,
            };
          }
        }
      
        console.log('Updated selectedImages:', updatedImages);
        return updatedImages;
      });
  
      // Force update textareas to reflect new captions
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          const url = textarea.closest('div').getAttribute('data-url');
          if (url) {
            const generatedAlt = generatedAltTexts.find(alt => alt.url === url);
            if (generatedAlt) {
              textarea.value = generatedAlt.altText;
            }
            handleCaptionBlur(
              { target: textarea }, 
              url, 
              textarea.value.length
            );
          }
        });
      }, 100);
      
    } catch (error) {
      console.error('Error generating alt text:', error);
      // Show error to user
      alert('Error generating alt text. Please check console for details.');
    }
  };

  const renderCharacterCounter = (text, minCount, maxCount) => {
    const count = text.length;
    let relativeCount = 0;
    let color = '';
    let fontWeight = 'bold';
  
    if (count > maxCount) {
      relativeCount = count - maxCount; // Characters over the limit
      color = 'red';
    } else if (count >= minCount && count <= maxCount) {
      relativeCount = 0; // Within range
      color = 'green';
    } else {
      relativeCount = count - minCount; // Characters below the minimum
      color = 'grey';
    }
  
    return (
      <span
        style={{
          paddingLeft: '5px',
          paddingRight: '5px',
          zIndex: '100',
          position: 'absolute',
          right: '0px',
          bottom: '10px',
          fontSize: '12px',
          color,
          fontWeight,
        }}
      >
        {relativeCount === 0 ? count : relativeCount > 0 ? `+${relativeCount}` : `${relativeCount}`}
      </span>
    );
  };

  const columns = React.useMemo(
    () => [
      {
        Header: 'Page',
        accessor: row => {
          const url = row?.Source || '';
          const startIndex = url.indexOf('.com') + 4;
          return url.substring(startIndex);
        },
        width: 110,
        maxWidth: 110,
        className: 'non-editable-cell',
      },
      {
        Header: 'Image',
        accessor: row => {
          const url = row?.Destination || '';
          const startIndex = url.indexOf('.com') + 4;
          return url.substring(startIndex);
        },
        Cell: props => (
          <EditableCell {...props} updateMyData={updateMyData} />
        ),
        width: 150,
        maxWidth: 150,
      },
      {
        Header: 'Alt',
        accessor: 'Alt Text',
        Cell: props => (
          <EditableCell {...props} updateMyData={updateMyData} />
        ),
        width: 180,
        maxWidth: 180,
      },
      // {
      //   id: 'selection',
      //   Header: '',
      //   Cell: ({ row }) => (
      //     <div
      //       onClick={(e) => {
      //         e.stopPropagation(); // Prevent triggering row click event
      //         handleRowSelection(row, rows, e);
      //       }}
      //       style={{
      //         width: '100%',
      //         height: '100%',
      //         cursor: 'pointer',
      //         display: 'flex',
      //         justifyContent: 'center',
      //         alignItems: 'center'
      //       }}
      //     >
      //       {/* {row.isSelected ? (
      //         <div style={{
      //           width: '8px',
      //           height: '8px',
      //           borderRadius: '50%',
      //           background: '#4285f4'
      //         }}/>
      //       ) : null} */}
      //     </div>
      //   ),
      //   width: 20,
      //   maxWidth: 20,
      // }
    ],
    [updateMyData, lastSelectedAltID]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data: myData,
      defaultColumn: {
        maxSize: 200,
      },
      updateMyData,
      initialState: {
        sortBy: [
          {
            id: 'Alt Text',
            desc: false,
          },
        ],
      },
    },
    useSortBy,
    useRowSelect
  );

  return (
    <div>
      <style>
        {`
          .non-editable-cell {
            max-height: 1.0em;
            overflow: hidden;
            padding: none;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .selected-row {
            background: #F0F8FF !important;
          }
            .data-table {
      user-select: none; /* Prevent text selection */
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
        `}
      </style>{/* Keywords - Sticky */}
{pages.length > 0 && (
  <div style={{
    position: 'sticky',
    top: '0',
    zIndex: 10,
    fontSize: '13px',
    color: 'black',
    border: 'solid 2px blue',
    padding: '8px 12px',
    background: '#deeaf8',
    borderRadius: '4px',
    lineHeight: 1.5,
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: 'calc(80vw - 24px)',
    marginLeft: '20px',
    maxHeight: '60px',
    overflow: 'auto'
  }}>
    {allKeywords}
  </div>
)}
      {/* border: '1px solid #ccc' */}
      <div style={{ marginLeft: '20px', marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
  <div style={{ width: '80vw', display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '260px' }}>
  {Object.values(groupSelectedImages()).map(({ url, caption, count }) => (
  <div key={url} data-url={url} style={{ textAlign: 'center', width: '340px', position: 'relative' }}>
    <img
      src={url}
      alt="Selected"
      style={{ width: '400px', height: '200px', objectFit: 'cover', marginBottom: '5px' }}
    />
    <textarea
      value={caption} // Use controlled component instead of defaultValue
      onChange={(e) => handleCaptionChange(e, url)}
      placeholder="Enter caption"
      style={{ padding: '10px', paddingTop: '8px', height: '6em', width: '100%', resize: 'none', fontSize: '12px', border: '1px solid #bbb' }}
      onFocus={(e) => {
        handleFocus(url, caption, e.target);
        const firstIndex = caption.indexOf('*');
        if (firstIndex !== -1) {
          setTimeout(() => {
            e.target.setSelectionRange(firstIndex, firstIndex + 1);
          }, 0);
        }
      }}
      onBlur={(e) => handleCaptionBlur(e, url, e.target.value.length)}  // Use current value length
      onKeyDown={(e) => handleTabKey(e, e.target)}
    />
    {focusedTextarea === url && renderCharacterCounter(focusedCaption, 100, 125)}
    {count > 1 && (
      <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'grey', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {count}
      </div>
    )}
  </div>
))}
  </div>
</div>

      <div className="flex" style={{marginBottom: '40px', visibility: pages.length > 0 ? 'visible': 'hidden', marginLeft: '20vw', position: 'relative'}}>
        <input
          id="fill-input"
          placeholder="Enter caption, * for wildcard"
          style={{border: 'solid 2px #d5d5d5', width: '770px', resize: 'none', fontSize: '13px' }}
          onChange={handleFillInputChange} // Attach the change handler here
          tabIndex="-1"
        />
        <span
        style={{
          zIndex: '100',
          background: 'white',
          padding: '5px',
          position: 'absolute',
          left: '740px', // Adjust as necessary to position correctly
          bottom: '5px',
          fontSize: '12px',
          color: fillInputCharCount > 125 ? 'red' : 'black',
          fontWeight: fillInputCharCount >= 100 && fillInputCharCount <= 125 ? 'bold' : 'normal',
        }}
      >
        {fillInputCharCount}
      </span>
        <Button onClick={clearCaptions} tabIndex="-1" variant="outline">
          Clear
        </Button>
        <Button onClick={fillCaptions} tabIndex="-1" variant="outline">
          Fill
        </Button>
        <Button onMouseDown={handleReplaceClick} onClick={overwriteMatches} tabIndex="-1" variant="outline">
          Replace All
        </Button>
      </div>
      <div style={{ marginBottom: '20px', marginLeft: '20px' }}>
        <Button onClick={generateAltText} variant="outline">
          Generate Alt Text with AI
        </Button>
      </div>
      {/* <Button
        style={{
          marginLeft: '60vw',
          width: '300px',
          marginBottom: '20px',
          backgroundColor: clicked ? '#f5f5f5' : 'white',
        }}
        variant="outline"
        onClick={createFinalState}
      >
        {clicked ? 'Tags Approved' : 'Approve Alt Tags For Writing'}
      </Button> */}
      <table {...getTableProps()} className="data-table" style={{ fontSize: '12px', marginLeft: '20px', width: '80%' }}>
  <thead>
    {headerGroups.map((headerGroup, headerGroupIndex) => {
      const { key, ...restHeaderGroupProps } = headerGroup.getHeaderGroupProps();
      return (
<tr 
  key={`header-group-${headerGroupIndex}`} 
  {...restHeaderGroupProps}
  style={{
    background: 'white',
    borderBottom: '1px solid #edf2f7',
    height: '48px'
  }}
>
  {headerGroup.headers.map((column, columnIndex) => {
    const { key, ...restColumnProps } = column.getHeaderProps(column.getSortByToggleProps());
    return (
      <th
        key={`header-${columnIndex}`}
        {...restColumnProps}
        style={{
          width: column.width,
          maxWidth: column.maxWidth,
          color: '#64748b',
          fontWeight: '500',
          padding: '12px 16px',
          textAlign: 'left',
          fontSize: '13px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}
        className={column.className}
      >
        {column.render('Header')}
        {column.isSorted && (
          <span style={{ 
            marginLeft: '6px',
            color: '#0f172a'
          }}>
            {column.isSortedDesc ? '↓' : '↑'}
          </span>
        )}
      </th>
    );
  })}
</tr>
      );
    })}
  </thead>
  <tbody {...getTableBodyProps()}>
    {rows.map((row, rowIndex) => {
      prepareRow(row);
      const { key, ...restRowProps } = row.getRowProps();
      return (
        <tr
  key={`row-${rowIndex}`}
  {...restRowProps}
  className={row.isSelected ? 'selected-row' : ''}
  onClick={(e) => handleRowSelection(row, rows, e)}
  style={{ 
    height: '10px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    borderRight: row.isSelected ? '3px solid #4285f4' : '1px solid #e2e8f0',
    background: row.isSelected ? '#e6f2ff' : (rowIndex % 2 === 0 ? '#f8fafc' : 'white'),
  }}
>
  {row.cells.map((cell, cellIndex) => {
    const { key, ...restCellProps } = cell.getCellProps();
    return (
      <td
        key={`cell-${cellIndex}`}
        {...restCellProps}
        style={{
          overflow: 'hidden',
          width: cell.column.width,
          maxWidth: cell.column.maxWidth,
          border: '1px solid #e2e8f0',
          // padding: '8px 12px',
        }}
        className={cell.column.className}
      >
        {cell.render('Cell')}
      </td>
    );
  })}
</tr>
      );
    })}
  </tbody>
</table>


    </div>
  );
};

export default AltTagsPanel;

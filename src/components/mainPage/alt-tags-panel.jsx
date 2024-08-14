'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRowSelect, useSortBy, useTable } from 'react-table';

import { Button } from '@/components/ui/button';
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
  const { altImages } = useClientWebpage();
  const { altImagesProcessed, setAltImagesProcessed } = useClientWebpage();
  const [myData, setMyData] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState(1);
  const [clicked, setClicked] = useState(false);
  const [focusedTextarea, setFocusedTextarea] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [fillInputCharCount, setFillInputCharCount] = useState(0); // Add this line to your state

  useEffect(() => {
    if (altImages) {
      setMyData(altImages.map((row, index) => ({ ...row, id: index.toString() })));
    }
  }, [altImages]);

  useEffect(() => {
    registerFinalState(createFinalState);
  }, [registerFinalState]);

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

  const handleRowSelection = (row, rows, rowIndexInSortedOrder, e) => {
    const uniqueId = row.id; // Use the generated ID as the unique identifier
    if (!uniqueId) return;

    if (e.shiftKey && lastSelectedRowIndex !== null && lastSelectedRowIndex !== rowIndexInSortedOrder) {
      let start, end;
      if (lastSelectedRowIndex > rowIndexInSortedOrder) {
        start = rowIndexInSortedOrder;
        end = lastSelectedRowIndex;
        for (let i = start; i <= end -1; i++) {
          const selectedRow = rows[i];
          selectedRow.toggleRowSelected();
          const selectedId = selectedRow.id;
          if (selectedId) {
            if (selectedRow.isSelected) {
              removeImageFromPreview(selectedId);
            } else {
              addImageToPreview(selectedRow);
            }
          }
        }
      } else {
        start = lastSelectedRowIndex;
        end = rowIndexInSortedOrder;
        for (let i = start - 1; i >= end; i--) {
          const selectedRow = rows[i];
          selectedRow.toggleRowSelected();
          const selectedId = selectedRow.id;
          if (selectedId) {
            if (selectedRow.isSelected) {
              removeImageFromPreview(selectedId);
            } else {
              addImageToPreview(selectedRow);
            }
          }
        }
      }
      setLastSelectedRowIndex(rowIndexInSortedOrder);
    } else {
      row.toggleRowSelected();
      if (row.isSelected) {
        removeImageFromPreview(uniqueId);
      } else {
        addImageToPreview(row);
      }
      setLastSelectedRowIndex(rowIndexInSortedOrder);
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

  const handleCaptionChange = (uniqueId, newCaption) => {
    setSelectedImages(prev => ({
      ...prev,
      [uniqueId]: {
        ...prev[uniqueId],
        caption: newCaption,
      },
    }));
    if (focusedTextarea === uniqueId) {
      setCharCount(newCaption.length);
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

  const handleTabKey = (e, textarea) => {
    if (e.key === 'Tab' || e.key === 'Enter' && !e.shiftKey ) {
      e.preventDefault();
      const currentIndex = textarea.selectionStart;
      const nextIndex = textarea.value.indexOf('*', currentIndex + 1);

      if (nextIndex !== -1) {
        setTimeout(() => {
          textarea.setSelectionRange(nextIndex, nextIndex + 1);
        }, 0);
      } else {
        // Move to the next focusable element
        const formElements = Array.from(document.querySelectorAll('input, button, textarea')).filter(el => el.tabIndex >= 0);
        const currentIndex = formElements.indexOf(textarea);
        const nextElement = formElements[currentIndex + 1] || formElements[0];
        nextElement.focus();
      }
    }
  };

  const handleFocus = (uniqueId, caption) => {
    setFocusedTextarea(uniqueId);
    setCharCount(caption.length);
  };

  const handleFillInputChange = (e) => {
    setFillInputCharCount(e.target.value.length);
  };

  const overwriteMatches = () => {
    if (!focusedTextarea) return;

    const currentCaption = selectedImages[focusedTextarea]?.caption;
    const fillText = document.getElementById('fill-input').value;

    if (!currentCaption) return;

    const updatedImages = { ...selectedImages };

    Object.keys(updatedImages).forEach((uniqueId) => {
      if (updatedImages[uniqueId].caption === currentCaption) {
        updatedImages[uniqueId].caption = fillText;
      }
    });

    setSelectedImages(updatedImages);
  };
  

  const createFinalState = () => {
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
  };

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
          background: 'white',
          paddingLeft: '5px',
          paddingRight: '5px',
          zIndex: '100',
          position: 'absolute',
          right: '0px',
          bottom: '45px',
          fontSize: '12px',
          color,
          fontWeight,
        }}
      >
        {count}
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
        width: 180,
        maxWidth: 180,
      },
      {
        Header: 'Alt',
        accessor: 'Alt Text',
        Cell: props => (
          <EditableCell {...props} updateMyData={updateMyData} />
        ),
        width: 150,
        maxWidth: 150,
      },
      {
        id: 'selection',
        Header: '',
        Cell: ({ row }) => {
          const rowIndexInSortedOrder = rows.findIndex(r => r.id === row.id);
          return (
            <IndeterminateCheckbox
              {...row.getToggleRowSelectedProps()}
              onClick={(e) => {
                handleRowSelection(row, rows, rowIndexInSortedOrder, e);
              }}
            />
          );
        },
        width: 10,
        maxWidth: 10,
      }
    ],
    [updateMyData, lastSelectedRowIndex]
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
            max-height: 1.2em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .selected-row {
            background: #F0F8FF !important;
          }
        `}
      </style>
      <div style={{ marginLeft: '20px', marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <div style={{ width: '80vw', display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '260px' }}>
          {Object.entries(selectedImages).map(([uniqueId, { url, caption }]) => (
            <div key={uniqueId} style={{ textAlign: 'center', width: '400px', position: 'relative' }}>
              <img
                src={url}
                alt="Selected"
                style={{ width: '400px', height: '200px', objectFit: 'cover', marginBottom: '5px' }}
              />
              <textarea
                value={caption}
                onChange={(e) => handleCaptionChange(uniqueId, e.target.value)}
                placeholder="Enter caption"
                style={{width: '100%', resize: 'none', fontSize: '12px' }}
                onFocus={(e) => {
                  handleFocus(uniqueId, caption);
                  const firstIndex = caption.indexOf('*');
                  if (firstIndex !== -1) {
                    setTimeout(() => {
                      e.target.setSelectionRange(firstIndex, firstIndex + 1);
                    }, 0);
                  }
                }}
                onKeyDown={(e) => handleTabKey(e, e.target)}
              />
              {focusedTextarea === uniqueId && renderCharacterCounter(caption, 100, 125)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex" style={{ marginLeft: '27vw', position: 'relative'}}>
        <input
          id="fill-input"
          placeholder="Enter caption, * for wildcard"
          style={{ border: 'solid 1px #d5d5d5', width: '720px', resize: 'none', fontSize: '12px' }}
          onChange={handleFillInputChange} // Attach the change handler here
          tabIndex="-1"
        />
        <span
        style={{
          zIndex: '100',
          background: 'white',
          padding: '5px',
          position: 'absolute',
          left: '680px', // Adjust as necessary to position correctly
          bottom: '5px',
          fontSize: '12px',
          color: fillInputCharCount > 125 ? 'red' : 'black',
          fontWeight: fillInputCharCount >= 100 && fillInputCharCount <= 125 ? 'bold' : 'normal',
        }}
      >
        {fillInputCharCount}
      </span>
        <Button onClick={fillCaptions} tabIndex="-1" variant="outline">
          Fill
        </Button>
        <Button onClick={overwriteMatches} tabIndex="-1" variant="outline">
          Match
        </Button>
      </div>
      <Button
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
      </Button>
      <table {...getTableProps()} style={{ fontSize: '12px', border: 'solid 1px black', marginLeft: '20px', width: '80%' }}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  style={{
                    width: column.width,
                    maxWidth: column.maxWidth,
                    background: 'aliceblue',
                    color: 'black',
                    fontWeight: 'bold',
                  }}
                  className={column.className}
                >
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' v'
                        : ' ^'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr
                {...row.getRowProps()}
                className={row.isSelected ? 'selected-row' : ''}
              >
                {row.cells.map(cell => (
                  <td
                    {...cell.getCellProps()}
                    style={{
                      overflow: 'hidden',
                      width: cell.column.width,
                      maxWidth: cell.column.maxWidth,
                      border: 'solid 1px gray',
                    }}
                    className={cell.column.className}
                  >
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AltTagsPanel;

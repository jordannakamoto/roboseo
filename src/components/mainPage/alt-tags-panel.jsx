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

const AltTagsPanel = () => {
  const { altImages } = useClientWebpage();
  const { altImagesProcessed, setAltImagesProcessed } = useClientWebpage();
  const [myData, setMyData] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState(1);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (altImages) {
      setMyData(altImages.map((row, index) => ({ ...row, id: index.toString() })));
    }
  }, [altImages]);

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
        console.log(start, end);
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
        console.log(start, end);
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
      console.log(rowIndexInSortedOrder)
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

    // Update the corresponding alt text in the table
    // TODO
    // setMyData(old =>
    //   old.map(row => {
    //     if (row.id === uniqueId) {
    //       return {
    //         ...row,
    //         'Alt Text': newCaption,
    //       };
    //     }
    //     return row;
    //   })
    // );
  };

  const createFinalState = () => {
    const updatedRows = Object.entries(selectedImages).map(([uniqueId, { caption }]) => {
      const row = myData.find(row => row.id === uniqueId);
      if (row) {
        return {
          uniqueId,
          page: row.Source, // Use full Source URL from the row
          url: row.Destination, // Use full Destination URL from the row
          originalAlt: row['Alt Text'], // Use full Destination URL from the row
          newAlt: caption,
        };
      }
      return null;
    }).filter(Boolean); // Remove any null values
    console.log("Expected output of alt tag tool:");
    console.log(updatedRows);
    setAltImagesProcessed(updatedRows);

     // Set the clicked state to true for visual feedback
    setClicked(true);

    return updatedRows;
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
      {/* Container for selected images and captions */}
      <div style={{ marginLeft: '20px', marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <div style={{ width: '80vw', display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '260px' }}>
          {Object.entries(selectedImages).map(([uniqueId, { url, caption }]) => (
            <div key={uniqueId} style={{ textAlign: 'center', width: '200px' }}>
              <img
                src={url}
                alt="Selected"
                style={{ width: '200px', height: '200px', objectFit: 'cover', marginBottom: '5px' }}
              />
              <textarea
                value={caption}
                onChange={(e) => handleCaptionChange(uniqueId, e.target.value)}
                placeholder="Enter caption"
                style={{ width: '100%', resize: 'none', fontSize: '12px' }}
              />
            </div>
          ))}
        </div>
      </div>
      <Button style={{marginLeft: '70vw', marginBottom: '20px', backgroundColor: clicked ? '#f5f5f5' : 'white', // Change color based on update status
}} variant="outline" onClick = {(e) => {
                createFinalState();
              }} >
        {clicked ? 'Tags Approved' : 'Approve Alt Tags For Writing'}
      </Button>

      <table {...getTableProps()} style={{ border: 'solid 1px black', marginLeft: '20px', width: '100%' }}>
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



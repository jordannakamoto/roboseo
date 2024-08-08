'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRowSelect, useSortBy, useTable } from 'react-table';

import { useClientWebpage } from '@/contexts/ClientWebpageContext';

// Add a checkbox for row selection
const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    );
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
        resize: 'none', // Prevent resizing
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
        maxHeight: '1.2em', /* Adjust to the height of a single line of text */
      }}
    >
      {value || '\u00A0' /* Non-breaking space for empty cells */}
    </div>
  );
};

const AltTagsPanel = () => {
  const { altImages } = useClientWebpage(); // Assuming this hook provides the altImages data
  const [myData, setMyData] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [startRowId, setStartRowId] = useState(null);
  const [endRowId, setEndRowId] = useState(null);

  const handleMouseDown = (rowId) => {
    setDragging(true);
    setStartRowId(rowId);
  };

  const handleMouseMove = (rowId) => {
    if (dragging){
      setEndRowId(rowId);
      alert(rowId);
      console.log(endRowId)
    }
  };

  const handleMouseUp = () => {
    if (startRowId !== null && endRowId !== null) {
      const startRowIndex = rows.findIndex(row => row.id === startRowId);
      const endRowIndex = rows.findIndex(row => row.id === endRowId);
      const [start, end] = startRowIndex < endRowIndex ? [startRowIndex, endRowIndex] : [endRowIndex, startRowIndex];
      const rowIdsToToggle = rows.slice(start, end + 1).map(r => r.id);
      rowIdsToToggle.forEach(rowId => {
        toggleRowSelected(rowId);
      });
    }
    setDragging(false);
    setStartRowId(null);
    setEndRowId(null);
  };

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (dragging) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [dragging]);

  useEffect(() => {
    if (altImages) {
      setMyData(altImages);
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

  const columns = React.useMemo(
    () => [
      {
        Header: 'Page',
        accessor: row => {
          const url = row.Source;
          const startIndex = url.indexOf('.com') + 4; // Get the index after '.com'
          return url.substring(startIndex); // Return the substring after '.com'
        },
        width: 300,
        maxWidth: 300,
        className: 'non-editable-cell',
      },
      {
        Header: 'Image',
        accessor: 'Destination',
        width: 100,
        maxWidth: 100,
        className: 'non-editable-cell',
      },
      {
        Header: 'Alt',
        accessor: 'Alt Text',
        Cell: props => (
          <EditableCell {...props} updateMyData={updateMyData} />
        ),
        width: 300,
        maxWidth: 300,
      },
      {
        id: 'selection',
        Header: '',
        Cell: ({ row }) => (
          <div
            onMouseDown={() => handleMouseDown(row.id)}
            onMouseMove={() => handleMouseMove(row.id)}
            style={{
              height: '100%',
              width: '100%',
              cursor: 'pointer',
            }}
          />
        ),
        width: 30,
        maxWidth: 30,
      },
    ],
    [updateMyData]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    toggleRowSelected,
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
    useRowSelect,
  );

  return (
    <div>
      <style>
        {`
          .non-editable-cell {
            max-height: 1.2em; /* Adjust to the height of a single line of text */
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .selected-row {
            background: #F0F8FF !important;
          }
        `}
      </style>
      <table {...getTableProps()} style={{ border: 'solid 1px black', width: '100%' }}>
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
                      // background: 'white',
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

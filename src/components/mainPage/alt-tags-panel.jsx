'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSortBy, useTable } from 'react-table';

import { useClientWebpage } from '@/contexts/ClientWebpageContext';

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
        accessor: 'Source',
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
        width: 400,
        maxWidth: 400,
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
    state: { sortBy },
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
    useSortBy
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
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td
                    {...cell.getCellProps()}
                    style={{
                      overflow: 'hidden',
                      width: cell.column.width,
                      maxWidth: cell.column.maxWidth,
                      border: 'solid 1px gray',
                      background: 'white',
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

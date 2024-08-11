'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRowSelect, useSortBy, useTable } from 'react-table';

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
  const [myData, setMyData] = useState([]);
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState(null);

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
          const url = row.Destination;
          const startIndex = url.indexOf('.com') + 4;
          return url.substring(startIndex);
        },
        Cell: props => (
          <EditableCell {...props} updateMyData={updateMyData} />
        ),
        width: 250,
        maxWidth: 250,
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
        Cell: ({ row }) => (
          // ! Bug here... initial selection has troubles
          <IndeterminateCheckbox
            {...row.getToggleRowSelectedProps()}
            onClick={(e) => {
              const rowIndexInSortedOrder = rows.findIndex(r => r.id === row.id);

              if (e.shiftKey && lastSelectedRowIndex !== null) {
                const start = Math.min(lastSelectedRowIndex, rowIndexInSortedOrder);
                const end = Math.max(lastSelectedRowIndex, rowIndexInSortedOrder);

                for (let i = start; i <= end; i++) {
                  rows[i].toggleRowSelected();
                }
              } else {
                row.toggleRowSelected();
                setLastSelectedRowIndex(rowIndexInSortedOrder);
              }
            }}
          />
        ),
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

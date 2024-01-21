'use client'

import React, { useState } from 'react';

import { useTable } from 'react-table';

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateMyData, // This function is used to update the data array
}) => {
  const [value, setValue] = useState(initialValue);

  const onChange = e => {
    setValue(e.target.value);
  };

  const onBlur = () => {
    updateMyData(index, id, value);
  };

  // Return an input element
  return <textarea value={value} onChange={onChange} onBlur={onBlur} />;
};

const TableComponent = ({ columns, data, updateMyData }) => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
    defaultColumn: { Cell: EditableCell },
    updateMyData,
  });

  // Table layout
  return (
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
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
                <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Define columns
const columns = [
  {
    Header: 'Page',
    accessor: 'page',
  },
  {
    Header: 'Title',
    accessor: 'title',
  },
  {
    Header: 'Meta',
    accessor: 'meta',
  },
  {
    Header: 'H1',
    accessor: 'h1',
  },
  {
    Header: 'Copy',
    accessor: 'copy',
  },
];

// Sample data
const data = [
  { page: 'Home', title: 'Welcome', meta: 'Description1', h1: 'Heading1', copy: 'Text1' },
  { page: 'Home', title: 'Welcome', meta: 'Description1', h1: 'Heading1', copy: 'Text1' },
];

// Function to update the data
const updateMyData = (rowIndex, columnId, value) => {
  // Update the data array accordingly
};

const Table = () => {
  return (
    <TableComponent columns={columns} data={data} updateMyData={updateMyData} />
  );
};


export default Table
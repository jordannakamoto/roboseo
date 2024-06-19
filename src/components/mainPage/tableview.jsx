import './tableview.css'; // Make sure to create and import the CSS for styling

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';

// Define a mapping of attributes to their aliases
const attributeAliases = {
  Title: '   ',
  h1: '   ',
  h2: 'h2:',
  meta: '   '
};

const TableView = ({ webpages }) => {
  // Define the rows you want to display for each webpage
  const attributes = ['Title', 'h1', 'h2', 'meta'];

  // State to control the visibility of h2 rows
  const [showH2, setShowH2] = useState(false);
  const [showTable, setShowTable] = useState(true);

  // Toggle the visibility of h2 rows
  const toggleH2 = () => {
    setShowH2(!showH2);
  };

  // Toggle the visibility of the entire table
  const toggleTable = () => {
    setShowTable(!showTable);
  };

  return (
    <div style={{ marginLeft: "30px", position: "relative", minHeight: showTable ? "100vh" : "0", height: showTable ? "100%" : "0", overflow: showTable ? "visible" : "hidden", marginTop: "60px" }}>
      <Button
        style={{ fontSize: '12px', height: "20px", position: "absolute", bottom: "100px", left: "10px" }}
        variant="outline"
        onClick={toggleH2}
      >
        H2
      </Button>
      {showTable && webpages.map((page, pageIndex) => (
        <div key={`page-${pageIndex}`} style={{ marginBottom: "0px" }}>
          <table className="customTable flex" style={{ marginTop: "0px" }}>
            <tbody>
              <tr key={`page-name-${pageIndex}`} className="pageNameRow">
                <td colSpan="2" style={{ fontWeight: 'bold' }}>{page.name}</td>
              </tr>
              {attributes.map((attr, attrIndex) => (
                // Render each attribute in a separate row, conditionally render h2 row
                (attr !== 'h2' || showH2) && (
                  <tr key={`page-${pageIndex}-attr-${attrIndex}`} className="attributeRow">
                    <td className="attributeName">{attributeAliases[attr]}</td>
                    <td className="attributeValue">{page[attr.toLowerCase()]}</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default TableView;

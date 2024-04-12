import './tableview.css'; // Make sure to create and import the CSS for styling

// TableView.jsx
import React from 'react';

const TableView = ({ webpages }) => {
  // Define the rows you want to display for each webpage
  const attributes = ['Title', 'h1', 'h2', 'meta'];

  return (
    <table className="customTable flex" style={{marginTop:"50px"}}>
      <tbody>
        {webpages.map((page, pageIndex) => (
          // Render the page name as a separate row
          <>
            <tr key={`page-name-${pageIndex}`} className="pageNameRow">
              <td colSpan="2" style={{ fontWeight: 'bold' }}>{page.name}</td>
            </tr>
            {attributes.map((attr, attrIndex) => (
              // Render each attribute in a separate row
              <tr key={`page-${pageIndex}-attr-${attrIndex}`} className="attributeRow">
                <td className="attributeName">{attr}</td>
                <td className="attributeValue">{page[attr.toLowerCase()]}</td>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
};

export default TableView;

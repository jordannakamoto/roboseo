import React from 'react';

const LoadingModal = ({ isVisible, message }) => {
  if (!isVisible) return null;
//top-1/4 
  return (
    <div className="fixed inset-x-0 top-10 flex items-center left-10 z-2000">
      {/* White splash background */}
      <div className="fixed inset-0 bg-white"></div>
      
      <div className="relative bg-white p-6 rounded shadow-lg border border-gray-200">
        <p>{message}</p>
        {/* You can add a spinner here */}
      </div>
    </div>
  );
};

export default LoadingModal;

import React from 'react';

const LoadingModal = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg">
        <p>{message}</p>
        {/* You can add a spinner here */}
      </div>
    </div>
  );
};

export default LoadingModal;
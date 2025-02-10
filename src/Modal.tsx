import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
// This defines the structure of props that our Modal component will accept
interface ModalProps {
    isOpen: boolean;        // Controls whether modal is visible
    onClose: () => void;    // Function to call when modal should close
    children: React.ReactNode; // Content to display inside modal
  }
  
  // FC means Function Component - this declares our Modal component
  const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    // If modal isn't open, render nothing
    if (!isOpen) return null;
  
    // The actual modal structure
    return (
      // Overlay is the dark background behind the modal
      <div className="modal-overlay">
        // The actual modal window
        <div className="modal-content">
          // Close button in top-right corner
          <button className="modal-close" onClick={onClose}>×</button>
          // Whatever content was passed to the modal
          {children}
        </div>
      </div>
    );
  };

export default Modal;
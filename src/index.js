import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js'; // Ensure the correct import
import reportWebVitals from './reportWebVitals.js'; // Ensure the correct import
import ErrorBoundary from './ErrorBoundary.js'; // Ensure the correct import

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
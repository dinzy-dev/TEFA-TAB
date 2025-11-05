import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The import statement was malformed and had an incorrect path.
// It has been corrected to properly import the App component.
import App from './src/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
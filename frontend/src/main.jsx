import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Polyfill crypto.randomUUID for non-secure contexts (plain HTTP).
// The native API is restricted to secure contexts (HTTPS / localhost).
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function randomUUID() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    );
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  //<React.StrictMode>
    <App />
  //</React.StrictMode>,
)
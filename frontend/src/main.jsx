import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  //<React.StrictMode>
    <App />
  //</React.StrictMode>,
)

// Signal to vite-plugin-prerender that the page is ready to be captured.
// The prerenderer listens for this custom event before snapshotting the DOM.
document.dispatchEvent(new Event('prerender-ready'))
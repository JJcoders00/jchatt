import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import InstallPage from './components/InstallPage.jsx'
import './index.css'

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {path === '/install' || path === '/download' ? <InstallPage /> : <App />}
  </React.StrictMode>,
)

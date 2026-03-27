import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import { BACKEND_ORIGIN } from './config/runtime.js'

axios.defaults.baseURL = BACKEND_ORIGIN

const nativeFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return nativeFetch(`${BACKEND_ORIGIN}${input}`, init)
  }
  return nativeFetch(input, init)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

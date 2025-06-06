import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'


import { connectSocket } from './services/socket'

// Conecta o socket assim que a aplicação inicia
connectSocket()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
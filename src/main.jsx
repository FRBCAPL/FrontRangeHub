import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { applyEstateAuthLanding } from '@shared/utils/estateAuthLanding.js'
import './index.css'
import 'react-datepicker/dist/react-datepicker.css'

// Must run before the router reads the hash, or the email-confirmation tokens
// are discarded as an unknown route.
applyEstateAuthLanding()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
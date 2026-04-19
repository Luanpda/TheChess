import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import ChessUI from './ChessUI..jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChessUI />
  </StrictMode>,
)

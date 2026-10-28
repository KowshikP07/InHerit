import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SuperAdmin from './pages/admin/SuperAdmin.jsx'
import SuperAdminLogin from './pages/admin/SuperAdminLogin.jsx'
import AuctionLayout from './pages/auctions/AuctionLayout.jsx'
import CreateAuction from './pages/auctions/CreateAuction.jsx'
import BrowseAuctions from './pages/auctions/BrowseAuctions.jsx'
import AuctionDetails from './pages/auctions/AuctionDetails.jsx'
import MyListings from './pages/auctions/MyListings.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/login" element={<SuperAdminLogin />} />
        <Route path="/admin" element={<SuperAdmin />} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route element={<AuctionLayout />}>
          <Route path="/auctions" element={<BrowseAuctions />} />
          <Route path="/auctions/create" element={<CreateAuction />} />
          <Route path="/auctions/:id" element={<AuctionDetails />} />
          <Route path="/my-listings" element={<MyListings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

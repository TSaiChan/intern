import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import "@fortawesome/fontawesome-free/css/all.min.css"

import Login from "./components/Login"
import Register from "./components/Register"
import ResetPassword from "./components/ResetPassword"
import CustomerDashboard from "./components/CustomerDashboard"
import AdminDashboard from "./components/AdminDashboard"
import CompleteProfile from "./components/CustomerProfile"
import SellGoat from "./components/SellGoat"
import MyGoats from "./components/Mygoats"
import BuyGoats from "./components/BuyGoats"
import Wishlist from "./components/Wishlist"
import CustomerLayout from "./components/CustomerLayout"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Customer Routes with Layout */}
        <Route path="/" element={<CustomerLayout />}>
          <Route path="customer-dashboard" element={<CustomerDashboard />} />
          <Route path="complete-profile" element={<CompleteProfile />} />
          <Route path="sell-goat" element={<SellGoat />} />
          <Route path="my-goats" element={<MyGoats />} />
          <Route path="buy-goats" element={<BuyGoats />} />
          <Route path="wishlist" element={<Wishlist />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
import './styles/common.css'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'

import Home from './pages/Home'
import Navbar from './components/shared/Navbar'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
// import Footer from './components/shared/Footer'
import ItemListPage from './pages/ItemListPage'
import ItemCreatePage from './pages/ItemCreatePage'
import ItemEditPage from './pages/ItemEditPage'
import ItemDetailPage from './pages/ItemDetailPage'

import { checkAuthStatusThunk } from './features/authSlice'

function App() {
   const dispatch = useDispatch()
   const { isAuthenticated, user } = useSelector((state) => state.auth) //로그인 상태, 로그인 한 사용자 정보

   // 새로고침시 지속적인 로그인 상태 확인을 위해 사용
   useEffect(() => {
      dispatch(checkAuthStatusThunk())
   }, [dispatch])

   const location = useLocation()
   return (
      <>
         <Navbar isAuthenticated={isAuthenticated} user={user} />

         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/items/list" element={<ItemListPage key={location.key} />} />
            <Route path="/items/create" element={<ItemCreatePage />} />
            <Route path="/items/edit/:id" element={<ItemEditPage />} />
            <Route path="/items/detail/:id" element={<ItemDetailPage />} />
         </Routes>
      </>
   )
}

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { PortfolioProvider } from './context/PortfolioContext'
import Navbar from './components/Navbar/Navbar'
import Landing from './pages/Landing/Landing'
import Trading from './pages/Trading/Trading'
import Portfolio from './pages/Portfolio/Portfolio'
import Feed from './pages/Feed/Feed'
import AITrading from './pages/AITrading/AITrading'
import History from './pages/History/History'
import Investors from './pages/Investors/Investors'

function App() {
  return (
    <BrowserRouter basename="/Finai">
      <PortfolioProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/ai-trading" element={<AITrading />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/history" element={<History />} />
          <Route path="/investors" element={<Investors />} />
        </Routes>
      </PortfolioProvider>
    </BrowserRouter>
  )
}

export default App

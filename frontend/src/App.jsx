import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Simulation from './pages/Simulation';

function App() {
    return (
        <Router>
            <div className="app">
                <header className="header">
                    <div className="header-content">
                        <NavLink to="/" className="logo">
                            <div className="logo-icon">📈</div>
                            <span>My Finance</span>
                        </NavLink>

                        <nav className="nav">
                            <NavLink
                                to="/"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                end
                            >
                                대시보드
                            </NavLink>
                            <NavLink
                                to="/simulation"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                시뮬레이션
                            </NavLink>
                        </nav>
                    </div>
                </header>

                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/stock/:ticker" element={<StockDetail />} />
                        <Route path="/simulation" element={<Simulation />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;

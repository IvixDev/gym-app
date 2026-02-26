import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="app-layout">
            <main className="page-content">
                <Outlet />
            </main>

            <nav className="bottom-nav" id="main-navigation">
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    id="nav-log"
                    end
                >
                    <span className="nav-icon">🏋️</span>
                    <span>Entrenar</span>
                </NavLink>

                <NavLink
                    to="/create"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    id="nav-create"
                >
                    <span className="nav-icon">⚙️</span>
                    <span>Rutinas</span>
                </NavLink>

                <NavLink
                    to="/workouts"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    id="nav-workouts"
                >
                    <span className="nav-icon">📋</span>
                    <span>Workouts</span>
                </NavLink>
            </nav>
        </div>
    );
}

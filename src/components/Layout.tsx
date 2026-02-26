import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
    const { user, signOut } = useAuth();

    return (
        <div className="app-layout">
            {/* Top bar with user info */}
            <header className="top-bar">
                <span className="top-bar-user">
                    {user?.user_metadata?.avatar_url && (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt=""
                            className="top-bar-avatar"
                        />
                    )}
                    {user?.user_metadata?.full_name || user?.email || ''}
                </span>
                <button className="btn-logout" onClick={signOut} title="Cerrar sesión">
                    🚪
                </button>
            </header>

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

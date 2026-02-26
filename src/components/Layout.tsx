import { NavLink, Outlet } from 'react-router-dom';
import { IconLogout, IconBarbell, IconSettings, IconClipboardList } from '@tabler/icons-react';
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
                    <IconLogout size={20} />
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
                    <IconBarbell className="nav-icon" size={24} stroke={1.5} />
                    <span>Entrenar</span>
                </NavLink>

                <NavLink
                    to="/create"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    id="nav-create"
                >
                    <IconSettings className="nav-icon" size={24} stroke={1.5} />
                    <span>Rutinas</span>
                </NavLink>

                <NavLink
                    to="/workouts"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    id="nav-workouts"
                >
                    <IconClipboardList className="nav-icon" size={24} stroke={1.5} />
                    <span>Workouts</span>
                </NavLink>
            </nav>
        </div>
    );
}

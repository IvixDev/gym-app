import { NavLink, Outlet } from 'react-router-dom';
import { IconLogout, IconBarbell, IconChartBar } from '@tabler/icons-react';
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

            <main className="page-content" style={{ paddingBottom: '80px' }}>
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <IconBarbell size={24} />
                    <span>Entrenar</span>
                </NavLink>
                <NavLink to="/stats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <IconChartBar size={24} />
                    <span>Estadísticas</span>
                </NavLink>
            </nav>
        </div>
    );
}

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AdminHome } from './admin/AdminHome';
import { CharacterImageStudio } from './admin/CharacterImageStudio';
import { FriendCharacterAdmin } from './admin/FriendCharacterAdmin';
import { UserAdmin } from './admin/UserAdmin';
import { resolveAppPageTitle, resolveAdminPageTitle, setPageTitle } from './lib/pageTitle';
import './index.css';

const pathname = window.location.pathname.replace(/\/$/, '') || '/';

function isAdminHomePath(path: string): boolean {
  return path === '/admin';
}

function AdminRouter() {
  useEffect(() => {
    setPageTitle(resolveAdminPageTitle(pathname));
    return () => setPageTitle();
  }, []);

  if (isAdminHomePath(pathname)) {
    return <AdminHome />;
  }
  if (pathname.startsWith('/admin/users')) {
    return <UserAdmin />;
  }
  if (pathname.startsWith('/admin/friend-characters')) {
    return <FriendCharacterAdmin />;
  }
  if (pathname.startsWith('/admin/character-images')) {
    return <CharacterImageStudio />;
  }
  window.location.replace('/admin');
  return null;
}

function AppRouter() {
  useEffect(() => {
    setPageTitle(resolveAppPageTitle(pathname));
    return () => setPageTitle();
  }, []);

  return <App />;
}

if (pathname.startsWith('/ai')) {
  window.location.replace('/');
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {pathname.startsWith('/admin') ? <AdminRouter /> : <AppRouter />}
    </StrictMode>,
  );
}

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CharacterImageStudio } from './admin/CharacterImageStudio';
import { FriendCharacterAdmin } from './admin/FriendCharacterAdmin';
import { RealApp } from './real/RealApp';
import { resolveAppPageTitle, resolveAdminPageTitle, setPageTitle } from './lib/pageTitle';
import './index.css';

const pathname = window.location.pathname;

function AdminRouter() {
  useEffect(() => {
    setPageTitle(resolveAdminPageTitle(pathname));
    return () => setPageTitle();
  }, []);

  if (pathname.startsWith('/admin/friend-characters')) {
    return <FriendCharacterAdmin />;
  }
  if (pathname.startsWith('/admin/character-images')) {
    return <CharacterImageStudio />;
  }
  return <App />;
}

function AppRouter() {
  useEffect(() => {
    setPageTitle(resolveAppPageTitle(pathname));
    return () => setPageTitle();
  }, []);

  if (pathname.startsWith('/real')) {
    return <RealApp />;
  }
  return <App />;
}

if (pathname.startsWith('/ai')) {
  window.location.replace('/');
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {pathname.startsWith('/admin/') ? <AdminRouter /> : <AppRouter />}
    </StrictMode>,
  );
}

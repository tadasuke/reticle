import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ModeSelect } from './components/mode/ModeSelect';
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
  return <ModeSelect />;
}

function AppRouter() {
  useEffect(() => {
    setPageTitle(resolveAppPageTitle(pathname));
    return () => setPageTitle();
  }, []);

  if (pathname === '/' || pathname === '') {
    return <ModeSelect />;
  }
  if (pathname.startsWith('/ai')) {
    return <App />;
  }
  if (pathname.startsWith('/real')) {
    return <RealApp />;
  }
  return <ModeSelect />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname.startsWith('/admin/') ? <AdminRouter /> : <AppRouter />}
  </StrictMode>,
);

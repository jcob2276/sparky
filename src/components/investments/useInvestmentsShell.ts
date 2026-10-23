import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackHandler } from '../../lib/native/backStack';

/**
 * Stan powłoki /inwestycje: drawer mobilny, playbook, wyszukiwarka (Ctrl/Cmd+K)
 * oraz obsługa wstecz (popstate + natywny przycisk Android).
 */
export function useInvestmentsShell(activeTab: string, onSelectDashboard: () => void) {
  const navigate = useNavigate();
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleBack = useCallback(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      return;
    }
    if (isPlaybookOpen) {
      setIsPlaybookOpen(false);
      return;
    }
    if (activeTab !== 'dashboard') {
      onSelectDashboard();
      return;
    }
    navigate('/');
  }, [isMobileMenuOpen, isPlaybookOpen, activeTab, onSelectDashboard, navigate]);

  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    window.history.pushState({ modal: 'mobileMenu' }, '');
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    if (window.history.state?.modal === 'mobileMenu') {
      window.history.back();
    }
  }, []);

  const handleOpenPlaybook = useCallback(() => {
    setIsPlaybookOpen(true);
    window.history.pushState({ modal: 'playbook' }, '');
  }, []);

  const handleClosePlaybook = useCallback(() => {
    setIsPlaybookOpen(false);
    if (window.history.state?.modal === 'playbook') {
      window.history.back();
    }
  }, []);

  // Browser popstate handler for drawers and modals
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const modalInState = e.state?.modal;
      if (isMobileMenuOpen && modalInState !== 'mobileMenu') {
        setIsMobileMenuOpen(false);
      }
      if (isPlaybookOpen && modalInState !== 'playbook') {
        setIsPlaybookOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileMenuOpen, isPlaybookOpen]);

  // Native Android/Capacitor hardware back button hygiene
  useBackHandler(() => {
    if (isMobileMenuOpen) {
      handleCloseMobileMenu();
      return true;
    }
    if (isPlaybookOpen) {
      handleClosePlaybook();
      return true;
    }
    if (activeTab !== 'dashboard') {
      onSelectDashboard();
      return true;
    }
    navigate('/');
    return true;
  }, true);

  // Cmd/Ctrl+K otwiera wyszukiwarkę spółek (jedno miejsce dla topbara i sidebaru)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);

  return {
    isPlaybookOpen,
    isMobileMenuOpen,
    isSearchOpen,
    handleBack,
    handleOpenMobileMenu,
    handleCloseMobileMenu,
    handleOpenPlaybook,
    handleClosePlaybook,
    handleOpenSearch,
    handleCloseSearch,
  };
}

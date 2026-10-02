'use client';

import { useRouter } from "next/navigation";
import React, { createContext, useState, useEffect, useCallback } from "react";

export const Context = createContext();

export const ContextProvider = ({ children }) => {
  const router = useRouter();

  // Main SaaS marketing website sidebar (mobile nav toggle)
  const [sidebar, setSidebar] = useState(false);

  // Theme management (light / dark)
  const [theme, setThemeState] = useState('light');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (
        storedTheme === 'dark' ||
        (!storedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        setThemeState('dark');
        document.documentElement.classList.add('dark');
      } else {
        setThemeState('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (_) {}
      return next;
    });
  }, []);

  const goBack = () => {
    router.back();
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check developer/staff session
      const devRes = await fetch('/api/marketing/developer/me').catch(() => null);
      if (devRes && devRes.ok) {
        const devData = await devRes.json();
        if (devData.success && devData.user) {
          setUser(devData.user);
          setLoading(false);
          return;
        }
      }

      // Check creator session
      const creatorRes = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'me' }),
      });
      if (creatorRes.ok) {
        const creatorData = await creatorRes.json();
        if (creatorData.success && creatorData.creator) {
          setUser(creatorData.creator);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      // In guest mode, ignore session fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <Context.Provider
      value={{
        goBack,
        sidebar,
        setSidebar,
        user,
        setUser,
        creator: user,
        loading,
        setLoading,
        reviews,
        setReviews,
        fetchCurrentUser,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </Context.Provider>
  );
};
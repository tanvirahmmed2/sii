'use client';

import { useRouter } from "next/navigation";
import React, { createContext, useState, useEffect, useCallback } from "react";

export const Context = createContext();

export const ContextProvider = ({ children }) => {
  const router = useRouter();

  // Main SaaS marketing website sidebar (mobile nav toggle)
  const [sidebar, setSidebar] = useState(false);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  const goBack = () => {
    router.back();
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check developer/staff session
      const devRes = await fetch('/api/marketing/developer/me');
      if (devRes.ok) {
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

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      }
    } catch (err) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchReviews();
  }, [fetchCurrentUser, fetchReviews]);

  return (
    <Context.Provider
      value={{
        goBack,
        sidebar,
        setSidebar,
        user,
        setUser,
        loading,
        setLoading,
        reviews,
        setReviews,
        fetchCurrentUser,
      }}
    >
      {children}
    </Context.Provider>
  );
};
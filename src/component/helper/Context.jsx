'use client';

import { useRouter } from "next/navigation";
import React, { createContext, useState, useEffect, useCallback } from "react";

export const Context = createContext();

export const ContextProvider = ({ children }) => {
  const router = useRouter();
  const [sidebar, setSidebar] = useState(false);
  const [adminSidebar, setAdminSidebar] = useState(false);
  const [TeacherSidebar, setTeacherSidebar] = useState(false);
  const [studentSidebar, setStudentSidebar] = useState(false);
  const [staffSidebar, setStaffSidebar] = useState(false);

  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState(null);

  // User session state (for developers, creators, and platform staff)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  const goBack = () => {
    router.back();
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check developer/staff session
      const devRes = await fetch('/api/developer/me');
      if (devRes.ok) {
        const devData = await devRes.json();
        if (devData.success && devData.user) {
          setUser(devData.user);
          setLoading(false);
          return;
        }
      }

      // Check creator session
      const creatorRes = await fetch('/api/creator/auth', {
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

  const fetchWebsiteSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/website-settings');
      if (res.ok) {
        const data = await res.json();
        const settings = data.payload?.settings || data.paylod?.settings || data.settings;
        if (settings) {
          setWebsiteSettings(settings);
        }
      }
    } catch (err) {
      console.error('Error fetching website settings in Context:', err);
    }
  }, []);

  const fetchDesignations = useCallback(async () => {
    try {
      const designationsRes = await fetch('/api/authorities/designations');
      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data.payload?.designations || data.paylod?.designations || []);
      }
    } catch (err) {
      console.error('Error fetching designations in Context:', err);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.payload?.classes || data.paylod?.classes || []);
      }
    } catch (err) {
      console.error('Error fetching classes in Context:', err);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    try {
      const clubsRes = await fetch('/api/clubs');
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(data.payload?.clubs || data.paylod?.clubs || []);
      }
    } catch (err) {
      console.error('Error fetching clubs in Context:', err);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchReviews();
    fetchWebsiteSettings();
    fetchDesignations();
    fetchClasses();
    fetchClubs();
  }, [fetchCurrentUser, fetchReviews, fetchWebsiteSettings, fetchDesignations, fetchClasses, fetchClubs]);

  return (
    <Context.Provider
      value={{
        goBack,
        sidebar,
        setSidebar,
        adminSidebar,
        setAdminSidebar,
        TeacherSidebar,
        setTeacherSidebar,
        studentSidebar,
        setStudentSidebar,
        staffSidebar,
        setStaffSidebar,
        classes,
        clubs,
        designations,
        websiteSettings,
        setWebsiteSettings,
        fetchWebsiteSettings,
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
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const AVATAR_COLORS = [
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900',
];

function getColorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function isValidAvatar(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

export default function ChatUsersSwipeBar({
  users = [],
  activeId = null,
  onSelect = null,
  className = '',
}) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-swipe states for touch and mouse
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftPosRef = useRef(0);
  const dragDistanceRef = useRef(0);

  // 1. Sort users: Latest message sender ALWAYS on the left
  const sortedUsers = useMemo(() => {
    if (!Array.isArray(users) || users.length === 0) return [];
    return [...users].sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [users]);

  // 2. Check scroll overflow for navigation buttons
  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [sortedUsers, updateScrollButtons]);

  // 3. Swap buttons action
  const handleScrollPrev = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
  };

  const handleScrollNext = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
  };

  // 4. Mouse drag-to-swipe handling
  const handleMouseDown = (e) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftPosRef.current = el.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    dragDistanceRef.current = Math.abs(walk);
    el.scrollLeft = scrollLeftPosRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Prevent navigation when user was just dragging
  const handleItemClick = (e, item) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (item.onClick) {
      e.preventDefault();
      item.onClick(item);
    } else if (onSelect) {
      e.preventDefault();
      onSelect(item);
    }
  };

  if (sortedUsers.length === 0) return null;

  return (
    <div
      className={`relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 select-none ${className}`}
    >
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollPrev}
          aria-label="Previous chat users"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs"
        >
          ‹
        </button>
      )}

      {/* Swipeable Horizontal Stream */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex items-center gap-3 overflow-x-auto scroll-smooth overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing px-2 py-1 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {sortedUsers.map((user) => {
          const isActive = user.active || (activeId !== null && String(user.id) === String(activeId));
          const name = user.name || 'User';
          const avatarUrl = user.avatar;
          const initial = (name.trim().charAt(0) || 'U').toUpperCase();
          const colorClass = getColorForName(name);

          const content = (
            <div
              className="flex flex-col items-center shrink-0 group"
              title={name}
            >
              {/* User Avatar */}
              <div
                className={`w-10 h-10 rounded relative flex items-center justify-center font-medium text-xs border ${
                  isActive
                    ? 'border-slate-900 dark:border-slate-100 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-200 dark:border-slate-700 group-hover:border-slate-400'
                } ${isValidAvatar(avatarUrl) ? 'bg-slate-100 dark:bg-slate-800 overflow-hidden' : colorClass}`}
              >
                {isValidAvatar(avatarUrl) ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-full h-full object-cover rounded pointer-events-none"
                  />
                ) : (
                  <span className="pointer-events-none">{initial}</span>
                )}

                {/* Unread badge dot */}
                {user.unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] font-medium px-1 rounded bg-rose-50 text-rose-700 border border-rose-200"
                    title={`${user.unreadCount} unread`}
                  >
                    {user.unreadCount}
                  </span>
                )}
              </div>

              {/* User Name */}
              <span
                className={`text-[11px] truncate w-14 sm:w-16 text-center mt-1 pointer-events-none leading-none ${
                  isActive
                    ? 'text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 font-normal'
                }`}
              >
                {name}
              </span>
            </div>
          );

          if (user.href && !user.onClick) {
            return (
              <Link
                key={user.id}
                href={user.href}
                onClick={(e) => handleItemClick(e, user)}
                className="focus:outline-none"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={user.id}
              type="button"
              onClick={(e) => handleItemClick(e, user)}
              className="focus:outline-none cursor-pointer bg-transparent border-0 p-0 m-0"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollNext}
          aria-label="Next chat users"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs"
        >
          ›
        </button>
      )}
    </div>
  );
}

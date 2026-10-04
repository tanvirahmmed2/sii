'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800',
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

  // 2. Check scroll overflow for navigation chevrons
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

  // 3. Swap buttons action (scroll previous / next)
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
      className={`relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xs select-none transition-colors ${className}`}
    >
      {/* Scroll Left Swap Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollPrev}
          aria-label="Previous chat users"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Swipeable Horizontal Stream */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing px-2 py-1 scrollbar-none"
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
              className={`flex flex-col items-center shrink-0 group transition-transform duration-150 ${
                isActive ? 'scale-105' : 'hover:scale-105'
              }`}
              title={name}
            >
              {/* User Avatar Icon */}
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full relative flex items-center justify-center font-bold text-xs sm:text-sm border transition-all ${
                  isActive
                    ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-indigo-400'
                    : 'border-slate-200/80 dark:border-slate-700/80 group-hover:border-indigo-400'
                } ${isValidAvatar(avatarUrl) ? 'bg-slate-100 dark:bg-slate-800 overflow-hidden' : colorClass}`}
              >
                {isValidAvatar(avatarUrl) ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-full h-full object-cover rounded-full pointer-events-none"
                  />
                ) : (
                  <span className="pointer-events-none">{initial}</span>
                )}

                {/* Unread badge dot */}
                {user.unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-xs animate-pulse"
                    title={`${user.unreadCount} unread`}
                  />
                )}
              </div>

              {/* User Name Only */}
              <span
                className={`text-[11px] font-medium truncate w-14 sm:w-16 text-center mt-1.5 pointer-events-none leading-none transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
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

      {/* Scroll Right Swap Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollNext}
          aria-label="Next chat users"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

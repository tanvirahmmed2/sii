'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import {
  BiX,
  BiRightArrowAlt,
  BiGridAlt,
} from 'react-icons/bi';
import { Context } from 'src/component/helper/Context';
import { SITE_NAME } from 'src/lib/database/secret';

export default function Sidebar({ isOpen, onClose }) {
  const { creator } = useContext(Context) || {};

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-sided Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 z-50 lg:hidden flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <Link
              href="/"
              onClick={onClose}
              className="text-lg font-bold text-slate-900 dark:text-white hover:text-secondary transition-colors"
            >
              {SITE_NAME}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl p-1.5 text-slate-500 dark:text-slate-400 hover:text-secondary rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <BiX />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col p-4 space-y-1">

            <Link
              href="/packages"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              Packages
            </Link>

            <Link
              href="/updates"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              Updates
            </Link>

            <Link
              href="/tutorials"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              Tutorials
            </Link>

            <Link
              href="/blogs"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              Blogs
            </Link>

            <Link
              href="/faqs"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              FAQs
            </Link>

            <Link
              href="/reviews"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              Reviews
            </Link>

            <Link
              href="/about"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:text-secondary hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors text-sm"
            >
              About
            </Link>
          </nav>
        </div>

        {/* Footer Actions: Contact, Login, Get Started */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <Link
            href="/contact"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span>Need Help? Contact Us</span>
            <BiRightArrowAlt className="text-base" />
          </Link>

          {creator?.id ? (
            <Link
              href={`/creator/${creator.id}`}
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-secondary hover:bg-secondary-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-secondary/25 transition-all"
            >
              <BiGridAlt className="text-base" />
              <span>Creator Panel</span>
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/creator/login"
                onClick={onClose}
                className="inline-flex items-center justify-center py-2.5 px-3 rounded-full border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
              >
                Login
              </Link>

              <Link
                href="/creator/register"
                onClick={onClose}
                className="inline-flex items-center justify-center py-2.5 px-3 rounded-full bg-secondary hover:bg-secondary-dark text-white font-bold text-xs shadow-md shadow-secondary/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

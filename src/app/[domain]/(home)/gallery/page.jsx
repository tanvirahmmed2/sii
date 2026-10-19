'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const GalleryPage = () => {
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchAllImages = async () => {
      setLoading(true);
      const items = [];

      try {
        // Fetch News
        const newsRes = await fetch(getApiEndpoint('news'));
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          const list = newsData.payload?.news || newsData.paylod?.news || [];
          list.forEach((item) => {
            const img = item.image_url || item.image;
            if (img) {
              items.push({
                id: `news-${item.id}`,
                title: item.title,
                image: img,
                category: 'news',
                categoryLabel: 'News',
                date: item.created_at || item.date,
                link: tenantUrl(`/news/${item.slug || item.id}`)
              });
            }
          });
        }

        // Fetch Club News
        const clubNewsRes = await fetch(getApiEndpoint('club-news'));
        if (clubNewsRes.ok) {
          const clubData = await clubNewsRes.json();
          const list = clubData.payload?.clubNews || clubData.paylod?.clubNews || [];
          list.forEach((item) => {
            const img = item.image_url || item.image;
            if (img) {
              items.push({
                id: `club-news-${item.id}`,
                title: item.title,
                subtitle: item.club_name,
                image: img,
                category: 'club-news',
                categoryLabel: 'Club News',
                date: item.created_at,
                link: tenantUrl(`/club-news/${item.slug || item.id}`)
              });
            }
          });
        }

        // Fetch Events
        const eventsRes = await fetch(getApiEndpoint('events'));
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const list = eventsData.payload?.events || eventsData.paylod?.events || [];
          list.forEach((item) => {
            const img = item.image_url || item.image;
            if (img) {
              items.push({
                id: `events-${item.id}`,
                title: item.title,
                subtitle: item.location,
                image: img,
                category: 'events',
                categoryLabel: 'Events',
                date: item.event_date || item.created_at,
                link: tenantUrl(`/events/${item.slug || item.id}`)
              });
            }
          });
        }

        // Fetch Recognitions
        const recRes = await fetch(getApiEndpoint('recognitions'));
        if (recRes.ok) {
          const recData = await recRes.json();
          const list = recData.payload?.recognitions || recData.paylod?.recognitions || [];
          list.forEach((item) => {
            const img = item.image_url || item.image;
            if (img) {
              items.push({
                id: `recognitions-${item.id}`,
                title: item.title,
                image: img,
                category: 'recognitions',
                categoryLabel: 'Recognitions',
                date: item.date || item.created_at,
                link: tenantUrl(`/recognitions/${item.slug || item.id}`)
              });
            }
          });
        }

        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setGalleryItems(items);
      } catch (err) {
        console.error('Error fetching gallery images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllImages();
  }, [getApiEndpoint, tenantUrl]);

  const categories = [
    { key: 'all', label: 'All Photos' },
    { key: 'events', label: 'Events' },
    { key: 'news', label: 'News' },
    { key: 'club-news', label: 'Club News' },
    { key: 'recognitions', label: 'Recognitions' },
  ];

  const filteredItems = galleryItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const openLightbox = (index) => {
    setLightboxIndex(startIndex + index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev + 1) % filteredItems.length);
    }
  };

  const prevLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Media Archive
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Photo Gallery
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            A visual chronicle of academic ceremonies, campus events, student clubs, and award recognitions.
          </p>
        </motion.div>

        {/* Filter and Search Bar */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter photo category"
              className="input-style w-full py-2 text-xs"
            >
              {categories.map((cat) => {
                const count = cat.key === 'all' 
                  ? galleryItems.length 
                  : galleryItems.filter((i) => i.category === cat.key).length;

                return (
                  <option key={cat.key} value={cat.key}>
                    {cat.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="w-full sm:w-72 flex items-center gap-2 relative">
            <input
              type="text"
              placeholder="Filter by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-style w-full py-2 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div
                  key={n}
                  className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-3 animate-pulse"
                >
                  <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-2">
              <span className="font-serif text-base font-medium text-slate-800 dark:text-slate-200 block">
                No Photographs Found
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No images match the specified search criteria.'
                  : 'No gallery items are currently published.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {paginatedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.35, delay: (index % 10) * 0.04 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    onClick={() => openLightbox(index)}
                    className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-colors cursor-pointer flex flex-col"
                  >
                    <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <Image
                        width={400}
                        height={400}
                        src={item.image}
                        alt={item.title || 'Campus photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider">
                        {item.categoryLabel}
                      </div>
                    </div>

                    <div className="p-3">
                      <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title}
                      </h2>
                      {item.date && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                          {new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} photos
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
                            currentPage === page
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {currentLightboxItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={closeLightbox}
        >
          <div 
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Photo Preview [{startIndex + (lightboxIndex - startIndex) + 1} / {filteredItems.length}]
              </span>
              <button
                onClick={closeLightbox}
                className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Close [ESC]
              </button>
            </div>

            <div className="relative w-full bg-black flex items-center justify-center overflow-hidden min-h-[300px] max-h-[60vh]">
              <Image
                width={800}
                height={600}
                src={currentLightboxItem.image}
                alt={currentLightboxItem.title || 'Preview'}
                className="w-auto max-h-[60vh] object-contain mx-auto"
              />
            </div>

            <div className="p-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20 px-2.5 py-0.5 rounded-full uppercase">
                    {currentLightboxItem.categoryLabel}
                  </span>
                  {currentLightboxItem.date && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(currentLightboxItem.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-base font-medium text-slate-900 dark:text-slate-100">
                  {currentLightboxItem.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevLightbox}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={nextLightbox}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
                <Link
                  href={currentLightboxItem.link}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-primary/20 transition-all"
                >
                  Open Record
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;

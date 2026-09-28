'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiImage, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiExternalLink, 
  FiChevronLeft, 
  FiChevronRight, 
  FiCalendar, 
  FiTag, 
  FiMaximize2 
} from 'react-icons/fi';

const GalleryPage = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const fetchAllImages = async () => {
      setLoading(true);
      const items = [];

      try {
        // Fetch News
        const newsRes = await fetch('/api/news');
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
                link: `/news/${item.slug || item.id}`
              });
            }
          });
        }

        // Fetch Club News
        const clubNewsRes = await fetch('/api/club-news');
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
                link: `/club-news/${item.slug || item.id}`
              });
            }
          });
        }

        // Fetch Events
        const eventsRes = await fetch('/api/events');
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
                link: `/events/${item.slug || item.id}`
              });
            }
          });
        }

        // Fetch Recognitions
        const recRes = await fetch('/api/recognitions');
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
                link: `/recognitions/${item.slug || item.id}`
              });
            }
          });
        }

        // Sort items by date descending
        items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setGalleryItems(items);
      } catch (err) {
        console.error('Error fetching gallery images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllImages();
  }, []);

  const categories = [
    { key: 'all', label: 'All Photos' },
    { key: 'events', label: 'Events' },
    { key: 'news', label: 'News' },
    { key: 'club-news', label: 'Club News' },
    { key: 'recognitions', label: 'Recognitions' },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
    <div className="w-full min-h-screen bg-slate-50/60 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            Institutional Photo Gallery
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm md:text-base leading-relaxed">
            Explore photos and memories from campus events, news announcements, club activities, and student achievements.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full sm:w-64 shrink-0">
            <FiFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
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

          <div className="relative w-full md:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search photo gallery..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <FiX className="text-xs" />
              </button>
            )}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs space-y-3 animate-pulse"
                >
                  <div className="aspect-square bg-slate-200 rounded-xl w-full" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center max-w-md mx-auto space-y-3 shadow-xs">
              <FiImage className="text-slate-300 text-5xl mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Photos Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No images match your active search filter.'
                  : 'No gallery photos have been uploaded yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {paginatedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group bg-white rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-primary transition-all duration-300 flex flex-col"
                  >
                    <div 
                      onClick={() => openLightbox(index)}
                      className="relative w-full aspect-square bg-slate-100 overflow-hidden cursor-pointer"
                    >
                      <Image
                        width={500}
                        height={500}
                        src={item.image}
                        alt={item.title || 'Gallery image'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="p-3 rounded-full bg-white/90 text-primary shadow-lg group-hover:scale-110 transition-transform duration-200">
                          <FiMaximize2 className="text-lg" />
                        </span>
                      </div>

                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                        <FiTag className="text-[10px] text-primary" />
                        <span className="text-[6px] font-bold text-slate-800 uppercase tracking-wider">
                          {item.categoryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-500">
                    Showing <span className="text-slate-800 font-bold">{startIndex + 1}</span> to{' '}
                    <span className="text-slate-800 font-bold">
                      {Math.min(startIndex + itemsPerPage, filteredItems.length)}
                    </span>{' '}
                    of <span className="text-slate-800 font-bold">{filteredItems.length}</span> photos
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                    >
                      <FiChevronLeft className="text-sm" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
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
                      className="p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <FiChevronRight className="text-sm" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {currentLightboxItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors cursor-pointer z-50"
            aria-label="Close Preview"
          >
            <FiX />
          </button>

          {filteredItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightbox();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors cursor-pointer z-50"
                aria-label="Previous image"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightbox();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors cursor-pointer z-50"
                aria-label="Next image"
              >
                <FiChevronRight />
              </button>
            </>
          )}

          <div 
            className="w-auto bg-secondary border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full  bg-secondary flex items-center justify-center overflow-hidden">
              <Image width={500} height={500}
                src={currentLightboxItem.image}
                alt={currentLightboxItem.title || 'Gallery photo preview'}
                className=" w-auto max-w-full object-cover mx-auto"
              />
            </div>

            <div className="p-6 bg-secondary border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-sky-400 bg-sky-950 border border-sky-800/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {currentLightboxItem.categoryLabel}
                  </span>
                  {currentLightboxItem.date && (
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <FiCalendar /> {new Date(currentLightboxItem.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-primary leading-snug">
                  {currentLightboxItem.title}
                </h3>
              </div>

              <Link
                href={currentLightboxItem.link}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
              >
                <span>View Full Article</span>
                <FiExternalLink />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;

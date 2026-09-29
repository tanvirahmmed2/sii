'use client';

import Link from 'next/link';
import React, { useContext } from 'react';
import { FaLocationArrow, FaFacebookF, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import { IoCall, IoMail } from 'react-icons/io5';
import { TenantWebsiteContext } from '../helper/WebsiteContext';

const Footer = () => {
  const { websiteSettings } = useContext(TenantWebsiteContext);

  const schoolName = websiteSettings?.school_name || '';
  const phone = websiteSettings?.contact_phone || '';
  const email = websiteSettings?.contact_email || '';
  const address = websiteSettings?.address || '';

  const mapUrl = websiteSettings?.map_url;

  const renderFooterMap = () => {
    if (!mapUrl) return null;

    if (mapUrl.includes('<iframe')) {
      return (
        <div
          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
          dangerouslySetInnerHTML={{ __html: mapUrl }}
        />
      );
    }

    let iframeSrc = mapUrl;
    if (mapUrl.includes('google.com/maps') && !mapUrl.includes('embed') && address) {
      iframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }

    return (
      <iframe
        src={iframeSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        title="Campus Map"
      ></iframe>
    );
  };

  return (
    <footer className='w-full bg-tertiary-dark text-secondary flex flex-col items-center justify-center shadow-inner px-4 md:px-8 py-8 md:py-12 overflow-x-hidden gap-12 sm:gap-16'>
      <div className='w-full flex flex-col gap-3 md:col-span-2'>
        <h3 className='font-semibold text-sm md:text-base tracking-tight border-b border-primary pb-2 text-secondary'>
          Quick Links
        </h3>
        <div className='w-full grid grid-cols-2 md:grid-cols-4 gap-8 mt-1 text-xs md:text-sm'>
          <div className='flex flex-col gap-2'>
            <Link href={'/'} className='hover:text-secondary transition-colors duration-200'>Home</Link>
            <Link href={'/teachers'} className='hover:text-secondary transition-colors duration-200'>Teachers</Link>
            <Link href={'/notices'} className='hover:text-secondary transition-colors duration-200'>Notice</Link>
            <Link href={'/results'} className='hover:text-secondary transition-colors duration-200'>Results</Link>
          </div>
          <div className='flex flex-col gap-2'>
            <Link href={'/achievements'} className='hover:text-secondary transition-colors duration-200'>Achievements</Link>
            <Link href={'/admission'} className='hover:text-secondary transition-colors duration-200'>Admission Apply</Link>
            <Link href={'/payments'} className='hover:text-secondary transition-colors duration-200'>Bills & Payments</Link>
            <Link href={'/student-fees'} className='hover:text-secondary transition-colors duration-200'>Class Tuition Fees</Link>
          </div>
          <div className='flex flex-col gap-2'>
            <Link href={'/gallery'} className='hover:text-secondary transition-colors duration-200'>Photo Gallery</Link>
            <Link href={'/news'} className='hover:text-secondary transition-colors duration-200'>News Hub</Link>
            <Link href={'/collaborations'} className='hover:text-secondary transition-colors duration-200'>Collaborations</Link>
            <Link href={'/club-news'} className='hover:text-secondary transition-colors duration-200'>Club News</Link>
          </div>
          <div className='flex flex-col gap-2'>
            <Link href={'/verify-student'} className='hover:text-secondary transition-colors duration-200'>Verify Student</Link>
            <Link href={'/verify-id-card'} className='hover:text-secondary transition-colors duration-200'>Verify Student ID Card</Link>
            <Link href={'/verify-testimonial'} className='hover:text-secondary transition-colors duration-200'>Verify Testimonial</Link>
            <Link href={'/verify-tc'} className='hover:text-secondary transition-colors duration-200'>Verify Transfer Certificate</Link>
            <Link href={'/auth/student'} className='hover:text-secondary transition-colors duration-200'>Student Portal</Link>
          </div>
        </div>
      </div>
      <div className='w-full flex flex-col md:flex-row items-start justify-between gap-8 text-xs md:text-sm'>
        <div className='w-full md:w-1/2 flex flex-col gap-3'>
          <h3 className='font-semibold text-sm md:text-base tracking-tight border-b border-primary pb-2 text-secondary'>
            Contact with {schoolName}
          </h3>
          <p className='text-secondary/80 leading-relaxed'>
            Dedicated to academic excellence, innovation, and holistic student development. Reach out to our administrative office for any inquiries.
          </p>
          <div className='flex flex-col gap-2 mt-1'>
            {phone && (
              <p className='w-full flex flex-row gap-2 items-center text-secondary/90'>
                <IoCall className='text-primary shrink-0' /> {phone}
              </p>
            )}
            {email && (
              <p className='w-full flex flex-row gap-2 items-center text-secondary/90'>
                <IoMail className='text-primary shrink-0' /> {email}
              </p>
            )}
            {address && (
              <p className='w-full flex flex-row gap-2 items-center text-secondary/90'>
                <FaLocationArrow className='text-primary shrink-0' /> {address}
              </p>
            )}
          </div>

          {/* Social Links */}
          {(websiteSettings?.facebook_url || websiteSettings?.twitter_url || websiteSettings?.instagram_url || websiteSettings?.youtube_url) && (
            <div className='flex items-center gap-3 mt-3'>
              {websiteSettings.facebook_url && (
                <a
                  href={websiteSettings.facebook_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-2 bg-secondary-dark hover:bg-primary-dark text-white rounded-lg transition-colors'
                  aria-label='Facebook'
                >
                  <FaFacebookF className='text-sm' />
                </a>
              )}
              {websiteSettings.twitter_url && (
                <a
                  href={websiteSettings.twitter_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-2 bg-secondary-dark hover:bg-primary-dark text-white rounded-lg transition-colors'
                  aria-label='Twitter'
                >
                  <FaTwitter className='text-sm' />
                </a>
              )}
              {websiteSettings.instagram_url && (
                <a
                  href={websiteSettings.instagram_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-2 bg-secondary-dark hover:bg-primary-dark text-white rounded-lg transition-colors'
                  aria-label='Instagram'
                >
                  <FaInstagram className='text-sm' />
                </a>
              )}
              {websiteSettings.youtube_url && (
                <a
                  href={websiteSettings.youtube_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-2 bg-secondary-dark hover:bg-primary-dark text-white rounded-lg transition-colors'
                  aria-label='YouTube'
                >
                  <FaYoutube className='text-sm' />
                </a>
              )}
            </div>
          )}
        </div>

        <div className='w-full md:w-1/2 flex flex-col items-center justify-center gap-4 mt-4 md:mt-0'>
          {mapUrl && (
            <div className='w-full max-w-md aspect-video bg-emerald-900/40 border border-primary/80 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 shadow-md'>
              {renderFooterMap()}
            </div>
          )}
          <p className='text-secondary/80 text-center text-xs font-semibold'>
            Copyright reserved © {schoolName} {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import React from 'react';
import NotFoundScreen from 'src/component/common/NotFoundScreen';

export const metadata = {
  title: '404 - Page Not Found',
  description: 'The requested page could not be found.',
};

export default function RootNotFound() {
  return (
    <NotFoundScreen
      title="Page Not Found"
      description="The page you are looking for does not exist, has been removed, or is temporarily unavailable."
      homeUrl="/"
      isTenant={false}
    />
  );
}

import React from 'react';
import NotFoundScreen from 'src/component/common/NotFoundScreen';

export const metadata = {
  title: '404 - Page Not Found',
  description: 'The requested campus page could not be found.',
};

export default function TenantNotFound() {
  return (
    <NotFoundScreen
      title="Page Not Found"
      description="The institutional page, module, or document you requested could not be located in this campus system."
      homeUrl="/"
      isTenant={true}
    />
  );
}

import React from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';

export const metadata = {
  title: 'Loading Campus Portal...',
};

export default function TenantLoading() {
  return <TenantLoader fullScreen={true} label="Loading institutional portal..." />;
}

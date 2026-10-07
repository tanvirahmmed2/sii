import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const metadata = {
  title: 'Loading Creator Studio...',
};

export default function CreatorRootLoading() {
  return <LoadingScreen fullScreen={true} label="Loading Creator Studio..." />;
}

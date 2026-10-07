import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const metadata = {
  title: 'Loading Developer Console...',
};

export default function DevelopersRootLoading() {
  return <LoadingScreen fullScreen={true} label="Loading Developer Console..." />;
}

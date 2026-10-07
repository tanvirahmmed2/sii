import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const metadata = {
  title: 'Loading Developer Access...',
};

export default function DeveloperAuthRootLoading() {
  return <LoadingScreen fullScreen={true} label="Loading Developer Access..." />;
}

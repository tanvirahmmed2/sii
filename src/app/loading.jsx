import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const metadata = {
  title: 'Loading...',
};

export default function RootLoading() {
  return <LoadingScreen fullScreen={true} />;
}

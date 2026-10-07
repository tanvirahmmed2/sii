import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperConsoleLoading() {
  return <LoadingScreen fullScreen={true} label="Loading developer console..." />;
}

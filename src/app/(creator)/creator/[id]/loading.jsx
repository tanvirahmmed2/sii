import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function CreatorWorkspaceLoading() {
  return <LoadingScreen fullScreen={true} label="Loading workspace..." />;
}

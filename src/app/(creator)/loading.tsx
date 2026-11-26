import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';
export const metadata: any = {
    title: 'Loading Creator Studio...',
};
export default function CreatorRootLoading() {
    return <LoadingScreen fullScreen={false} label="Loading Creator Studio..."/>;
}

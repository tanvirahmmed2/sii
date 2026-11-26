import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';
export const metadata: any = {
    title: 'Loading Developer Console...',
};
export default function DevelopersRootLoading() {
    return <LoadingScreen fullScreen={false} label="Loading Developer Console..."/>;
}

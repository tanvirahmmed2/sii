import React from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';
export const metadata: any = {
    title: 'Loading...',
};
export default function HomeLoading() {
    return <LoadingScreen fullScreen={true} label="Loading page..."/>;
}

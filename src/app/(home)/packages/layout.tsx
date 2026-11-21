import { SITE_NAME } from 'src/lib/database/secret';
import React from 'react';
export const metadata: any = {
    title: `Packages | ${SITE_NAME}`,
    description: `Packages site of ${SITE_NAME}`
};
const layout = ({ children }: any) => {
    return <>{children}</>;
};
export default layout;

import { SITE_NAME } from 'src/lib/database/secret';
import React from 'react';
export const metadata: any = {
    title: `About | ${SITE_NAME}`,
    description: `About site of ${SITE_NAME}`
};
const layout = ({ children }: any) => {
    return <>{children}</>;
};
export default layout;

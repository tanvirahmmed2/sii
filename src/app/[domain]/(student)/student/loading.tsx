import React from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
export default function StudentPanelLoading() {
    return <TenantLoader fullScreen={false} label="Loading module..."/>;
}

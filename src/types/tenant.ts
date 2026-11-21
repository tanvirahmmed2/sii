export interface TenantWebsite {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  status: 'active' | 'suspended' | 'pending' | 'expired';
  creator_id: string;
  template_id?: string | null;
  plan_id?: string | null;
  is_verified?: boolean;
  package_id?: string | null;
  package_name?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  theme_color?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  academic_type?: 'school' | 'college' | 'madrasa' | 'university' | 'coaching' | 'other';
}

export interface WebsiteResolutionResult {
  website: TenantWebsite | null;
  isCustomDomain: boolean;
  resolvedHost: string;
  source: 'memory' | 'redis' | 'database' | 'none';
}

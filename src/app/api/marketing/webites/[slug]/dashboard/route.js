import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;

    // Run parallel queries for dashboard aggregation
    const [
      ordersRes,
      appointmentsRes,
      contactsRes,
      supportRes,
      productsRes,
      blogsRes,
      experiencesRes,
      galleryRes,
      servicesRes,
      rolesRes,
    ] = await Promise.all([
      queryDb('SELECT * FROM website_purchase WHERE website_id = $1 ORDER BY id DESC LIMIT 20', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_appointments WHERE website_id = $1 ORDER BY appointment_date DESC, id DESC LIMIT 20', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_contact WHERE website_id = $1 ORDER BY id DESC LIMIT 20', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_support WHERE website_id = $1 ORDER BY id DESC LIMIT 20', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_products WHERE website_id = $1 ORDER BY id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_blogs WHERE website_id = $1 ORDER BY id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_experiences WHERE website_id = $1 ORDER BY sort_order ASC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_gallery WHERE website_id = $1 ORDER BY sort_order ASC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_services WHERE website_id = $1 ORDER BY sort_order ASC, id ASC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT COUNT(*)::int AS count FROM website_roles WHERE website_id = $1', [websiteId]).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const orders = ordersRes.rows;
    const appointments = appointmentsRes.rows;
    const contacts = contactsRes.rows;
    const supportTickets = supportRes.rows;
    const products = productsRes.rows;
    const blogs = blogsRes.rows;

    // Calculate KPIs
    const totalRevenueCents = orders
      .filter((o) => o.payment_status === 'PAID')
      .reduce((acc, o) => acc + Number(o.total_amount_in_cents || 0), 0);
    const totalRevenue = (totalRevenueCents / 100).toFixed(2);

    const pendingAppointments = appointments.filter((a) => a.status === 'PENDING').length;
    const unreadMessages = contacts.filter((c) => c.status === 'NEW').length;
    const openSupport = supportTickets.filter((s) => s.status === 'OPEN').length;

    return NextResponse.json({
      success: true,
      website,
      kpis: {
        totalRevenue: `$${totalRevenue}`,
        totalOrders: orders.length,
        pendingAppointments,
        unreadMessages,
        openSupport,
        activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
        publishedBlogs: blogs.filter((b) => b.is_published).length,
        rolesCount: rolesRes.rows[0]?.count || 0,
      },
      orders,
      appointments,
      contacts,
      supportTickets,
      products,
      blogs,
      experiences: experiencesRes.rows,
      gallery: galleryRes.rows,
      services: servicesRes.rows,
    });
  } catch (error) {
    console.error('Website dashboard API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

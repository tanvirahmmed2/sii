import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, getAdminUser } from '@/lib/auth';
import { recordActivityLog } from '@/lib/logger';

export async function POST(request) {
  try {
    const { name, email, number, address, password } = await request.json();

    // Validation
    if (!name || !email || !number || !address || !password) {
      const res_err_340 = { error: 'All fields (name, email, number, address, password) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_340?.error || res_err_340?.message || 'An error occurred',
        error: res_err_340?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check if admin already exists
    const existingAdmin = await query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existingAdmin.rows.length > 0) {
      const res_err_872 = { error: 'An admin account with this email already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_872?.error || res_err_872?.message || 'An error occurred',
        error: res_err_872?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Save admin
    const newAdmin = await query(
      `INSERT INTO admins (name, email, number, address, password_hash) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, number, address, is_active, created_at`,
      [name, email, number, address, passwordHash]
    );

    const createdAdmin = newAdmin.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_ADMIN',
      entityType: 'admin',
      entityId: createdAdmin.id,
      details: `Registered new administrator: ${createdAdmin.name} (${createdAdmin.email})`
    });

    const res_data_1175 = { message: 'Admin account created successfully.', admin: createdAdmin };

      return NextResponse.json({
        success: true,
        message: res_data_1175?.message || 'Successfully fecthed data',
        paylod: res_data_1175
      }, { status: 201 });
  } catch (error) {
    console.error('Error registering admin:', error);
    const res_err_2046 = { error: 'Failed to create admin account. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2046?.error || res_err_2046?.message || 'An error occurred',
        error: res_err_2046?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

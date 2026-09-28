import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { uploadToCloudinary } from '@/lib/db/cloudinary';

// ============================================================================
// POST: Submit job application for a career post
// ============================================================================
export async function POST(request, context) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Job slug is required.' },
        { status: 400 }
      );
    }

    // 1. Find the career post
    const careerRes = await queryDb(
      `SELECT id, title, is_published, deadline FROM career WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    if (careerRes.rows.length === 0 || !careerRes.rows[0].is_published) {
      return NextResponse.json(
        { success: false, error: 'This job posting is no longer active or does not exist.' },
        { status: 404 }
      );
    }

    const career = careerRes.rows[0];

    // Check deadline if applicable
    if (career.deadline && new Date(career.deadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'The application deadline for this position has passed.' },
        { status: 400 }
      );
    }

    // 2. Parse request (handles multipart/form-data or application/json)
    const contentType = request.headers.get('content-type') || '';
    let applicantName = '';
    let applicantEmail = '';
    let applicantPhone = '';
    let resumeUrl = '';
    let portfolioUrl = '';
    let linkedinUrl = '';
    let coverLetter = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      applicantName = (formData.get('applicant_name') || '').toString().trim();
      applicantEmail = (formData.get('applicant_email') || '').toString().trim().toLowerCase();
      applicantPhone = (formData.get('applicant_phone') || '').toString().trim();
      portfolioUrl = (formData.get('portfolio_url') || '').toString().trim();
      linkedinUrl = (formData.get('linkedin_url') || '').toString().trim();
      coverLetter = (formData.get('cover_letter') || '').toString().trim();

      const resumeFile = formData.get('resume');
      const directResumeUrl = (formData.get('resume_url') || '').toString().trim();

      if (resumeFile && typeof resumeFile === 'object' && resumeFile.size > 0) {
        // Upload resume file to Cloudinary
        try {
          const uploadResult = await uploadToCloudinary(resumeFile, 'portfoliobuilder/resumes');
          if (uploadResult && uploadResult.url) {
            resumeUrl = uploadResult.url;
          }
        } catch (uploadErr) {
          console.error('Cloudinary resume upload error:', uploadErr);
          return NextResponse.json(
            { success: false, error: 'Failed to upload resume document. Please try again or provide a direct link.' },
            { status: 500 }
          );
        }
      } else if (directResumeUrl) {
        resumeUrl = directResumeUrl;
      }
    } else {
      const body = await request.json();
      applicantName = (body.applicant_name || '').toString().trim();
      applicantEmail = (body.applicant_email || '').toString().trim().toLowerCase();
      applicantPhone = (body.applicant_phone || '').toString().trim();
      resumeUrl = (body.resume_url || '').toString().trim();
      portfolioUrl = (body.portfolio_url || '').toString().trim();
      linkedinUrl = (body.linkedin_url || '').toString().trim();
      coverLetter = (body.cover_letter || '').toString().trim();
    }

    // Validation
    if (!applicantName) {
      return NextResponse.json(
        { success: false, error: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!applicantEmail || !applicantEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!resumeUrl) {
      return NextResponse.json(
        { success: false, error: 'Please upload a resume file or provide a valid resume link.' },
        { status: 400 }
      );
    }

    // 3. Save application into career_application table
    const insertRes = await queryDb(
      `
      INSERT INTO career_application (
        career_id,
        applicant_name,
        applicant_email,
        applicant_phone,
        resume_url,
        portfolio_url,
        linkedin_url,
        cover_letter,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING id, career_id, applicant_name, applicant_email, status, created_at
      `,
      [
        career.id,
        applicantName,
        applicantEmail,
        applicantPhone || null,
        resumeUrl,
        portfolioUrl || null,
        linkedinUrl || null,
        coverLetter || null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Your application has been submitted successfully! Our hiring team will review your profile.',
        application: insertRes.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Job application submission error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while submitting your application. Please try again.' },
      { status: 500 }
    );
  }
}

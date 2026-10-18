export const ALL_TASKS = [
  {
    key: 'student_id',
    aliases: ['student_id', 'student_id_card', 'student-id', 'student-id-card'],
    category: 'student_id_card',
    systemTable: 'system_student_id_templates',
    websiteTable: 'website_student_id_templates',
    title: 'Student ID Card Templates',
    defaultWidth: 86.00,
    defaultHeight: 54.00
  },
  {
    key: 'teacher_id',
    aliases: ['teacher_id', 'teacher_id_card', 'teacher-id', 'teacher-id-card'],
    category: 'teacher_id_card',
    systemTable: 'system_teacher_id_templates',
    websiteTable: 'website_teacher_id_templates',
    title: 'Teacher ID Card Templates',
    defaultWidth: 86.00,
    defaultHeight: 54.00
  },
  {
    key: 'officer_id',
    aliases: ['officer_id', 'officer_id_card', 'officer-id', 'officer-id-card'],
    category: 'officer_id_card',
    systemTable: 'system_officer_id_templates',
    websiteTable: 'website_officer_id_templates',
    title: 'Officer ID Card Templates',
    defaultWidth: 86.00,
    defaultHeight: 54.00
  },
  {
    key: 'student_tc',
    aliases: ['student_tc', 'tc', 'student-tc'],
    category: 'tc',
    systemTable: 'system_student_tc_templates',
    websiteTable: 'website_student_tc_templates',
    title: 'Transfer Certificate (TC) Templates',
    defaultWidth: 210.00,
    defaultHeight: 297.00
  },
  {
    key: 'student_testimonial',
    aliases: ['student_testimonial', 'testimonial', 'student-testimonial'],
    category: 'testimonial',
    systemTable: 'system_student_testimonial_templates',
    websiteTable: 'website_student_testimonial_templates',
    title: 'Student Testimonial Templates',
    defaultWidth: 210.00,
    defaultHeight: 297.00
  },
  {
    key: 'student_certificate',
    aliases: ['student_certificate', 'certificate', 'student-certificate'],
    category: 'certificate',
    systemTable: 'system_student_certificate_templates',
    websiteTable: 'website_student_certificate_templates',
    title: 'Student Certificate Templates',
    defaultWidth: 297.00,
    defaultHeight: 210.00
  },
  {
    key: 'payment_receipt',
    aliases: ['payment_receipt', 'payment-receipt'],
    category: 'payment_receipt',
    systemTable: 'system_payment_receipt_templates',
    websiteTable: 'website_payment_receipt_templates',
    title: 'Payment Receipt Templates',
    defaultWidth: 210.00,
    defaultHeight: 297.00
  },
  {
    key: 'poster',
    aliases: ['poster'],
    category: 'poster',
    systemTable: 'system_poster_templates',
    websiteTable: 'website_poster_templates',
    title: 'Campus Poster & Event Flyer Templates',
    defaultWidth: 210.00,
    defaultHeight: 297.00
  }
];

export function resolveTaskConfig(keyOrCategory) {
  if (!keyOrCategory) return null;
  const normalized = String(keyOrCategory).toLowerCase().trim();
  for (const task of ALL_TASKS) {
    if (
      task.key === normalized ||
      task.category === normalized ||
      task.aliases.includes(normalized)
    ) {
      return task;
    }
  }
  return null;
}

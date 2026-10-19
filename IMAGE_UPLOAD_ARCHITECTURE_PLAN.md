# Unified Image Upload & State Management Architecture Plan

> **Document Version:** 1.0.0  
> **Status:** Architecture Implementation Plan  
> **Target:** All Panels (Staff, Teacher, Student, Officer, Creator, Developer) & Tenant/Main Web Frontends  
> **Primary Rule:** **Zero Direct Uploads.** Files must initially stage purely in frontend React state (previews via `URL.createObjectURL`). Image persistence, replacements, and Cloudinary deletions must ONLY execute through the parent table's primary CRUD API transaction (`POST`, `PUT`, `DELETE`).

---

## 1. Executive Summary

A comprehensive audit of the PostgreSQL schemas (`psql/schema.psql`, `psql/website_tables.psql`), API route handlers, and frontend components across the entire platform was conducted to identify every place where images are picked, uploaded, updated, and deleted.

### The Antipattern Identified
In certain components (notably `news-list/[slug]/page.jsx`, `workspace/[domain]/page.jsx`, and `teacher/profile/page.jsx`), file inputs immediately trigger asynchronous network calls directly to Cloudinary or dedicated image endpoints on `onChange` or dedicated "Upload" buttons.  
**Consequences of the Antipattern:**
1. **Orphaned Assets:** If a user uploads photos and then navigates away, clicks "Cancel", or encounters validation errors on the main form, uploaded files permanently consume Cloudinary storage and database rows for records that may never be saved.
2. **Broken Transactional Integrity:** The media asset is committed to storage before the database row's primary constraints (slugs, foreign keys, mandatory text fields) are validated.
3. **Inconsistent UX:** Users expect form changes—including added, reordered, or deleted photos—to be tentative until they click "Save Changes".

### The Target Standard
1. **Frontend Staging Only:** File selection (`<input type="file">`, dropzones) stores the raw `File` object in React component state. Previews are generated via client-side `URL.createObjectURL(file)`.
2. **Main API Transaction Control:** Image upload to Cloudinary and database row linkage must strictly occur inside the parent entity's primary API endpoint (`/api/.../[entity]`) upon form submission (`POST` or `PUT`).
3. **Atomic Deletions:** Deleting an image from an entity marks it for deletion in local state; actual deletion from Cloudinary and PostgreSQL occurs only when the user confirms and saves the form (or when the parent entity itself is deleted).
4. **No Direct Image Endpoints:** Endpoints allowing unlinked or premature uploads (e.g., `news/images/route.js`) will be deprecated/disabled in favor of unified multipart/form-data payloads on the main entity route.

---

## 2. PostgreSQL Database Schema Audit

The PostgreSQL database definitions (`psql/schema.psql` and `psql/website_tables.psql`) define two categories of image-holding tables:

### Category A: Direct Single-Image Columns on Entities
These tables store `image` / `photo_url` and `image_id` / `photo_id` directly on the entity row.

| Table Name | Image Columns | Cloudinary Public ID Column | Foreign Keys & Cascade Rules |
| :--- | :--- | :--- | :--- |
| `websites` | `logo TEXT`, `favicon TEXT` | `logo_id VARCHAR(255)`, `favicon_id VARCHAR(255)` | Parent root tenant table |
| `website_staffs` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_dept_heads` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_teachers` | `photo_url TEXT` | `photo_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_officers` | `photo_url TEXT` | `photo_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_board_members` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_insfrastructure` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_milestons` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_events` | `image TEXT` | `image_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_clubs` | `logo_url TEXT` | `NULL` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_books` | `cover_image_url TEXT`| `NULL` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `website_admission_applicant_info` | `photo_url TEXT`, `signature_url TEXT` | `photo_id VARCHAR(255)` | `website_id REFERENCES websites(id) ON DELETE CASCADE` |
| `developers` | `avatar_url TEXT` | `avatar_id VARCHAR(255)` | Root developer account table |

### Category B: Relational Child Image Tables (One-to-Many & Strict Cascade)
These tables store media collections linked to a parent entity with `ON DELETE CASCADE`.

| Child Table | Parent Table | Columns | Cascade Behavior |
| :--- | :--- | :--- | :--- |
| `website_news_images` | `website_news` | `id`, `website_id`, `news_id`, `image_url TEXT`, `image_id VARCHAR(255)`, `caption TEXT`, `is_cover BOOLEAN`, `display_order INT` | `news_id REFERENCES website_news(id) ON DELETE CASCADE` |
| `website_award_images` | `website_awards` | `id`, `website_id`, `award_id`, `image_url TEXT`, `image_id VARCHAR(255)`, `caption TEXT`, `UNIQUE(award_id)` | `award_id REFERENCES website_awards(id) ON DELETE CASCADE` |
| `website_student_pictures` | `website_students` | `id`, `website_id`, `student_id`, `image_url TEXT`, `image_id VARCHAR(255)`, `is_primary BOOLEAN` | `student_id REFERENCES website_students(id) ON DELETE CASCADE` |
| `website_student_signatures` | `website_students` | `id`, `website_id`, `student_id`, `signature_url TEXT` | `student_id REFERENCES website_students(id) ON DELETE CASCADE` |
| `website_admission_applicant_images`| `website_admission_applicant_info` | `id`, `website_id`, `applicant_id`, `photo_url TEXT`, `photo_public_id VARCHAR(255)`, `signature_url TEXT` | `applicant_id REFERENCES ... ON DELETE CASCADE` |
| `blog_images` | `blog_posts` | `id`, `blog_id`, `image TEXT`, `image_id VARCHAR(255)`, `caption TEXT`, `is_primary BOOLEAN`, `display_order INT` | `blog_id REFERENCES blog_posts(id) ON DELETE CASCADE` |
| `support_images` | `support_messages` | `id`, `message_id`, `image_url TEXT`, `image_id VARCHAR(255)` | `message_id REFERENCES support_messages(id) ON DELETE CASCADE` |

---

## 3. Comprehensive Codebase Audit: Current State vs. Target State

### A. Staff Panel (`src/app/[domain]/(staffs)/staff-panel/*`)

| Page / Component | Current Behavior | Compliance Status | Required Actions |
| :--- | :--- | :--- | :--- |
| `news-list/[slug]/page.jsx` | **VIOLATION**: Calls `POST /api/.../news/images` directly in `onChange` file handler per selected file. Calls `DELETE` and `PUT` immediately on clicking remove/cover/caption. | ❌ Direct Upload Antipattern | **Full Refactor**: Stage newly picked files in `stagedNewImages` state. Stage deletions in `markedDeletedImageIds`. Stage caption/cover edits in `existingImages` state. Send single multipart `FormData` to `PUT /api/[domain]/staff/panel/news` upon clicking "Save Changes". |
| `awards-list/[slug]/page.jsx` | Staged in `selectedPhotoFile` state + local object URL preview. Only uploaded when clicking "Save Changes" via `PUT /api/[domain]/staff/panel/awards`. | ✅ Compliant Pattern | None. (Already conforms to target pattern). |
| `board-members/page.jsx` | Staged in `selectedImageFile` state. Submitted via `FormData` to `POST/PUT /api/[domain]/staff/panel/board-members`. | ✅ Compliant Pattern | Maintain pattern. |
| `department-head/page.jsx` | Staged in `selectedImageFile` state. Submitted via `FormData` to `POST/PUT /api/[domain]/staff/panel/dept-heads`. | ✅ Compliant Pattern | Maintain pattern. |
| `institutional-infrastructure/page.jsx` | Staged in `selectedImageFile` state inside `InstitutionalWorkstation.jsx`. Submitted via `FormData` to `POST/PUT /api/.../infrastructure`. | ✅ Compliant Pattern | Maintain pattern. |
| `institutional-milestones/page.jsx` | Staged in `selectedImageFile` state inside `InstitutionalWorkstation.jsx`. Submitted via `FormData` to `POST/PUT /api/.../milestones`. | ✅ Compliant Pattern | Maintain pattern. |
| `officer-registration/page.jsx` | Staged in `selectedPhotoFile` state. Sent in `FormData` to `POST /api/[domain]/staff/panel/officers`. | ✅ Compliant Pattern | Maintain pattern. |
| `officer-update/page.jsx` | Staged in `selectedPhotoFile` state. Sent in `FormData` to `PUT /api/[domain]/staff/panel/officers`. | ✅ Compliant Pattern | Maintain pattern. |
| `teacher-registration/page.jsx` | Staged in `selectedPhotoFile` state. Sent in `FormData` to `POST /api/[domain]/staff/panel/teacher`. | ✅ Compliant Pattern | Maintain pattern. |
| `teacher-update/page.jsx` | Staged in `selectedPhotoFile` state. Sent in `FormData` to `PUT /api/[domain]/staff/panel/teacher`. | ✅ Compliant Pattern | Maintain pattern. |
| `settings/page.jsx` | Staged in `logoDataUri` / `faviconDataUri` state. Sent in JSON payload to `PUT /api/[domain]/staff/settings` on "Save". | ✅ Compliant | Complies with table-first save. Optional: modernize to multipart `FormData` to avoid large Base64 JSON strings. |

### B. Creator Panel (`src/app/(creator)/creator/*`)

| Page / Component | Current Behavior | Compliance Status | Required Actions |
| :--- | :--- | :--- | :--- |
| `workspace/[domain]/page.jsx` | **VIOLATION**: Has standalone buttons `handleUploadLogoToCloudinary` and `handleUploadFaviconToCloudinary` calling `POST /api/marketing/creator/websites` (`action: 'upload_branding'`) immediately. | ❌ Direct Upload Antipattern | **Refactor**: Remove dedicated upload buttons. Store picked logo/favicon in `logoFile` / `faviconFile` state with local previews. When the user clicks "Save Settings" on the website configuration, include files in the update payload. Deprecate `action: 'upload_branding'`. |
| `workspace/page.jsx` (Modals) | Staged in `logoDataUri` / `faviconDataUri` state. Uploads only on "Create Website" / "Save Changes". | ✅ Compliant | Maintain pattern. |
| `tickets/[ticketId]/page.jsx` | Staged in `selectedImage` state with preview. Sent in `FormData` to `/api/marketing/creator/tickets/[ticketId]` only when message is submitted. | ✅ Compliant | Maintain pattern. |

### C. Teacher Portal (`src/app/[domain]/(teacher)/*`)

| Page / Component | Current Behavior | Compliance Status | Required Actions |
| :--- | :--- | :--- | :--- |
| `teacher/profile/page.jsx` | **VIOLATION**: In `handlePhotoUpload`, immediately calls `axios.put('/api/teacher/me', { image: reader.result })` on file change. | ❌ Direct Upload Antipattern | **Refactor**: Store picked file in `selectedPhotoFile` and `photoPreview` in local state. Photo is only uploaded through `PUT /api/[domain]/teacher/me` when user clicks "Save Profile Changes". Update `/api/[domain]/teacher/me` route to handle file upload and old asset cleanup. |
| `teacher/clubs/news/page.jsx` | Staged in `newsImage` state. Sent to `/api/teacher/clubs` on form submit. | ✅ Compliant | Maintain pattern. |

### D. Student Portal (`src/app/[domain]/(student)/*`)

| Page / Component | Current Behavior | Compliance Status | Required Actions |
| :--- | :--- | :--- | :--- |
| `student/profile/page.jsx` | Staged in `form.image` state. Sent to `PUT /api/student/me` on "Save Profile Changes". | ✅ Compliant | Maintain pattern. Note: ensure `PUT /api/[domain]/student/me` is implemented to process student profile updates. |
| `student/clubs/moderator/page.jsx` | Staged in `newsImage` state. Sent on "Publish Article" submit. | ✅ Compliant | Maintain pattern. |

### E. Developer Panel & Marketing Website

| Page / Component | Current Behavior | Compliance Status | Required Actions |
| :--- | :--- | :--- | :--- |
| `BlogForm.jsx` | Staged in `pendingFiles` state. Uploaded as multipart `FormData` to `POST/PUT /api/marketing/developer/blogs` on publish/draft save. | ✅ Compliant Pattern | Standard reference implementation for multi-image forms. |
| `developer/support/[id]/page.jsx` | Staged in `selectedImage` state. Sent with support message. | ✅ Compliant | Maintain pattern. |
| `careers/[slug]/page.jsx` | PDF/DOC resume staged in `resumeFile` state. Sent with job application. | ✅ Compliant | Maintain pattern. |
| `admission/upload/[id]/page.jsx` | Photo & signature staged in state with dimensional validation. Sent together on final submit. | ✅ Compliant | Maintain pattern. |

---

## 4. Standard Unified Architecture Specifications

### 4.1 Frontend Component Pattern (Single-Image & Multi-Image)

#### Single-Image Pattern (e.g., Teachers, Officers, Board Members, Branding)
```javascript
// 1. Local State
const [selectedFile, setSelectedFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState(initialImageUrl || '');
const [removeImage, setRemoveImage] = useState(false);

// 2. File Selection Handler (STRICTLY NO FETCH)
const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image file (PNG, JPG, WebP).');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image size must be under 5MB.');
    return;
  }

  // Revoke previous object URL to avoid memory leaks
  if (previewUrl && previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }

  setSelectedFile(file);
  setPreviewUrl(URL.createObjectURL(file));
  setRemoveImage(false);
};

// 3. Image Removal Handler (STRICTLY NO FETCH)
const handleRemove = () => {
  if (previewUrl && previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
  setSelectedFile(null);
  setPreviewUrl('');
  setRemoveImage(true);
};

// 4. Form Submit Handler (ONLY HERE IS THE API CALLED)
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('name', name);
    // ... other entity fields ...

    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    if (removeImage) {
      formData.append('remove_image', 'true');
    }

    const res = await fetch(`/api/${domain}/staff/panel/entity`, {
      method: 'PUT',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Saved successfully!');
    }
  } finally {
    setSubmitting(false);
  }
};
```

#### Multi-Image Gallery Pattern (e.g., News Articles, Blogs)
```javascript
// 1. Local State
const [existingImages, setExistingImages] = useState([]); // [{ id, image_url, image_id, caption, is_cover, display_order }]
const [stagedNewImages, setStagedNewImages] = useState([]); // [{ tempId, file, previewUrl, caption, is_cover, display_order }]
const [markedDeletedIds, setMarkedDeletedIds] = useState([]); // [number]

// 2. File Selection Handler (STRICTLY NO FETCH)
const handleAddPhotos = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const newItems = files
    .filter((f) => f.type.startsWith('image/'))
    .map((file, idx) => ({
      tempId: `staged_${Date.now()}_${idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      is_cover: existingImages.length === 0 && stagedNewImages.length === 0 && idx === 0,
      display_order: existingImages.length + stagedNewImages.length + idx,
    }));

  setStagedNewImages((prev) => [...prev, ...newItems]);
  e.target.value = ''; // Reset input
};

// 3. Remove Handler (STRICTLY NO FETCH)
const handleRemoveImage = (item) => {
  if (item.tempId) {
    // It's a staged new image: revoke URL and remove from state
    URL.revokeObjectURL(item.previewUrl);
    setStagedNewImages((prev) => prev.filter((img) => img.tempId !== item.tempId));
  } else if (item.id) {
    // It's an existing image in DB: stage for deletion on save
    setExistingImages((prev) => prev.filter((img) => img.id !== item.id));
    setMarkedDeletedIds((prev) => [...prev, item.id]);
  }
};

// 4. Set Cover & Caption Handlers (STRICTLY NO FETCH)
const handleSetCover = (target) => {
  setExistingImages((prev) =>
    prev.map((img) => ({ ...img, is_cover: img.id === target.id }))
  );
  setStagedNewImages((prev) =>
    prev.map((img) => ({ ...img, is_cover: img.tempId === target.tempId }))
  );
};

const handleUpdateCaption = (target, newCaption) => {
  if (target.tempId) {
    setStagedNewImages((prev) =>
      prev.map((img) => (img.tempId === target.tempId ? { ...img, caption: newCaption } : img))
    );
  } else {
    setExistingImages((prev) =>
      prev.map((img) => (img.id === target.id ? { ...img, caption: newCaption } : img))
    );
  }
};

// 5. Submit Handler (SINGLE ATOMIC REQUEST)
const handleSave = async (e) => {
  e.preventDefault();
  setSaving(true);
  try {
    const formData = new FormData();
    formData.append('id', String(newsId));
    formData.append('title', title);
    // ... other news fields ...

    // Existing images (with updated captions/cover statuses)
    formData.append('existing_images', JSON.stringify(existingImages));

    // Images marked for deletion
    formData.append('deleted_image_ids', JSON.stringify(markedDeletedIds));

    // Staged new files
    stagedNewImages.forEach((item, idx) => {
      formData.append(`new_file_${idx}`, item.file);
      formData.append(
        `new_file_meta_${idx}`,
        JSON.stringify({
          caption: item.caption,
          is_cover: item.is_cover,
          display_order: item.display_order,
        })
      );
    });
    formData.append('new_files_count', String(stagedNewImages.length));

    const res = await fetch(`/api/${domain}/staff/panel/news`, {
      method: 'PUT',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      toast.success('News article and gallery updated!');
      // Cleanup staged object URLs
      stagedNewImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setStagedNewImages([]);
      setMarkedDeletedIds([]);
      // Reload refreshed article data
    }
  } finally {
    setSaving(false);
  }
};
```

---

### 4.2 Backend API Pattern (Database-First, Transactional Cloudinary Sync)

#### Standard Main Entity Handler (`PUT /api/[domain]/staff/panel/news`)
```javascript
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    // 1. Support both multipart/form-data and JSON
    let body = {};
    let filesToUpload = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Parse fields
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('new_file_meta_')) continue;
        if (key.startsWith('new_file_')) {
          const idx = key.replace('new_file_', '');
          const metaRaw = formData.get(`new_file_meta_${idx}`);
          const meta = metaRaw ? JSON.parse(metaRaw) : {};
          filesToUpload.push({ file: value, meta });
        } else {
          body[key] = value;
        }
      }
      if (typeof body.existing_images === 'string') {
        body.existing_images = JSON.parse(body.existing_images);
      }
      if (typeof body.deleted_image_ids === 'string') {
        body.deleted_image_ids = JSON.parse(body.deleted_image_ids);
      }
    } else {
      body = await request.json().catch(() => ({}));
    }

    // 2. Validate and Update Primary Database Entity FIRST
    const newsId = body.id;
    const targetNewsRes = await queryDb(
      `SELECT * FROM website_news WHERE id = $1 AND website_id = $2`,
      [newsId, auth.website.id]
    );
    if (targetNewsRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'News article not found.' }, { status: 404 });
    }

    // Update parent record
    await queryDb(
      `UPDATE website_news
       SET title = COALESCE($1, title),
           summary = COALESCE($2, summary),
           content = COALESCE($3, content),
           category = COALESCE($4, category),
           published_date = COALESCE($5::DATE, published_date),
           is_published = COALESCE($6, is_published),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8`,
      [body.title?.trim(), body.summary, body.content, body.category, body.published_date, body.is_published, newsId, auth.website.id]
    );

    // 3. Process Deletions: Delete from Cloudinary and DB
    if (Array.isArray(body.deleted_image_ids) && body.deleted_image_ids.length > 0) {
      const toDeleteRes = await queryDb(
        `SELECT id, image_id FROM website_news_images WHERE id = ANY($1::bigint[]) AND website_id = $2`,
        [body.deleted_image_ids, auth.website.id]
      );
      for (const row of toDeleteRes.rows) {
        if (row.image_id) {
          await deleteImage(row.image_id).catch(() => {});
        }
      }
      await queryDb(
        `DELETE FROM website_news_images WHERE id = ANY($1::bigint[]) AND website_id = $2`,
        [body.deleted_image_ids, auth.website.id]
      );
    }

    // 4. Process Existing Image Updates (captions, cover designations, order)
    if (Array.isArray(body.existing_images)) {
      for (const img of body.existing_images) {
        if (img.id) {
          await queryDb(
            `UPDATE website_news_images
             SET caption = $1, is_cover = $2, display_order = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND website_id = $5`,
            [img.caption || null, Boolean(img.is_cover), img.display_order || 0, img.id, auth.website.id]
          );
        }
      }
    }

    // 5. Process New File Uploads to Cloudinary & Insert to DB
    for (const item of filesToUpload) {
      const uploadRes = await uploadImage(item.file, `school/${auth.website.id}/news`);
      if (uploadRes?.url) {
        await queryDb(
          `INSERT INTO website_news_images
             (website_id, news_id, image_url, image_id, caption, is_cover, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            auth.website.id,
            newsId,
            uploadRes.url,
            uploadRes.publicId,
            item.meta?.caption || null,
            Boolean(item.meta?.is_cover),
            item.meta?.display_order || 0,
          ]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'News article and images saved successfully.' });
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

## 5. Detailed Refactoring Tasks by Panel

### Task 1: Refactor News Article Gallery in Staff Panel
- **Files to Modify:**
  1. `src/app/[domain]/(staffs)/staff-panel/news-list/[slug]/page.jsx`
  2. `src/app/api/[domain]/staff/panel/news/route.js`
- **Actions:**
  - Convert `handleUploadPhotos` in `news-list/[slug]/page.jsx` to stage files purely in React state (`stagedNewImages`).
  - Convert `handleRemovePhoto` to remove from staged array or mark existing image in `markedDeletedImageIds`.
  - Convert `handleSetCover` and `handleUpdateCaption` to update state only.
  - Refactor `handleSave` to bundle all news data, existing image states, deletion IDs, and staged file objects into a single `FormData` payload.
  - Enhance `news/route.js` `PUT` and `POST` methods to handle `multipart/form-data`, execute entity update first, upload staged files to Cloudinary, insert image rows, and clean up deleted image IDs from Cloudinary.
  - Deprecate direct calls to `src/app/api/[domain]/staff/panel/news/images/route.js`.

### Task 2: Refactor Creator Workspace Domain Branding
- **Files to Modify:**
  1. `src/app/(creator)/creator/[id]/workspace/[domain]/page.jsx`
  2. `src/app/api/marketing/creator/websites/route.js`
- **Actions:**
  - In `workspace/[domain]/page.jsx`:
    - Remove the standalone buttons `handleUploadLogoToCloudinary` and `handleUploadFaviconToCloudinary`.
    - Retain local file selection and preview (`setLogoPreview`, `setLogoFile`, `setFaviconPreview`, `setFaviconFile`).
    - Remove standalone Cloudinary deletion button `handleRemoveLogo` (switch to `remove_logo: true` state flag).
    - When the creator clicks "Save Changes" on the website configuration, include the logo and favicon files/flags in the single save payload.
  - In `api/marketing/creator/websites/route.js`:
    - Process logo and favicon replacements inside the main `update_website` action.
    - Upload new assets, destroy old public IDs, and update database columns `logo`, `logo_id`, `favicon`, `favicon_id` atomically.

### Task 3: Refactor Teacher Profile Workstation
- **Files to Modify:**
  1. `src/app/[domain]/(teacher)/teacher/profile/page.jsx`
  2. `src/app/api/[domain]/teacher/me/route.js`
- **Actions:**
  - In `teacher/profile/page.jsx`:
    - In `handlePhotoUpload`, remove the immediate `axios.put('/api/teacher/me', { image: reader.result })` call.
    - Store the selected `File` in `selectedPhotoFile` state and `URL.createObjectURL(file)` in preview state.
    - On clicking "Save Profile Changes", append the photo file to the `FormData` submitted to `PUT /api/[domain]/teacher/me`.
  - In `api/[domain]/teacher/me/route.js`:
    - Update `PUT` handler to accept `multipart/form-data`.
    - Update teacher details in `website_teachers` table first.
    - If a new photo is included: upload to Cloudinary `school/${website.id}/teachers`, update `photo_url` and `photo_id`, and delete the previous `photo_id` from Cloudinary.

### Task 4: Clean up & Deprecate Redundant Direct Upload API Routes
- **Files to Review / Deprecate:**
  1. `src/app/api/[domain]/staff/panel/news/images/route.js`: Retain for legacy GET reads if needed, but disable unauthenticated/direct POST.
  2. `src/app/api/[domain]/staff/panel/awards/images/route.js`: Verify no callers remain and deprecate.

---

## 6. Verification and Regression Testing Plan

| Test Case | Scenario | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01: Staged News Image Creation** | User selects 3 photos on `news-list/[slug]`, changes captions, designates cover, but does NOT click "Save Changes". User refreshes page. | No new images were uploaded to Cloudinary; no rows were created in `website_news_images`. |
| **TC-02: Atomic News Save with Images** | User selects 2 new photos, edits article title, and clicks "Save Changes". | 1. Database table `website_news` updated.<br>2. Cloudinary receives 2 uploads.<br>3. `website_news_images` inserts 2 rows with matching `news_id`.<br>4. Success toast displayed. |
| **TC-03: Staged News Image Deletion** | User removes an existing photo from the article gallery and clicks "Save Changes". | 1. Image record deleted from `website_news_images`.<br>2. Image destroyed on Cloudinary.<br>3. News article remains intact. |
| **TC-04: News Article Deletion** | Staff deletes a news article containing 5 images. | 1. `website_news` record deleted.<br>2. Cascade deletes rows in `website_news_images`.<br>3. All 5 images destroyed on Cloudinary using their `image_id`. |
| **TC-05: Creator Branding Save** | Creator selects a new PNG logo on `workspace/[domain]`, edits institution name, and clicks "Save Settings". | 1. Logo uploaded to Cloudinary `school/[id]/branding`.<br>2. Previous logo destroyed on Cloudinary.<br>3. `websites` table updated with new `logo` and `logo_id`. |
| **TC-06: Teacher Profile Photo Save** | Teacher selects a new avatar photo, edits phone number, and clicks "Save Profile Changes". | Avatar is NOT uploaded until submit is clicked; upon submit, photo uploaded and linked to `website_teachers`, replacing previous photo asset. |

---

## 7. Implementation Checklist

- [ ] **Phase 1: News Gallery Modernization**
  - [ ] Update `src/app/api/[domain]/staff/panel/news/route.js` to support multipart uploads and atomic gallery management (`new_images`, `existing_images`, `deleted_image_ids`).
  - [ ] Refactor `src/app/[domain]/(staffs)/staff-panel/news-list/[slug]/page.jsx` to state-only image management.
  - [ ] Verify creation, update, cover selection, caption edits, and deletion.
- [ ] **Phase 2: Creator Workspace Branding**
  - [ ] Remove direct Cloudinary upload buttons from `src/app/(creator)/creator/[id]/workspace/[domain]/page.jsx`.
  - [ ] Consolidate logo/favicon upload into the main website settings save action in `src/app/api/marketing/creator/websites/route.js`.
- [ ] **Phase 3: Teacher Profile Workstation**
  - [ ] Modify `src/app/[domain]/(teacher)/teacher/profile/page.jsx` to stage photo selection.
  - [ ] Update `src/app/api/[domain]/teacher/me/route.js` to handle photo upload in the main `PUT` request.
- [ ] **Phase 4: Endpoint Cleanup & Verification**
  - [ ] Audit all panels to verify no rogue `fetch` or `axios` calls remain inside file `onChange` handlers.
  - [ ] Run dev server verification across all panels.

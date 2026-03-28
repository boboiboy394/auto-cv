import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Upload a CV file to Supabase Storage.
 * @param userId - Clerk user ID
 * @param cvId  - Generated UUID for this CV
 * @param fileName - Original filename (will be sanitized)
 * @param fileBuffer - File content as Buffer
 * @param mimeType - File MIME type
 */
export async function uploadCVFile(
  userId: string,
  cvId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ storagePath: string }> {
  const supabase = createSupabaseAdmin();

  // Sanitize filename: keep extension only
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeName = `${cvId}.${ext}`;
  const storagePath = `cvs/${userId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("cvs")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
  }

  return { storagePath: typeof data === "string" ? data : (data as { path: string }).path };
}

/**
 * Delete a CV file from Supabase Storage.
 * @param storagePath - Full path in the cvs bucket (e.g. "cvs/user1/cv1.pdf")
 */
export async function deleteCVFile(storagePath: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from("cvs").remove([storagePath]);
  if (error) {
    // Non-critical — log and continue
    console.error("STORAGE_DELETE_FAILED:", error);
  }
}

/**
 * Download a CV file from Supabase Storage as Buffer.
 */
export async function downloadCVFile(storagePath: string): Promise<Buffer> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from("cvs").download(storagePath);
  if (error || !data) {
    throw new Error(`STORAGE_DOWNLOAD_FAILED: ${error?.message ?? "no data"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

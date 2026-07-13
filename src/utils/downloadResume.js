/**
 * Downloads a resume file with a pretty filename (label + original extension
 * when a label exists, otherwise the original filename).
 *
 * Google Drive resumes: the adapter already returns a blob object URL.
 * Trackur (R2) resumes: the adapter returns a presigned URL that must be
 * fetched to a blob so the browser saves with our filename instead of the
 * UUID storage path.
 *
 * Throws on failure — callers surface errors via `downloadErrorMessage`.
 */
export async function downloadResume(resume, getDownloadUrl) {
  const ext = resume.filename.split('.').pop();
  const filename = resume.label ? `${resume.label}.${ext}` : resume.filename;

  let objUrl;
  if (resume.source === 'gdrive') {
    objUrl = await getDownloadUrl(resume);
  } else {
    const url = await getDownloadUrl(resume);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Download failed');
    const blob = await resp.blob();
    objUrl = URL.createObjectURL(blob);
  }

  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);
}

export function downloadErrorMessage(err) {
  if (err?.name === 'GDriveDisconnectedError') {
    return 'Google Drive disconnected. Reconnect in Settings to download this resume.';
  }
  return 'Failed to download resume';
}

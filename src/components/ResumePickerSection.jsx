import { useCallback, useRef, useState } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArchiveBoxXMarkIcon, DocumentCheckIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Button } from './catalyst';
import ResumeListbox from './ResumeListbox.jsx';
import { downloadResume, downloadErrorMessage } from '../utils/downloadResume.js';
import { useGDriveContext } from '../context/GDriveContext.js';

export default function ResumePickerSection({
  value,
  onChange,
  resumes = [],
  onUploadResume,
  onGetDownloadUrl,
  onManageResumes,
  removeLabel = 'Remove From Job',
}) {
  const {
    enabled: gdriveEnabled,
    connected: gdriveConnected,
    connect: onConnectGdrive,
    pickFromDrive: onPickFromDrive,
  } = useGDriveContext();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const fileInputRef = useRef(null);

  const trackurCount = resumes.filter((r) => r.source !== 'gdrive').length;
  const canUpload = Boolean(onUploadResume) && trackurCount < 10;

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const saved = await onUploadResume(file, '');
      onChange(saved.id);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [onUploadResume, onChange]);

  const handleDownload = useCallback(async () => {
    const resume = resumes.find((r) => r.id === value);
    if (!resume || !onGetDownloadUrl) return;
    setDownloadError(null);
    try {
      await downloadResume(resume, onGetDownloadUrl);
    } catch (err) {
      setDownloadError(downloadErrorMessage(err));
    }
  }, [resumes, value, onGetDownloadUrl]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Attach Resume
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {trackurCount} of 10 Trackur Resumes used
        </span>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col gap-2">
          {onUploadResume && (
            <Button outline onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
              <ArrowUpTrayIcon data-slot="icon" />
              {uploading ? 'Uploading...' : 'Upload resume'}
            </Button>
          )}
          {gdriveEnabled && (
            <Button
              outline
              onClick={gdriveConnected ? () => onPickFromDrive(onChange) : onConnectGdrive}
              className="w-full"
            >
              {gdriveConnected ? 'Pick from Google Drive' : 'Connect Google Drive'}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ResumeListbox
            value={value}
            onChange={onChange}
            resumes={resumes}
            className="flex-1"
          />
          <Menu as="div" className="relative">
            <MenuButton
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/5 transition-colors"
              title="Resume actions"
            >
              <EllipsisVerticalIcon className="size-5" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              transition
              className="z-50 mt-1.5 w-52 origin-top-right rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-zinc-950/10 transition duration-100 data-closed:scale-95 data-closed:opacity-0 dark:bg-zinc-800 dark:ring-white/10"
            >
              {value && onGetDownloadUrl && (
                <MenuItem>
                  <button type="button" onClick={handleDownload} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 data-focus:bg-zinc-950/5 dark:text-zinc-300 dark:data-focus:bg-white/5 transition-colors">
                    <ArrowDownTrayIcon className="size-4" />
                    Download Resume
                  </button>
                </MenuItem>
              )}
              {canUpload && (
                <MenuItem disabled={uploading}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 data-focus:bg-zinc-950/5 dark:text-zinc-300 dark:data-focus:bg-white/5 transition-colors disabled:opacity-50">
                    <ArrowUpTrayIcon className="size-4" />
                    Upload New Resume
                  </button>
                </MenuItem>
              )}
              {gdriveEnabled && (
                <MenuItem>
                  <button
                    type="button"
                    onClick={gdriveConnected ? () => onPickFromDrive(onChange) : onConnectGdrive}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 data-focus:bg-zinc-950/5 dark:text-zinc-300 dark:data-focus:bg-white/5 transition-colors"
                  >
                    <DocumentCheckIcon className="size-4" />
                    {gdriveConnected ? 'Pick from Google Drive' : 'Connect Google Drive'}
                  </button>
                </MenuItem>
              )}
              {value && (
                <MenuItem>
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-amber-600 data-focus:bg-amber-50 dark:text-amber-400 dark:data-focus:bg-amber-950/30 transition-colors"
                  >
                    <ArchiveBoxXMarkIcon className="size-4" />
                    {removeLabel}
                  </button>
                </MenuItem>
              )}
              {onManageResumes && (
                <MenuItem>
                  <button type="button" onClick={onManageResumes} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 data-focus:bg-zinc-950/5 dark:text-zinc-300 dark:data-focus:bg-white/5 transition-colors">
                    <DocumentCheckIcon className="size-4" />
                    Manage Resumes
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Menu>
        </div>
      )}
      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
      {downloadError && <p className="text-xs text-red-500 mt-1">{downloadError}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}

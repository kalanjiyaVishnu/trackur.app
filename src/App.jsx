import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PlusIcon, EllipsisVerticalIcon, ArchiveBoxIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import useJobs from './hooks/useJobs.js';
import useToast from './hooks/useToast.js';
import useDarkMode from './hooks/useDarkMode.js';
import useAuth from './hooks/useAuth.js';
import useResumes from './hooks/useResumes.js';
import useGoogleDrive from './hooks/useGoogleDrive.js';
import useNotifications from './hooks/useNotifications.js';
import useJobFilters from './hooks/useJobFilters.js';
import useModals from './hooks/useModals.js';
import { exportJobsToCsv } from './services/csvService.js';
import { downloadResume, downloadErrorMessage } from './utils/downloadResume.js';
import { STAGES } from './constants.js';
import { GDriveContext } from './context/GDriveContext.js';
import { Button, Select } from './components/catalyst';
import Layout from './components/Layout.jsx';
import FilterBar from './components/FilterBar.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import TableView from './components/TableView.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import AccountSetupScreen from './components/AccountSetupScreen.jsx';

const AddJobForm = lazy(() => import('./components/AddJobForm.jsx'));
const EditJobModal = lazy(() => import('./components/EditJobModal.jsx'));
const ImportModal = lazy(() => import('./components/ImportModal.jsx'));
const ConfirmModal = lazy(() => import('./components/ConfirmModal.jsx'));
const SettingsModal = lazy(() => import('./components/SettingsModal.jsx'));
const ResumesModal = lazy(() => import('./components/ResumesModal.jsx'));
const StatsView = lazy(() => import('./components/StatsView.jsx'));

function App() {
  const auth = useAuth();
  const { jobs, loading, addJob, updateJob, deleteJob, importJobs, replaceAllJobs, clearResumeId } = useJobs(auth.user?.id);
  const { resumes, uploadResume, renameResume, deleteResume, getDownloadUrl, linkDriveFile } = useResumes(auth.user?.id);
  const gdrive = useGoogleDrive();
  const { toasts, showToast, dismissToast, removeToast } = useToast();
  const { dark, toggle: toggleDark } = useDarkMode();

  const [view, setView] = useState(() => localStorage.getItem('viewPreference') || 'board');

  const {
    search, setSearch,
    stageFilter, setStageFilter,
    dueOnly, setDueOnly,
    showArchived, setShowArchived,
    sortKey, sortDir, handleSort,
    filteredJobs, dueCount, clearFilters,
  } = useJobFilters(jobs);

  const {
    addJobOpen, setAddJobOpen, addJobInitialStage, openAddJob,
    importOpen, setImportOpen,
    deleteConfirm, setDeleteConfirm,
    editingJobId, setEditingJobId,
    settingsOpen, setSettingsOpen,
    resumesOpen, setResumesOpen,
  } = useModals();

  const handleViewChange = useCallback((v) => {
    setView(v);
    localStorage.setItem('viewPreference', v);
  }, []);

  const { notificationsSupported, permissionState, requestPermission } = useNotifications(jobs, auth.profile);

  const editingJob = useMemo(
    () => editingJobId ? jobs.find((j) => j.id === editingJobId) : null,
    [jobs, editingJobId]
  );

  const handleAdd = useCallback(async (job) => {
    try {
      await addJob(job);
      showToast('Job added');
    } catch (err) {
      showToast('Failed to add job: ' + err.message, 'error');
    }
  }, [addJob, showToast]);

  const handleUpdate = useCallback(async (id, updates) => {
    try {
      await updateJob(id, updates);
      showToast('Job updated');
    } catch (err) {
      showToast('Failed to update job: ' + err.message, 'error');
    }
  }, [updateJob, showToast]);

  const handleUpdateStage = useCallback(async (id, stage) => {
    try {
      await updateJob(id, { stage });
      showToast('Job moved to ' + stage);
    } catch (err) {
      showToast('Failed to move job: ' + err.message, 'error');
    }
  }, [updateJob, showToast]);

  const handleDeleteRequest = useCallback((id) => {
    setDeleteConfirm(id);
  }, [setDeleteConfirm]);

  const handleEditRequest = useCallback((id) => {
    setEditingJobId(id);
  }, [setEditingJobId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirm != null) {
      try {
        await deleteJob(deleteConfirm);
        setDeleteConfirm(null);
        showToast('Job deleted');
      } catch (err) {
        showToast('Failed to delete job: ' + err.message, 'error');
      }
    }
  }, [deleteConfirm, deleteJob, setDeleteConfirm, showToast]);

  const handleExport = useCallback(() => {
    exportJobsToCsv(jobs);
    showToast('CSV exported');
  }, [jobs, showToast]);

  const handleImport = useCallback(async (newJobs) => {
    try {
      const { inserted, total } = await importJobs(newJobs);
      const skipped = newJobs.length - inserted;
      if (inserted === 0) {
        showToast(`No new jobs imported — all ${newJobs.length} row${newJobs.length !== 1 ? 's' : ''} already exist (${total} total)`);
      } else {
        const skippedNote = skipped > 0 ? `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : '';
        showToast(`Imported ${inserted} new job${inserted !== 1 ? 's' : ''}${skippedNote} (${total} total)`);
      }
    } catch (err) {
      showToast('Failed to import jobs: ' + err.message, 'error');
    }
  }, [importJobs, showToast]);

  const handleReplace = useCallback(async (newJobs) => {
    try {
      await replaceAllJobs(newJobs);
      showToast(`Replaced with ${newJobs.length} job${newJobs.length !== 1 ? 's' : ''}`);
    } catch (err) {
      showToast('Failed to replace jobs: ' + err.message, 'error');
    }
  }, [replaceAllJobs, showToast]);

  const handleDeleteResume = useCallback(async (id) => {
    await deleteResume(id);
    clearResumeId(id);
  }, [deleteResume, clearResumeId]);

  const handleViewResumeForJob = useCallback(async (job) => {
    const resume = resumes.find((r) => r.id === job.resumeId);
    if (!resume) return;
    try {
      await downloadResume(resume, getDownloadUrl);
    } catch (err) {
      showToast(downloadErrorMessage(err), 'error');
    }
  }, [resumes, getDownloadUrl, showToast]);

  const handlePickFromDrive = useCallback(async (onLinked) => {
    try {
      await gdrive.openPicker(async (metadata) => {
        try {
          const saved = await linkDriveFile({
            ...metadata,
            label: '',
          });
          if (onLinked) await onLinked(saved.id);
          showToast(
            saved.alreadyLinked
              ? 'Resume already in your library — attached it to this job'
              : 'Google Drive resume linked'
          );
        } catch (err) {
          showToast('Failed to link Google Drive resume: ' + err.message, 'error');
        }
      });
    } catch (err) {
      if (err.message === 'Google Drive is not connected') {
        showToast('Google Drive is not connected. Please reconnect in Settings.', 'error');
        gdrive.refreshStatus();
      } else {
        showToast('Failed to open Google Drive picker: ' + err.message, 'error');
      }
    }
  }, [gdrive, linkDriveFile, showToast]);

  const handleConnectGdrive = useCallback(async () => {
    try {
      await gdrive.connect();
    } catch {
      showToast('Failed to connect Google Drive', 'error');
    }
  }, [gdrive, showToast]);

  const handleDisconnectGdrive = useCallback(async () => {
    try {
      await gdrive.disconnect();
      showToast('Google Drive disconnected');
    } catch {
      showToast('Failed to disconnect Google Drive', 'error');
    }
  }, [gdrive, showToast]);

  const gdriveCtx = useMemo(() => ({
    enabled: gdrive.enabled,
    connected: gdrive.connected,
    connect: handleConnectGdrive,
    disconnect: handleDisconnectGdrive,
    pickFromDrive: handlePickFromDrive,
  }), [gdrive.enabled, gdrive.connected, handleConnectGdrive, handleDisconnectGdrive, handlePickFromDrive]);

  // Auth loading
  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-zinc-200 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  // Not signed in — show auth screen
  if (!auth.session) {
    return (
      <LoginScreen
        signInWithGoogle={auth.signInWithGoogle}
        signInWithGithub={auth.signInWithGithub}
        signInWithLinkedin={auth.signInWithLinkedin}
      />
    );
  }

  // Profile loading
  if (!auth.profileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-zinc-200 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  // Profile setup required
  if (!auth.profile?.setupComplete) {
    return (
      <AccountSetupScreen
        user={auth.user}
        onComplete={auth.refreshProfile}
      />
    );
  }

  // Jobs loading — gate first paint on jobs only. Resumes load in the
  // background and fill in the card indicators / pickers as they arrive
  // (every consumer tolerates an empty resumes array). Render the full
  // Layout shell (header + tray) so the chrome appears instantly while
  // jobs finish, instead of a bare full-screen spinner.
  if (loading) {
    return (
      <Layout dark={dark} onToggleDark={toggleDark} user={auth.user} profile={auth.profile} onSignOut={auth.signOut} onSettings={() => setSettingsOpen(true)} onResumes={() => setResumesOpen(true)} showToast={showToast}>
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </Layout>
    );
  }

  const showFilters = view !== 'stats';

  return (
    <GDriveContext.Provider value={gdriveCtx}>
    <Layout dark={dark} onToggleDark={toggleDark} user={auth.user} profile={auth.profile} onSignOut={auth.signOut} onSettings={() => setSettingsOpen(true)} onResumes={() => setResumesOpen(true)} showToast={showToast}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {showFilters && (
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            stageFilter={stageFilter}
            onStageFilterChange={setStageFilter}
            hideStageFilter={view === 'board'}
            hideMobileExtras
          />
        )}

        {showFilters && dueCount > 0 && (
          <button
            type="button"
            onClick={() => setDueOnly(!dueOnly)}
            title={dueOnly ? 'Show all jobs' : 'Show only jobs with steps due'}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
              dueOnly
                ? 'bg-amber-100 text-amber-800 ring-amber-600/30 dark:bg-amber-400/20 dark:text-amber-300 dark:ring-amber-400/30'
                : 'bg-amber-50 text-amber-700 ring-amber-600/20 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20 dark:hover:bg-amber-400/20'
            }`}
          >
            <ClockIcon className="size-3.5" />
            {dueCount} due
          </button>
        )}

        {/* Mobile overflow menu */}
        <Popover className="relative md:hidden ml-auto">
          <PopoverButton as={Button} plain title="More actions">
            <EllipsisVerticalIcon data-slot="icon" className="size-7!" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-2 w-56 rounded-lg bg-white p-3 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-white/10 transition duration-100 data-closed:opacity-0 data-closed:scale-95"
          >
            {({ close }) => (
              <div className="flex flex-col gap-3">
                {view === 'table' && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Filter Stage</p>
                    <Select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="w-full"
                    >
                      <option value="">All Stages</option>
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">View</p>
                  <ViewToggle view={view} onViewChange={(v) => { handleViewChange(v); close(); }} />
                </div>
                <div className="border-t border-zinc-950/5 dark:border-white/5 pt-2 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => { setShowArchived(!showArchived); close(); }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                  >
                    <ArchiveBoxIcon className="size-4" />
                    {showArchived ? 'Show active jobs' : 'Show archived jobs'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleExport(); close(); }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                  >
                    <ArrowDownTrayIcon className="size-4" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportOpen(true); close(); }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                  >
                    <ArrowUpTrayIcon className="size-4" />
                    Import CSV
                  </button>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Popover>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <ViewToggle view={view} onViewChange={handleViewChange} />
          {showFilters && (
            <Button
              plain
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Show active jobs' : 'Show archived jobs'}
              className={showArchived ? 'bg-mauve-500/10 text-mauve-700! dark:bg-mauve-500/20 dark:text-mauve-300!' : ''}
            >
              <ArchiveBoxIcon data-slot="icon" />
            </Button>
          )}
          <Button plain onClick={handleExport} title="Export CSV">
            <ArrowDownTrayIcon data-slot="icon" />
          </Button>
          <Button plain onClick={() => setImportOpen(true)} title="Import CSV">
            <ArrowUpTrayIcon data-slot="icon" />
          </Button>
          <Button color="violet" onClick={() => openAddJob()}>
            <PlusIcon data-slot="icon" />
            Add Job
          </Button>
        </div>
      </div>

      {/* Mobile FAB — only shows when add dialog is closed */}
      {!addJobOpen && (
        <button
          type="button"
          onClick={() => openAddJob()}
          aria-label="Add job"
          className="fixed bottom-6 right-6 z-40 md:hidden flex items-center justify-center size-14 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 active:bg-violet-800 dark:bg-violet-400 dark:text-violet-950 dark:hover:bg-violet-300 dark:active:bg-violet-500 transition-colors"
        >
          <PlusIcon className="size-7" />
        </button>
      )}

      {view === 'stats' ? (
        <Suspense fallback={<div className="py-16 text-center text-zinc-500 dark:text-zinc-400">Loading...</div>}>
          <StatsView jobs={jobs} />
        </Suspense>
      ) : filteredJobs.length === 0 && jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">Click "Add Job" to get started.</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            {showArchived && !search && !stageFilter && !dueOnly
              ? 'No archived jobs.'
              : 'No jobs match your current search or filter.'}
          </p>
          <Button outline onClick={clearFilters} className="mt-3">
            {showArchived && !search && !stageFilter && !dueOnly ? 'Back to active jobs' : 'Clear filters'}
          </Button>
        </div>
      ) : view === 'board' ? (
        <KanbanBoard jobs={filteredJobs} onUpdate={handleUpdate} onDelete={handleDeleteRequest} onEdit={handleEditRequest} onUpdateStage={handleUpdateStage} onViewResume={handleViewResumeForJob} resumes={resumes} onAddJob={openAddJob} />
      ) : (
        <TableView jobs={filteredJobs} onUpdate={handleUpdate} onDelete={handleDeleteRequest} onEdit={handleEditRequest} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
      )}

      <Suspense fallback={null}>
        <AddJobForm open={addJobOpen} onClose={() => setAddJobOpen(false)} onAdd={handleAdd} initialStage={addJobInitialStage} resumes={resumes} onUploadResume={uploadResume} />

        {editingJob && (
          <EditJobModal
            job={editingJob}
            onUpdate={handleUpdate}
            onDelete={handleDeleteRequest}
            onClose={() => setEditingJobId(null)}
            resumes={resumes}
            onGetDownloadUrl={getDownloadUrl}
            onUploadResume={uploadResume}
            onManageResumes={() => setResumesOpen(true)}
          />
        )}

        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
          onReplace={handleReplace}
        />

        <ConfirmModal
          open={deleteConfirm != null}
          title="Delete Job"
          message="Are you sure you want to delete this job? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={auth.user}
          profile={auth.profile}
          refreshProfile={auth.refreshProfile}
          notificationsSupported={notificationsSupported}
          permissionState={permissionState}
          requestPermission={requestPermission}
        />

        <ResumesModal
          open={resumesOpen}
          onClose={() => setResumesOpen(false)}
          resumes={resumes}
          onUploadResume={uploadResume}
          onRenameResume={renameResume}
          onDeleteResume={handleDeleteResume}
          onGetDownloadUrl={getDownloadUrl}
        />
      </Suspense>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} onRemove={removeToast} />
    </Layout>
    </GDriveContext.Provider>
  );
}

export default App;

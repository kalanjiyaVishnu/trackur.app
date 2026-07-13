import { useState, useCallback } from 'react';

/**
 * Owns the open/close state for every modal and slide-out panel, previously
 * seven separate useState calls in App.jsx.
 */
export default function useModals() {
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [addJobInitialStage, setAddJobInitialStage] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resumesOpen, setResumesOpen] = useState(false);

  const openAddJob = useCallback((stage) => {
    setAddJobInitialStage(stage || null);
    setAddJobOpen(true);
  }, []);

  return {
    addJobOpen, setAddJobOpen, addJobInitialStage, openAddJob,
    importOpen, setImportOpen,
    deleteConfirm, setDeleteConfirm,
    editingJobId, setEditingJobId,
    settingsOpen, setSettingsOpen,
    resumesOpen, setResumesOpen,
  };
}

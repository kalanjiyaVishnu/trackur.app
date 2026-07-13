import { useState, useMemo, useCallback } from 'react';
import { isDueOrOverdue } from '../utils/formatDate.js';

function jobHasDueTodo(job) {
  return (job.todos ?? []).some((t) => !t.completed && isDueOrOverdue(t.dueDate));
}

/**
 * Owns the toolbar filter/sort state that was previously inline in App.jsx:
 * search, stage filter, due-only filter, archived view, and table sort
 * (persisted to localStorage as 'tableSortPreference').
 *
 * `filteredJobs` hides archived jobs by default; `showArchived` flips the
 * view to archived-only. `dueCount` counts active jobs with an uncompleted
 * todo due today or earlier.
 */
export default function useJobFilters(jobs) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tableSortPreference'));
      return { key: saved?.key || 'dateApplied', dir: saved?.dir || 'desc' };
    } catch {
      return { key: 'dateApplied', dir: 'desc' };
    }
  });

  const handleSort = useCallback((key) => {
    setSort((prev) => {
      const next = { key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' };
      localStorage.setItem('tableSortPreference', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStageFilter('');
    setDueOnly(false);
    setShowArchived(false);
  }, []);

  const dueCount = useMemo(
    () => jobs.filter((j) => !j.archivedAt && jobHasDueTodo(j)).length,
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    let result = jobs.filter((j) => (showArchived ? j.archivedAt : !j.archivedAt));
    if (stageFilter) {
      result = result.filter((j) => j.stage === stageFilter);
    }
    if (dueOnly) {
      result = result.filter(jobHasDueTodo);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.company?.toLowerCase().includes(q) ||
          j.role?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, search, stageFilter, dueOnly, showArchived]);

  return {
    search, setSearch,
    stageFilter, setStageFilter,
    dueOnly, setDueOnly,
    showArchived, setShowArchived,
    sortKey: sort.key, sortDir: sort.dir, handleSort,
    filteredJobs, dueCount, clearFilters,
  };
}

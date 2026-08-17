import { useState, useEffect, useCallback } from 'react';
import followupRepository from '../services/followupRepository.js';
import { MAX_FOLLOWUPS } from '../constants.js';

/**
 * Follow-up entries for one job, newest first.
 *
 * Mirrors useJobEvents: a load error resolves to an empty list rather than
 * throwing, so the panel still opens if the job_followups migration hasn't
 * been applied yet. Write errors do surface — they're user-initiated, and
 * silently dropping someone's typed-out conversation notes would be worse
 * than showing a toast.
 */
export default function useFollowups(jobId) {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setFollowups([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    followupRepository.getForJob(jobId)
      .then((data) => { if (!cancelled) setFollowups(data); })
      .catch(() => { if (!cancelled) setFollowups([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  const addFollowup = useCallback(async (values) => {
    if (!jobId) return null;
    setError(null);
    try {
      const created = await followupRepository.insert({ ...values, jobId });
      // Re-sort client-side so a back-dated entry lands in the right place
      // without a refetch.
      setFollowups((prev) => sortFollowups([created, ...prev]));
      return created;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [jobId]);

  const updateFollowup = useCallback(async (id, updates) => {
    setError(null);
    try {
      const saved = await followupRepository.update(id, updates);
      setFollowups((prev) => sortFollowups(prev.map((f) => (f.id === id ? saved : f))));
      return saved;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const removeFollowup = useCallback(async (id) => {
    setError(null);
    // Optimistic — restore the row if the delete fails.
    const previous = followups;
    setFollowups((prev) => prev.filter((f) => f.id !== id));
    try {
      await followupRepository.remove(id);
    } catch (err) {
      setFollowups(previous);
      setError(err);
      throw err;
    }
  }, [followups]);

  return {
    followups,
    loading,
    error,
    atLimit: followups.length >= MAX_FOLLOWUPS,
    addFollowup,
    updateFollowup,
    removeFollowup,
  };
}

// Newest contact first, matching the server-side ordering in followupAdapter.
// Entries with no date sort to the bottom, ties broken by creation time.
function sortFollowups(list) {
  return [...list].sort((a, b) => {
    if (a.followedUpOn !== b.followedUpOn) {
      if (!a.followedUpOn) return 1;
      if (!b.followedUpOn) return -1;
      return b.followedUpOn.localeCompare(a.followedUpOn);
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

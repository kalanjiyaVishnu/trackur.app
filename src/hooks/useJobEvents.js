import { useState, useEffect } from 'react';
import jobRepository from '../services/jobRepository.js';

/**
 * Stage history for one job, oldest first. Refetches when the job's stage
 * changes so the timeline updates while the edit panel is open (the DB
 * trigger writes the new event server-side).
 *
 * Errors resolve to an empty list — consumers hide the section — so the app
 * keeps working if the job_events migration hasn't been applied yet.
 */
export default function useJobEvents(jobId, stage) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    jobRepository.getJobEvents(jobId)
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [jobId, stage]);

  return { events, loading };
}

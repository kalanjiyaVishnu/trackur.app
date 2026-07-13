import { useState, useEffect, useCallback, useRef } from 'react';
import jobRepository from '../services/jobRepository.js';

export default function useJobs(userId) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const jobs_ref = useRef(jobs);
  jobs_ref.current = jobs;

  useEffect(() => {
    if (!userId) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    jobRepository.getAll().then((data) => {
      setJobs(data);
      setLoading(false);
    });
  }, [userId]);

  const addJob = useCallback(async (job) => {
    const saved = await jobRepository.save(job);
    setJobs((prev) => [...prev, saved]);
    return saved;
  }, []);

  // Optimistic: apply the change locally first so the UI (drag-drop, inline
  // blur-saves) responds instantly, then persist. On failure, roll back and
  // rethrow so callers can show their error toast.
  const updateJob = useCallback(async (id, updates) => {
    const current = jobs_ref.current.find((j) => j.id === id);
    if (!current) return;
    const updated = { ...current, ...updates };
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    try {
      await jobRepository.save(updated);
    } catch (err) {
      setJobs((prev) => prev.map((j) => (j.id === id ? current : j)));
      throw err;
    }
  }, []);

  const deleteJob = useCallback(async (id) => {
    const removed = jobs_ref.current.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    try {
      await jobRepository.remove(id);
    } catch (err) {
      // Restore at the end of the list; order self-corrects on next load
      if (removed) setJobs((prev) => [...prev, removed]);
      throw err;
    }
  }, []);

  const importJobs = useCallback(async (newJobs) => {
    const merged = await jobRepository.saveAll(newJobs);
    setJobs(merged);
    return merged.length;
  }, []);

  const replaceAllJobs = useCallback(async (newJobs) => {
    await jobRepository.replaceAll(newJobs);
    setJobs(newJobs);
  }, []);

  const clearResumeId = useCallback((resumeId) => {
    setJobs((prev) => prev.map((j) => (j.resumeId === resumeId ? { ...j, resumeId: null } : j)));
  }, []);

  return { jobs, loading, addJob, updateJob, deleteJob, importJobs, replaceAllJobs, clearResumeId };
}

import supabaseAdapter from './supabaseAdapter.js';

// Swap this adapter to switch storage backends
// Previously: import localStorageAdapter from './localStorageAdapter.js';
const adapter = supabaseAdapter;

const jobRepository = {
  getAll: () => adapter.getAll(),
  save: (job) => adapter.save(job),
  remove: (id) => adapter.remove(id),
  saveAll: (jobs) => adapter.saveAll(jobs),
  replaceAll: (jobs) => adapter.replaceAll(jobs),
  exportAll: () => adapter.exportAll(),
  getJobEvents: (jobId) => adapter.getJobEvents(jobId),
  getAllJobEvents: () => adapter.getAllJobEvents(),
};

export default jobRepository;

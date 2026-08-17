import followupAdapter from './followupAdapter.js';

const adapter = followupAdapter;

const followupRepository = {
  getForJob: (jobId) => adapter.getForJob(jobId),
  insert: (followup) => adapter.insert(followup),
  update: (id, updates) => adapter.update(id, updates),
  remove: (id) => adapter.remove(id),
};

export default followupRepository;

const STORAGE_KEY = 'jobs';

const localStorageAdapter = {
  async getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async save(job) {
    const jobs = await this.getAll();
    const index = jobs.findIndex((j) => j.id === job.id);
    if (index >= 0) {
      jobs[index] = job;
    } else {
      jobs.push(job);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    return job;
  },

  async remove(id) {
    const jobs = await this.getAll();
    const filtered = jobs.filter((j) => j.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  async saveAll(newJobs) {
    const existing = await this.getAll();
    const existingIds = new Set(existing.map((j) => j.id));
    const toInsert = newJobs.filter((j) => !existingIds.has(j.id));
    const merged = [...existing, ...toInsert];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return { jobs: merged, inserted: toInsert.length };
  },

  async replaceAll(jobs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  },

  async exportAll() {
    return this.getAll();
  },
};

export default localStorageAdapter;

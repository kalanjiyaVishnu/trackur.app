import { supabase } from './supabase.js';

// Map DB snake_case row to app camelCase object
// (exported for unit tests)
export function toApp(row) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    stage: row.stage,
    dateApplied: row.date_applied ?? '',
    todos: row.todos ?? [],
    notes: row.notes ?? '',
    resumeId: row.resume_id ?? null,
    postingUrl: row.posting_url ?? '',
    archivedAt: row.archived_at ?? null,
  };
}

// Map app camelCase object to DB snake_case row
// (exported for unit tests)
export function toDb(job) {
  const row = {
    company: job.company,
    role: job.role,
    stage: job.stage,
    date_applied: job.dateApplied || null,
    todos: job.todos ?? [],
    notes: job.notes || null,
    resume_id: job.resumeId ?? null,
    posting_url: job.postingUrl || null,
    archived_at: job.archivedAt ?? null,
  };
  if (job.id) row.id = job.id;
  return row;
}

function eventToApp(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    createdAt: row.created_at,
  };
}

const supabaseAdapter = {
  async getAll() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toApp);
  },

  async save(job) {
    if (job.id) {
      // Update existing job
      const { data, error } = await supabase
        .from('jobs')
        .update(toDb(job))
        .eq('id', job.id)
        .select()
        .single();
      if (error) throw error;
      return toApp(data);
    } else {
      // Insert new job (DB generates UUID + sets user_id)
      const { data, error } = await supabase
        .from('jobs')
        .insert(toDb(job))
        .select()
        .single();
      if (error) throw error;
      return toApp(data);
    }
  },

  async remove(id) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async saveAll(newJobs) {
    // Merge: insert only jobs that don't already exist
    const existing = await this.getAll();
    const existingIds = new Set(existing.map((j) => j.id));
    const toInsert = newJobs.filter((j) => !existingIds.has(j.id));

    if (toInsert.length > 0) {
      const rows = toInsert.map((j) => {
        const row = toDb(j);
        delete row.id; // Let DB generate new UUIDs for imported jobs
        delete row.resume_id; // Resume IDs are not portable across users
        return row;
      });
      const { error } = await supabase.from('jobs').insert(rows);
      if (error) throw error;
    }
    return { jobs: await this.getAll(), inserted: toInsert.length };
  },

  async replaceAll(jobs) {
    // Delete all user's jobs (RLS scopes to current user)
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .gte('created_at', '1970-01-01');
    if (deleteError) throw deleteError;

    if (jobs.length > 0) {
      const rows = jobs.map((j) => {
        const row = toDb(j);
        delete row.id; // Let DB generate new UUIDs
        delete row.resume_id; // Resume IDs are not portable across users
        return row;
      });
      const { error: insertError } = await supabase.from('jobs').insert(rows);
      if (insertError) throw insertError;
    }
  },

  async exportAll() {
    return this.getAll();
  },

  // Stage history (job_events rows are written by a DB trigger; read-only here)
  async getJobEvents(jobId) {
    const { data, error } = await supabase
      .from('job_events')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(eventToApp);
  },

  async getAllJobEvents() {
    const { data, error } = await supabase
      .from('job_events')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(eventToApp);
  },
};

export default supabaseAdapter;

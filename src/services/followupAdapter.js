import { supabase } from './supabase.js';

// Map DB snake_case row to app camelCase object
// (exported for unit tests)
export function toApp(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    pocName: row.poc_name ?? '',
    pocRole: row.poc_role ?? '',
    pocEmail: row.poc_email ?? '',
    conversation: row.conversation ?? '',
    followedUpOn: row.followed_up_on ?? '',
    nextFollowUp: row.next_follow_up ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map app camelCase object to DB snake_case row. Only defined keys are
// included, so a partial update never blanks a field it didn't mention.
// (exported for unit tests)
export function toDb(followup) {
  const row = {};
  if (followup.jobId !== undefined) row.job_id = followup.jobId;
  if (followup.pocName !== undefined) row.poc_name = followup.pocName || null;
  if (followup.pocRole !== undefined) row.poc_role = followup.pocRole || null;
  if (followup.pocEmail !== undefined) row.poc_email = followup.pocEmail || null;
  if (followup.conversation !== undefined) row.conversation = followup.conversation || null;
  if (followup.followedUpOn !== undefined) row.followed_up_on = followup.followedUpOn || null;
  if (followup.nextFollowUp !== undefined) row.next_follow_up = followup.nextFollowUp || null;
  return row;
}

const followupAdapter = {
  // Newest contact first. followed_up_on can be null, so created_at is the
  // tiebreaker and the fallback ordering.
  async getForJob(jobId) {
    const { data, error } = await supabase
      .from('job_followups')
      .select('*')
      .eq('job_id', jobId)
      .order('followed_up_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toApp);
  },

  async insert(followup) {
    // user_id is set by the column default (auth.uid()), as with jobs/resumes.
    const { data, error } = await supabase
      .from('job_followups')
      .insert(toDb(followup))
      .select()
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('job_followups')
      .update(toDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toApp(data);
  },

  async remove(id) {
    const { error } = await supabase
      .from('job_followups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export default followupAdapter;

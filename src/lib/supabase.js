import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mmggjxakzkfqqkiqkhlo.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZ2dqeGFremtmcXFraXFraGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwOTI3MzAsImV4cCI6MjEwNjY2ODczMH0.v0gWHCpVek7Q8rk4a6rYjhWfCb1u59-D75X1WRYv0fs';

// Client for Frontend UI (uses Anon Key with user session)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// The service-role key must never be shipped to the browser: it bypasses Row Level
// Security. All reads/writes here use the signed-in user's session, and RLS limits
// them to that user's own rows. Admin-only operations live on the backend (server/admin.js).

/**
 * Sync an applied job to Supabase applied_jobs table
 */
export async function syncAppliedJobToSupabase(user, jobData) {
  if (!user) return { success: false, reason: 'no_user' };

  const payload = {
    user_id: user.id,
    job_id: jobData.id,
    title: jobData.title,
    company: jobData.company,
    location: jobData.location || '',
    salary: jobData.salary || 'Competitive',
    match_score: jobData.matchScore || 0,
    status: jobData.status || 'applied',
    applied_at: new Date().toISOString(),
    pacing_delay_sec: jobData.pacingDelaySec || 8.0,
    llm_reasoning: jobData.llmReasoning?.summary || null,
    playwright_trace: jobData.playwrightTrace ? JSON.stringify(jobData.playwrightTrace) : null,
    steps_completed: jobData.stepsCompleted || 0,
    steps_total: jobData.stepsTotal || 3,
    url: jobData.url || null,
    logo: jobData.logo || null,
    easy_apply: jobData.easyApply ?? true,
    experience_level: jobData.experienceLevel || null,
    employment_type: jobData.employmentType || null,
    description: jobData.description?.slice(0, 1000) || null,
  };

  try {
    const { error } = await supabase
      .from('applied_jobs')
      .upsert(payload, { onConflict: 'user_id,job_id' });

    if (!error) {
      console.log('[Supabase] Saved applied job to applied_jobs table:', jobData.company);
      return { success: true };
    } else {
      console.warn('[Supabase] Error saving job:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Error:', err.message);
  }

  // Fallback: persist in Supabase User Metadata
  try {
    const existing = user.user_metadata?.applied_jobs || [];
    const updated = [
      ...existing.filter(j => j.id !== jobData.id),
      {
        id: jobData.id,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        salary: jobData.salary,
        matchScore: jobData.matchScore,
        appliedAt: new Date().toISOString(),
        pacingDelaySec: jobData.pacingDelaySec
      }
    ];
    await supabase.auth.updateUser({ data: { applied_jobs: updated } });
  } catch (metaErr) {
    console.warn('[Supabase] Error updating user metadata:', metaErr);
  }

  return { success: true };
}

/**
 * Fetch all applied jobs for a user from Supabase — real data, all columns
 */
export async function fetchUserAppliedJobsFromSupabase(user) {
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('applied_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Map DB column names to the shape our UI expects
      return data.map(row => ({
        id: row.job_id || row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        salary: row.salary,
        matchScore: row.match_score,
        match_score: row.match_score,
        status: row.status || 'applied',
        appliedAt: row.applied_at,
        applied_at: row.applied_at,
        pacingDelaySec: row.pacing_delay_sec,
        pacing_delay_sec: row.pacing_delay_sec,
        llmReasoning: row.llm_reasoning ? { summary: row.llm_reasoning, decision: row.match_score >= 75 ? 'APPLY' : 'SKIP' } : null,
        llm_reasoning: row.llm_reasoning,
        playwrightTrace: row.playwright_trace ? JSON.parse(row.playwright_trace) : null,
        stepsCompleted: row.steps_completed,
        stepsTotal: row.steps_total,
        steps_completed: row.steps_completed,
        steps_total: row.steps_total,
        url: row.url,
        logo: row.logo,
        easyApply: row.easy_apply,
        experienceLevel: row.experience_level,
        employmentType: row.employment_type,
        description: row.description,
        // source info
        _fromDB: true,
      }));
    }
  } catch (err) {
    console.warn('[Supabase] fetchUserAppliedJobsFromSupabase error:', err.message);
  }

  // Fallback to user metadata
  const metaJobs = user.user_metadata?.applied_jobs || [];
  return metaJobs.map(j => ({
    ...j,
    status: j.status || 'applied',
    _fromMeta: true,
  }));
}

/**
 * Subscribe to real-time changes in the applied_jobs table for a specific user
 * Returns the Supabase channel (call .unsubscribe() to clean up)
 */
export function subscribeToAppliedJobs(userId, onInsert, onUpdate) {
  const channel = supabase
    .channel(`applied_jobs_user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'applied_jobs',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[Supabase RT] New job inserted:', payload.new?.company);
        onInsert && onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'applied_jobs',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[Supabase RT] Job updated:', payload.new?.company);
        onUpdate && onUpdate(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('[Supabase RT] Subscription status:', status);
    });

  return channel;
}

/**
 * Save candidate profile to Supabase (profiles table + auth user metadata)
 */
export async function syncProfileToSupabase(user, profileData) {
  if (!user) return { success: false, reason: 'no_user' };

  try {
    // 1. Upsert to public.profiles table (name, headline, email, avatar_url)
    const profileRow = {
      id: user.id,
      email: profileData.email || user.email,
      name: profileData.name || user.user_metadata?.name || '',
      headline: profileData.headline || '',
      avatar_url: profileData.avatar || user.user_metadata?.avatar_url || null,
    };

    await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' });

    // 2. Persist full candidate profile in Supabase Auth user_metadata
    await supabase.auth.updateUser({
      data: {
        candidate_profile: profileData,
        profile_completed: Boolean(profileData.resumeFile && profileData.name && profileData.email && profileData.phone)
      }
    });

    return { success: true };
  } catch (err) {
    console.warn('[Supabase] syncProfileToSupabase error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch candidate profile from Supabase
 */
export async function fetchUserProfileFromSupabase(user) {
  if (!user) return null;

  try {
    // Check user_metadata first
    if (user.user_metadata?.candidate_profile) {
      return user.user_metadata.candidate_profile;
    }

    // Check profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      return {
        name: data.name || '',
        email: data.email || user.email || '',
        headline: data.headline || '',
        avatar: data.avatar_url || null
      };
    }
  } catch (err) {
    console.warn('[Supabase] fetchUserProfileFromSupabase error:', err.message);
  }

  return null;
}

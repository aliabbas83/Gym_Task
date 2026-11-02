// Data access: Supabase when configured, otherwise the bundled data.js + localStorage.
(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const sb = cfg.url && cfg.key && window.supabase ? window.supabase.createClient(cfg.url, cfg.key) : null;
  const LKEY = "ih.members";

  const local = {
    get() { try { return JSON.parse(localStorage.getItem(LKEY)) || []; } catch { return []; } },
    set(v) { try { localStorage.setItem(LKEY, JSON.stringify(v)); } catch { throw new Error("Browser storage is unavailable (private window?)."); } }
  };

  // DB row <-> app object
  const fromRow = r => ({ id: r.id, name: r.full_name, phone: r.phone || "", months: r.plan_months, start: r.start_date, level: r.level, goal: r.goal });
  const toRow = m => ({ full_name: m.name, phone: m.phone || null, plan_months: m.months, start_date: m.start, level: m.level, goal: m.goal });
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  window.DB = {
    remote: !!sb,

    // Returns a GYM-shaped object built from the database, or null if offline / failing.
    async loadCatalog() {
      if (!sb) return null;
      const [mus, eq, ex, days] = await Promise.all([
        sb.from("muscles").select("*").order("sort"),
        sb.from("equipment").select("*").order("sort"),
        sb.from("exercises").select("*, exercise_equipment(equipment_id, sort)").order("sort"),
        sb.from("schedule_days").select("*, schedule_day_muscles(muscle_id, sort)").order("dow")
      ]).then(rs => rs.map(must));
      if (!ex.length) return null;
      const bySort = (a, b) => a.sort - b.sort;
      return {
        muscles: Object.fromEntries(mus.map(m => [m.id, { name: m.name, color: m.color, region: m.region }])),
        week: days.map(d => ({ dow: d.dow, day: d.day_name, title: d.title, muscles: d.schedule_day_muscles.sort(bySort).map(x => x.muscle_id) })),
        equipment: eq.map(e => ({ id: e.id, cat: e.category, name: e.name, desc: e.description })),
        exercises: ex.map(e => ({
          id: e.id, muscle: e.muscle_id, name: e.name, type: e.type, form: e.form, level: e.level, secondary: e.secondary,
          equipment: e.exercise_equipment.sort(bySort).map(x => x.equipment_id),
          anim: { p: e.anim_pattern, h: e.anim_hand }, steps: e.steps, tips: e.tips, mistakes: e.mistakes, video: e.video_url,
          sets: e.sets, repsMin: e.reps_min, repsMax: e.reps_max, prompt: e.ai_video_prompt, secs: e.video_length_seconds
        }))
      };
    },

    // ---- staff auth (remote only) ----
    async session() { return sb ? (await sb.auth.getSession()).data.session : null; },
    onAuth(cb) { if (sb) sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async signIn(email, password) { must(await sb.auth.signInWithPassword({ email, password })); },
    async signOut() { await sb.auth.signOut(); },
    async isStaff() {
      const s = await this.session();
      if (!s) return false;
      const rows = must(await sb.from("staff").select("user_id").eq("user_id", s.user.id));
      return rows.length > 0;
    },

    // ---- members ----
    async listMembers() {
      if (!sb) return local.get();
      return must(await sb.from("members").select("*").order("full_name")).map(fromRow);
    },
    async addMember(m) {
      if (!sb) { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); local.set([...local.get(), { ...m, id }]); return { ...m, id }; }
      return fromRow(must(await sb.from("members").insert(toRow(m)).select().single()));
    },
    async updateMember(id, patch) {
      if (!sb) { local.set(local.get().map(m => (m.id === id ? { ...m, ...patch } : m))); return; }
      const row = {};
      if ("start" in patch) row.start_date = patch.start;
      if ("months" in patch) row.plan_months = patch.months;
      must(await sb.from("members").update(row).eq("id", id));
    },
    async removeMember(id) {
      if (!sb) { local.set(local.get().filter(m => m.id !== id)); return; }
      must(await sb.from("members").delete().eq("id", id));
    }
  };
})();

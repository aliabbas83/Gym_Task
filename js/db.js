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
  const BUCKET = "member-photos", GALLERY = "workout-photos", GKEY = "ih.gallery";
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
  const extOf = blob => (blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg");
  const fromPhotoRow = (r, url) => ({ id: r.id, path: r.path, url, caption: r.caption, name: r.uploader_name, muscle: r.muscle_id, created: r.created_at, status: r.status, owner: r.user_id });
  async function signAll(rows) {
    if (!rows.length) return [];
    const signed = must(await sb.storage.from(GALLERY).createSignedUrls(rows.map(r => r.path), 3600));
    const byPath = Object.fromEntries(signed.filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]));
    return rows.filter(r => byPath[r.path]).map(r => fromPhotoRow(r, byPath[r.path]));
  }
  const fromRow = r => ({ id: r.id, name: r.full_name, phone: r.phone || "", months: r.plan_months, start: r.start_date, level: r.level, goal: r.goal, photo: r.photo_path || "" });
  const toRow = m => ({ full_name: m.name, phone: m.phone || null, plan_months: m.months, start_date: m.start, level: m.level, goal: m.goal });
  const must = ({ data, error }) => {
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    return data;
  };

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
          sets: e.sets, repsMin: e.reps_min, repsMax: e.reps_max, prompt: e.ai_video_prompt, secs: e.video_length_seconds,
          weights: { beginner: +e.weight_beginner_kg, intermediate: +e.weight_intermediate_kg, advanced: +e.weight_advanced_kg, basis: e.weight_basis }
        }))
      };
    },

    // ---- staff auth (remote only) ----
    async session() { return sb ? (await sb.auth.getSession()).data.session : null; },
    onAuth(cb) { if (sb) sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async signIn(email, password) { must(await sb.auth.signInWithPassword({ email, password })); },
    // confirmed: false means Supabase emailed a confirmation link and there is no session yet.
    async signUp(email, password) {
      const emailRedirectTo = location.protocol.startsWith("http") ? location.origin + location.pathname : undefined;
      const data = must(await sb.auth.signUp({ email, password, options: { emailRedirectTo } }));
      return { confirmed: !!data.session };
    },
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
      const [row] = must(await sb.from("members").select("photo_path").eq("id", id));
      must(await sb.from("members").delete().eq("id", id));
      if (row && row.photo_path) await sb.storage.from(BUCKET).remove([row.photo_path]);
    },

    // ---- member photos (private bucket; offline: small data URL in localStorage) ----
    // blob: an already-resized image. Replaces any previous photo of the member.
    async setPhoto(member, blob) {
      if (!sb) {
        const dataUrl = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(blob); });
        await this.updateMemberPhoto(member.id, dataUrl); return dataUrl;
      }
      const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
      const path = `${member.id}/${Date.now()}.${ext}`;
      must(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }));
      try { await this.updateMemberPhoto(member.id, path); }
      catch (err) { await sb.storage.from(BUCKET).remove([path]); throw err; }
      if (member.photo) await sb.storage.from(BUCKET).remove([member.photo]);
      return path;
    },
    async removePhoto(member) {
      if (!member.photo) return;
      await this.updateMemberPhoto(member.id, null);
      if (sb) await sb.storage.from(BUCKET).remove([member.photo]);
    },
    async updateMemberPhoto(id, photo) {
      if (!sb) { local.set(local.get().map(m => (m.id === id ? { ...m, photo: photo || "" } : m))); return; }
      must(await sb.from("members").update({ photo_path: photo }).eq("id", id));
    },
    // ---- Write with AI (Supabase Edge Function → OpenRouter) ----
    async writeWithAI({ task, muscle = "", draft = "" }) {
      if (!sb) throw new Error("Write with AI needs the Supabase connection.");
      const { data, error } = await sb.functions.invoke("write-with-ai", { body: { task, muscle, draft } });
      if (error) {
        // Non-2xx: the function's JSON { error } explains why.
        let msg = error.message;
        try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch { /* keep generic */ }
        throw new Error(msg);
      }
      if (!data || !data.text) throw new Error("No text came back — please try again.");
      return data.text;
    },

    // ---- public workout gallery: anyone submits, staff approve before it is shown ----
    async submitWorkoutPhoto({ blob, caption, name, muscle }) {
      if (!sb) {
        const url = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(blob); });
        let list = []; try { list = JSON.parse(localStorage.getItem(GKEY)) || []; } catch { /* empty */ }
        list.unshift({ id: uuid(), path: "", url, caption, name, muscle, created: new Date().toISOString(), status: "approved" });
        try { localStorage.setItem(GKEY, JSON.stringify(list.slice(0, 24))); } catch { throw new Error("Browser storage is full or unavailable."); }
        return { pending: false };
      }
      const path = `pending/${uuid()}.${extOf(blob)}`;
      must(await sb.storage.from(GALLERY).upload(path, blob, { contentType: blob.type, upsert: false }));
      must(await sb.from("workout_photos").insert({ path, caption, uploader_name: name, muscle_id: muscle || null }));
      return { pending: true };
    },
    async listGallery(limit = 24) {
      if (!sb) { try { return JSON.parse(localStorage.getItem(GKEY)) || []; } catch { return []; } }
      return signAll(must(await sb.from("workout_photos").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(limit)));
    },
    async listPendingPhotos() {
      if (!sb) return [];
      return signAll(must(await sb.from("workout_photos").select("*").eq("status", "pending").order("created_at")));
    },
    async reviewPhoto(photo, approve) {
      if (approve) {
        const s = await this.session();
        must(await sb.from("workout_photos").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: s.user.id }).eq("id", photo.id));
      } else {
        must(await sb.from("workout_photos").delete().eq("id", photo.id));
        await sb.storage.from(GALLERY).remove([photo.path]);
      }
    },
    // ---- a signed-in member's own gallery photos ----
    // RLS hides other people's rows, so a blocked change returns no rows rather than an error.
    async listMyPhotos() {
      const s = sb && await this.session();
      if (!s) return [];
      return signAll(must(await sb.from("workout_photos").select("*").eq("user_id", s.user.id).order("created_at", { ascending: false })));
    },
    async updateMyPhoto(id, { caption, name, muscle }) {
      const rows = must(await sb.from("workout_photos").update({ caption, uploader_name: name, muscle_id: muscle || null }).eq("id", id).select("id"));
      if (!rows.length) throw new Error("This photo couldn't be changed. It may already be deleted.");
    },
    async deleteMyPhoto(photo) {
      const rows = must(await sb.from("workout_photos").delete().eq("id", photo.id).select("id"));
      if (!rows.length) throw new Error("This photo couldn't be deleted. It may already be gone.");
      await sb.storage.from(GALLERY).remove([photo.path]);
    },

    // Returns { memberId: displayable URL } — short-lived signed links for the private bucket.
    async photoUrls(list) {
      const withPhoto = list.filter(m => m.photo);
      if (!withPhoto.length) return {};
      if (!sb) return Object.fromEntries(withPhoto.map(m => [m.id, m.photo]));
      const signed = must(await sb.storage.from(BUCKET).createSignedUrls(withPhoto.map(m => m.photo), 3600));
      const byPath = Object.fromEntries(signed.filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]));
      return Object.fromEntries(withPhoto.filter(m => byPath[m.photo]).map(m => [m.id, byPath[m.photo]]));
    }
  };
})();

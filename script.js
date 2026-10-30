/* JobPortal Pro: HTML + CSS + JavaScript only (no Python, no database) */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const users = () => get("jpp_users", []), jobs = () => get("jpp_jobs", []), apps = () => get("jpp_apps", []);
const saveUsers = v => put("jpp_users", v), saveJobs = v => put("jpp_jobs", v), saveApps = v => put("jpp_apps", v);
const me = () => users().find(u => u.id === get("jpp_session", ""));
const TYPES = ["Full Time", "Part Time", "Internship", "Remote", "Freelance"];
const fdate = t => new Date(t).toLocaleDateString("en-GB", {day: "2-digit", month: "short", year: "numeric"});
const go = p => { location.hash = "#" + p };
let pending = null;
const flash = (msg, type = "info") => pending = [msg, type];

/* password hashing (salt + SHA-256) */
async function hash(p, salt) {
  const t = salt + p;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; for (const c of t) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return "w" + h;
}

/* resume files are kept in the browser (IndexedDB) */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open("jpp_files", 1); r.onupgradeneeded = () => r.result.createObjectStore("f"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
async function putFile(k, f) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction("f", "readwrite"); t.objectStore("f").put(f, k); t.oncomplete = res; t.onerror = rej }) }
async function getFile(k) { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction("f").objectStore("f").get(k); q.onsuccess = () => res(q.result); q.onerror = rej }) }

/* page shell: flash message + navbar */
function render(html) {
  const icons = {success: "✅", danger: "❌", warning: "⚠️", info: "ℹ️"};
  const fl = pending ? `<div class="wrap"><div class="flash ${pending[1]}">${icons[pending[1]]} ${esc(pending[0])}</div></div>` : "";
  pending = null;
  $("#page").innerHTML = fl + html; nav(); $("#nav").classList.remove("open"); window.scrollTo(0, 0);
}
function nav() {
  const u = me();
  $("#links").innerHTML = `<a href="#/">Home</a>` + (u
    ? `<a href="#/dashboard">Dashboard</a>${u.role === "employer" ? '<a class="btn-w" href="#/post-job">+ Post Job</a>' : ""}<a href="#/profile">👤 ${esc(u.name)}</a><a class="btn-r" href="#/logout">Logout</a>`
    : `<a href="#/login">Login</a><a class="btn-w" href="#/register">Register</a>`);
}
function need(role) {
  const u = me();
  if (!u) { flash("Please login first.", "warning"); go("/login"); return null }
  if (role && u.role !== role) { flash(role === "employer" ? "Access denied. Employers only." : "Access denied. Job seekers only.", "danger"); go("/dashboard"); return null }
  return u;
}
const stat = (l, n) => `<div class="card stat"><p class="mut">${l}</p><b>${n}</b></div>`;
const statusBadge = s => `<span class="badge ${s === "Accepted" ? "ok" : s === "Rejected" ? "rej" : "warn"}">${s}</span>`;

/* ---------- HOME ---------- */
function jobCard(j, isNew) {
  return `<div class="card hov"><div class="jtop"><div class="av">${esc((j.company[0] || "?").toUpperCase())}</div>
    <div style="flex:1;min-width:0"><div class="row"><h3><a href="#/job/${j.id}">${esc(j.title)}</a></h3>${isNew ? '<span class="badge new">NEW</span>' : ""}</div><p class="mut">${esc(j.company)}</p></div>
    <div class="right"><span class="badge">${esc(j.type)}</span><span class="sal">${esc(j.salary || "Not Disclosed")}</span></div></div>
    <div class="meta"><span>📍 ${esc(j.location)}</span><span>🎓 ${esc(j.experience || "Fresher")}</span><span>🕒 ${fdate(j.created)}</span></div>
    <p class="mut">${esc(j.description.slice(0, 150))}${j.description.length > 150 ? "..." : ""}</p></div>`;
}
function home() {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const s = (q.get("search") || "").trim(), l = (q.get("location") || "").trim(), t = q.get("job_type") || "";
  const live = jobs().filter(j => j.active), us = users(), f = s || l || t;
  const list = live.filter(j => (!s || (j.title + " " + j.company + " " + j.description).toLowerCase().includes(s.toLowerCase()))
    && (!l || j.location.toLowerCase().includes(l.toLowerCase())) && (!t || j.type === t)).sort((a, b) => b.created - a.created);
  render(`<section class="hero"><div class="wrap center"><span class="pill">${live.length}+ jobs live right now</span>
    <h1>Find Your <span class="gold">Dream Job</span><br>Today</h1><p>Discover thousands of opportunities from top companies, all in one place.</p>
    <form class="search" data-form="search"><input name="search" value="${esc(s)}" placeholder="Job title, skills, company..."><input name="location" value="${esc(l)}" placeholder="Location">
      <select name="job_type"><option value="">All Types</option>${TYPES.map(x => `<option ${x === t ? "selected" : ""}>${x}</option>`).join("")}</select><button class="btn pri">Search Jobs</button></form>
    <p class="pop">Popular: ${["Remote", "Internship", "Developer", "Designer", "Marketing"].map(x => `<a href="#/?search=${x}">${x}</a>`).join(" · ")}</p></div></section>
    <section class="stats"><div class="wrap grid3"><div><b>${live.length}+</b><span>Live Jobs</span></div><div><b>${us.filter(u => u.role === "employer").length}+</b><span>Companies</span></div><div><b>${us.filter(u => u.role === "seeker").length}+</b><span>Job Seekers</span></div></div></section>
    <section class="wrap chips">${TYPES.map(x => `<a class="chip ${x === t ? "on" : ""}" href="#/?job_type=${x}">${x}</a>`).join("")}</section>
    <section class="wrap pad"><div class="between"><h2>${f ? `Search Results <span class="mut">(${list.length} found)</span>` : "Latest Jobs"}</h2>${f ? '<a href="#/">Clear filters</a>' : ""}</div>
    ${list.length ? `<div class="jobs">${list.map((j, i) => jobCard(j, i < 3 && !f)).join("")}</div>`
      : `<div class="card empty"><p>No jobs found.</p>${jobs().length ? "" : '<p class="mut">Employers can register and post jobs.</p><button class="btn" data-act="sample">Load sample jobs</button>'}</div>`}</section>`);
}

/* ---------- LOGIN / REGISTER ---------- */
const shell = (left, right) => `<div class="wrap"><div class="auth2"><div class="brandp"><a class="logo" href="#/">💼 JobBridge</a><br><br>${left}</div><div class="formp">${right}</div></div></div>`;
function loginPage() {
  if (me()) return go("/dashboard");
  render(shell(`<h2>Welcome back to your career journey</h2><p>Log in to track applications, manage your profile, and discover new opportunities tailored for you.</p><ul class="ticks"><li>Secure login</li><li>Fast &amp; easy</li></ul>`,
    `<h2>Welcome Back!</h2><p class="mut">Login to your account to continue</p><form data-form="login"><label>Email Address<input type="email" name="email" required placeholder="your@email.com"></label>
    <label>Password<input type="password" name="password" required placeholder="Your password"></label><br><button class="btn pri full">Login</button></form>
    <p class="center mut">Don't have an account? <a href="#/register">Register here</a></p>`));
}
function registerPage() {
  if (me()) return go("/dashboard");
  render(shell(`<h2>Start your journey with us today</h2><p>Whether you're hiring talent or looking for your next role, your free account takes seconds to set up.</p><ul class="ticks"><li>Free to join, no hidden fees</li><li>Apply or hire in just a few clicks</li><li>Trusted by thousands of users</li></ul>`,
    `<h2>Create Account</h2><p class="mut">Join thousands of job seekers &amp; employers</p><form data-form="register"><label>Full Name<input name="name" required placeholder="Your full name"></label>
    <label>Email Address<input type="email" name="email" required placeholder="your@email.com"></label>
    <div class="grid2"><label>Password<input type="password" name="password" required placeholder="Min 6 chars"></label><label>Confirm Password<input type="password" name="confirm_password" required placeholder="Re-enter"></label></div>
    <label>I am a...</label><div class="roles"><label><input type="radio" name="role" value="seeker" required> Job Seeker</label><label><input type="radio" name="role" value="employer" required> Employer</label></div><br>
    <button class="btn pri full">Create Account</button></form><p class="center mut">Already have an account? <a href="#/login">Login here</a></p>`));
}

/* ---------- DASHBOARD ---------- */
function dashboard() {
  const u = need(); if (!u) return;
  const A = apps(), J = jobs();
  if (u.role === "employer") {
    const mine = J.filter(j => j.owner === u.id).sort((a, b) => b.created - a.created), cnt = j => A.filter(a => a.jobId === j.id).length;
    return render(`<div class="wrap pad"><div class="between"><div><h1>Employer Dashboard</h1><p class="mut">Welcome, ${esc(u.name)} 👋</p></div><a class="btn pri" href="#/post-job">Post New Job</a></div>
      <div class="grid3 gap">${stat("Total Jobs Posted", mine.length)}${stat("Total Applications", mine.reduce((n, j) => n + cnt(j), 0))}${stat("Active Jobs", mine.filter(j => j.active).length)}</div>
      <div class="card"><h2>My Posted Jobs</h2>${mine.length ? `<div class="scroll"><table><thead><tr><th>Job Title</th><th>Location</th><th>Type</th><th>Applications</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${mine.map(j => `<tr><td><b>${esc(j.title)}</b><br><span class="mut">${esc(j.company)}</span></td><td>${esc(j.location)}</td><td><span class="badge">${esc(j.type)}</span></td>
      <td><a href="#/applicants/${j.id}">${cnt(j)} Applicants</a></td><td><span class="badge ${j.active ? "ok" : "gray"}">${j.active ? "Active" : "Inactive"}</span></td>
      <td><a class="btn sm" href="#/edit-job/${j.id}">Edit</a> <button class="btn sm bad" data-act="del" data-id="${j.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty"><p>You haven't posted any jobs yet.</p><a href="#/post-job">Post your first job →</a></div>`}</div></div>`);
  }
  const mine = A.filter(a => a.userId === u.id).sort((a, b) => b.created - a.created), n = s => mine.filter(a => a.status === s).length;
  render(`<div class="wrap pad"><div class="between"><div><h1>My Applications</h1><p class="mut">Welcome, ${esc(u.name)} 👋</p></div><a class="btn pri" href="#/">Browse More Jobs</a></div>
    <div class="grid3 gap">${stat("Total Applied", mine.length)}${stat("Accepted", n("Accepted"))}${stat("Pending", n("Pending"))}</div>
    <div class="card"><h2>Application History</h2>${mine.length ? mine.map(a => { const j = J.find(x => x.id === a.jobId) || {title: "(job removed)", company: "", location: "", type: ""};
      return `<div class="app"><div><h3>${esc(j.title)}</h3><p class="mut">${esc(j.company)} | ${esc(j.location)}</p><p class="mut sm">Applied: ${fdate(a.created)} | ${esc(j.type)}</p></div>${statusBadge(a.status)}</div>` }).join("")
      : `<div class="empty"><p>You haven't applied to any jobs yet.</p><a href="#/">Browse jobs now →</a></div>`}</div></div>`);
}

/* ---------- POST / EDIT JOB ---------- */
function jobForm(id) {
  const u = need("employer"); if (!u) return;
  const j = id ? jobs().find(x => x.id === id && x.owner === u.id) : {};
  if (id && !j) { flash("Job not found!", "danger"); return go("/dashboard") }
  const v = k => esc(j[k] || ""), company = j.company || u.name;
  render(`<div class="wrap pad"><h1>${id ? "Edit Job" : "Post a New Job"}</h1><p class="mut">Fill in the details to attract the best candidates</p>
    <div class="split"><div class="card"><form data-form="job" data-id="${id || ""}">
    <h3>Basic Information</h3><div class="grid2"><label>Job Title *<input name="title" required placeholder="e.g. Software Engineer" value="${v("title")}" data-prev="t"></label>
    <label>Company Name *<input name="company" required placeholder="Your company name" value="${esc(company)}" data-prev="c"></label></div><hr>
    <h3>Job Details</h3><div class="grid2"><label>Location *<input name="location" required placeholder="e.g. Delhi, Remote" value="${v("location")}"></label>
    <label>Salary<input name="salary" placeholder="e.g. ₹5-8 LPA" value="${v("salary")}"></label>
    <label>Job Type *<select name="job_type">${TYPES.map(x => `<option ${x === (j.type || "Full Time") ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    <label>Experience Required<input name="experience" placeholder="e.g. 2-4 years / Fresher" value="${v("experience")}"></label></div><hr>
    <h3>Requirements &amp; Description</h3><label>Required Skills<input name="skills" placeholder="e.g. HTML, CSS, JavaScript (comma separated)" value="${v("skills")}"></label>
    <p class="mut sm">Separate each skill with a comma. They show as tags on the job listing.</p>
    <label>Job Description *<textarea name="description" required rows="7" placeholder="Describe the role, responsibilities, and requirements...">${v("description")}</textarea></label>
    ${id ? `<label class="chk"><input type="checkbox" name="active" ${j.active ? "checked" : ""}> Job is active (visible to job seekers)</label>` : ""}
    <div class="btns"><button class="btn pri">${id ? "Update Job" : "Post Job"}</button><a class="btn" href="#/dashboard">Cancel</a></div></form></div>
    <div><div class="card tips"><h4>💡 Tips for a great post</h4><ul><li>Use a clear, specific job title.</li><li>Mention a salary range to attract serious applicants.</li><li>List only must-have skills.</li><li>Describe day-to-day responsibilities, not just requirements.</li></ul></div>
    <div class="card"><h4>Your job will appear as</h4><div class="jtop"><div class="av" id="pv-a">${esc((company[0] || "C").toUpperCase())}</div><div><b id="pv-t">${esc(j.title || "Job Title")}</b><br><span class="mut" id="pv-c">${esc(company)}</span></div></div>
    <p class="mut sm">Visible to all job seekers immediately after posting.</p></div></div></div></div>`);
}

/* ---------- JOB DETAIL / APPLY / APPLICANTS ---------- */
function jobDetail(id) {
  const j = jobs().find(x => x.id === id);
  if (!j) { flash("Job not found!", "danger"); return go("/") }
  const u = me(), owner = users().find(x => x.id === j.owner), done = u && apps().some(a => a.jobId === id && a.userId === u.id);
  render(`<div class="wrap pad narrow"><div class="card"><div class="jhead"><div class="between"><div><h1>${esc(j.title)}</h1><p>🏢 ${esc(j.company)}</p></div><span class="badge">${esc(j.type)}</span></div>
    <div class="meta"><span>📍 ${esc(j.location)}</span><span>💰 ${esc(j.salary || "Not Disclosed")}</span><span>🎓 ${esc(j.experience || "Fresher")}</span><span>🕒 Posted ${fdate(j.created)}</span></div></div>
    ${j.skills ? `<h2>Required Skills</h2><div class="tags">${j.skills.split(",").filter(s => s.trim()).map(s => `<span class="tag">${esc(s.trim())}</span>`).join("")}</div>` : ""}
    <h2>Job Description</h2><div class="pre">${esc(j.description)}</div><h2>Posted By</h2><p>${esc(owner ? owner.name : j.company)}</p>
    <div>${u && u.role === "seeker" ? (done ? '<div class="note">✅ You have already applied for this job.</div>' : `<a class="btn pri" href="#/apply/${j.id}">Apply Now</a>`) : !u ? '<a class="btn pri" href="#/login">Login to Apply</a>' : ""}</div></div>
    <a href="#/">← Back to all jobs</a></div>`);
}
function applyPage(id) {
  const u = need("seeker"); if (!u) return;
  const j = jobs().find(x => x.id === id);
  if (!j) { flash("Job not found!", "danger"); return go("/") }
  if (apps().some(a => a.jobId === id && a.userId === u.id)) { flash("You have already applied for this job!", "warning"); return go("/job/" + id) }
  render(`<div class="wrap pad narrow"><div class="card"><h1>Apply for Job</h1><div class="note"><b>${esc(j.title)}</b><br>${esc(j.company)}</div>
    <form data-form="apply" data-id="${id}"><label>Upload Resume <span class="mut">(PDF, DOC, DOCX - Max 5MB)</span></label><input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx"><p class="mut sm" id="fname">No file chosen</p>
    <label>Cover Letter</label><textarea name="cover_letter" rows="6" placeholder="Tell the employer why you're the perfect fit for this role..."></textarea>
    <div class="btns"><button class="btn pri">Submit Application</button><a class="btn" href="#/job/${id}">Cancel</a></div></form></div></div>`);
}
function applicantsPage(id) {
  const u = need("employer"); if (!u) return;
  const j = jobs().find(x => x.id === id && x.owner === u.id);
  if (!j) { flash("Access denied!", "danger"); return go("/dashboard") }
  const list = apps().filter(a => a.jobId === id).sort((a, b) => b.created - a.created);
  render(`<div class="wrap pad narrow"><div class="between"><div><h1>Applicants</h1><p class="mut">${esc(j.title)} &mdash; ${esc(j.company)}</p></div><a class="btn" href="#/dashboard">← Back to Dashboard</a></div>
    <div class="card">${list.length ? list.map(a => { const p = users().find(x => x.id === a.userId) || {name: "(deleted user)", email: ""};
      return `<div class="app"><div style="flex:1;min-width:220px"><h3>${esc(p.name)}</h3><p class="mut sm">${esc(p.email)} | Applied: ${fdate(a.created)}${p.phone ? " | 📞 " + esc(p.phone) : ""}</p>
      ${p.skills ? `<p class="sm">Skills: ${esc(p.skills)}</p>` : ""}${a.cover ? `<div class="cover"><b>Cover Letter:</b><br>${esc(a.cover.slice(0, 300))}${a.cover.length > 300 ? "..." : ""}</div>` : ""}
      ${a.resume ? `<button class="btn sm" data-act="resume" data-id="${a.id}">📎 View Resume</button>` : ""}</div>
      <div class="right">${statusBadge(a.status)}<div>${a.status !== "Accepted" ? `<button class="btn sm ok" data-act="status" data-id="${a.id}" data-s="Accepted">Accept</button> ` : ""}${a.status !== "Rejected" ? `<button class="btn sm bad" data-act="status" data-id="${a.id}" data-s="Rejected">Reject</button>` : ""}</div></div></div>` }).join("")
      : '<div class="empty"><p>No applicants yet for this job.</p></div>'}</div></div>`);
}

/* ---------- PROFILE ---------- */
function profilePage() {
  const u = need(); if (!u) return;
  render(`<div class="wrap pad narrow"><div class="card"><div class="jtop" style="margin-bottom:10px"><div class="av">${esc((u.name[0] || "U").toUpperCase())}</div><div><h1>My Profile</h1><p class="mut">${esc(u.role)}</p></div></div>
    <form data-form="profile"><label>Full Name<input name="name" required value="${esc(u.name)}"></label><label>Email<input type="email" value="${esc(u.email)}" disabled></label>
    <label>Phone<input name="phone" value="${esc(u.phone)}" placeholder="+91 XXXXXXXXXX"></label>
    ${u.role === "seeker" ? `<label>Skills<input name="skills" value="${esc(u.skills)}" placeholder="HTML, CSS, JavaScript..."></label>` : ""}
    <label>Bio<textarea name="bio" rows="4" placeholder="Tell us about yourself...">${esc(u.bio)}</textarea></label><div class="btns"><button class="btn pri">Update Profile</button></div></form></div></div>`);
}

/* ---------- FORM HANDLERS ---------- */
const forms = {
  search: (f, d) => go("/?" + new URLSearchParams([...d].filter(([k, v]) => String(v).trim()))),
  login: async (f, d) => {
    const u = users().find(x => x.email === d.get("email").trim().toLowerCase());
    if (u && u.pw === await hash(d.get("password"), u.salt)) { put("jpp_session", u.id); flash(`Welcome back, ${u.name}!`, "success"); go("/dashboard") }
    else { flash("Invalid email or password.", "danger"); route() }
  },
  register: async (f, d) => {
    const email = d.get("email").trim().toLowerCase(), pw = d.get("password");
    if (pw.length < 6) { flash("Password must be at least 6 characters.", "danger"); return route() }
    if (pw !== d.get("confirm_password")) { flash("Passwords do not match!", "danger"); return route() }
    if (users().some(x => x.email === email)) { flash("Email already registered!", "danger"); return route() }
    const salt = uid(), all = users();
    all.push({id: uid(), name: d.get("name").trim(), email, salt, pw: await hash(pw, salt), role: d.get("role"), phone: "", bio: "", skills: ""});
    saveUsers(all); flash("Registration successful! Please login.", "success"); go("/login");
  },
  job: (f, d) => {
    const u = need("employer"); if (!u) return;
    const id = f.dataset.id, all = jobs(), t = k => d.get(k).trim();
    const o = {title: t("title"), company: t("company"), location: t("location"), description: t("description"), salary: t("salary"), type: d.get("job_type"), experience: t("experience"), skills: t("skills")};
    if (id) { const j = all.find(x => x.id === id && x.owner === u.id); if (j) Object.assign(j, o, {active: d.has("active")}); flash("Job updated!", "success") }
    else { all.push({id: uid(), owner: u.id, created: Date.now(), active: true, ...o}); flash("Job posted successfully!", "success") }
    saveJobs(all); go("/dashboard");
  },
  apply: async (f, d) => {
    const u = need("seeker"); if (!u) return;
    const jid = f.dataset.id, file = d.get("resume"), has = file && file.name;
    if (apps().some(a => a.jobId === jid && a.userId === u.id)) { flash("You have already applied for this job!", "warning"); return go("/job/" + jid) }
    if (has && !/\.(pdf|docx?)$/i.test(file.name)) { flash("Only PDF, DOC or DOCX files are allowed.", "danger"); return route() }
    if (has && file.size > 5 * 1024 * 1024) { flash("Resume must be smaller than 5 MB.", "danger"); return route() }
    const id = uid(); let resume = "";
    if (has) { try { await putFile(id, file); resume = file.name } catch (e) {} }
    const all = apps(); all.push({id, jobId: jid, userId: u.id, cover: d.get("cover_letter").trim(), resume, status: "Pending", created: Date.now()});
    saveApps(all); flash("Application submitted successfully!", "success"); go("/dashboard");
  },
  profile: (f, d) => {
    const all = users(), u = all.find(x => x.id === get("jpp_session", "")); if (!u) return;
    Object.assign(u, {name: d.get("name").trim(), phone: d.get("phone").trim(), bio: d.get("bio").trim()}); if (d.has("skills")) u.skills = d.get("skills").trim();
    saveUsers(all); flash("Profile updated!", "success"); route();
  }
};
document.addEventListener("submit", e => { const f = e.target; if (f.dataset.form) { e.preventDefault(); forms[f.dataset.form](f, new FormData(f)) } });

/* ---------- BUTTON ACTIONS ---------- */
const acts = {
  del: (d, el) => {
    if (el.dataset.sure) { saveJobs(jobs().filter(j => j.id !== d.id)); saveApps(apps().filter(a => a.jobId !== d.id)); flash("Job deleted.", "info"); route() }
    else { el.dataset.sure = 1; el.textContent = "Sure?"; setTimeout(() => { el.textContent = "Delete"; delete el.dataset.sure }, 3000) }
  },
  status: d => {
    const u = need("employer"), all = apps(), a = all.find(x => x.id === d.id);
    if (!u || !a || !jobs().some(j => j.id === a.jobId && j.owner === u.id)) return;
    a.status = d.s; saveApps(all); flash(`Application marked as ${d.s}.`, "success"); route();
  },
  resume: async d => {
    let f = null; try { f = await getFile(d.id) } catch (e) {}
    if (f) window.open(URL.createObjectURL(f), "_blank"); else { flash("Resume file not found.", "danger"); route() }
  },
  sample: () => {
    const mk = (company, title, location, type, salary, experience, skills, description) => ({id: uid(), owner: "sample", created: Date.now(), active: true, company, title, location, type, salary, experience, skills, description});
    saveJobs(jobs().concat([
      mk("TechNova", "Frontend Developer", "Bengaluru", "Full Time", "₹8-12 LPA", "1-3 years", "HTML, CSS, JavaScript, React", "Build modern, responsive user interfaces for our products."),
      mk("PixelCraft", "UI/UX Designer Intern", "Remote", "Internship", "₹15,000/month", "Fresher", "Figma, Design", "Work with our designers on real product screens."),
      mk("DataWorks", "Junior Web Developer", "Chandigarh", "Full Time", "₹4-6 LPA", "Fresher", "HTML, CSS, JavaScript", "Maintain company websites and fix bugs."),
      mk("BrandBuzz", "Digital Marketing Executive", "Delhi", "Part Time", "₹3-5 LPA", "1-2 years", "SEO, Social Media", "Run social media campaigns and track results."),
      mk("CodeLance", "Freelance Developer", "Remote", "Freelance", "Per project", "2+ years", "JavaScript, Node.js", "Build small websites for clients on a project basis.")]));
    route();
  }
};
document.addEventListener("click", e => { const a = e.target.closest("[data-act]"); if (a) acts[a.dataset.act](a.dataset, a) });
document.addEventListener("input", e => {
  const p = e.target.dataset.prev, v = e.target.value;
  if (p === "t") $("#pv-t").textContent = v || "Job Title";
  if (p === "c") { $("#pv-c").textContent = v || "Company Name"; $("#pv-a").textContent = (v[0] || "C").toUpperCase() }
});
document.addEventListener("change", e => { if (e.target.id === "resume") $("#fname").textContent = e.target.files[0] ? e.target.files[0].name : "No file chosen" });
$("#menuBtn").onclick = () => $("#nav").classList.toggle("open");

/* ---------- ROUTER ---------- */
const routes = [
  [/^\/$/, home], [/^\/login$/, loginPage], [/^\/register$/, registerPage], [/^\/dashboard$/, dashboard],
  [/^\/post-job$/, () => jobForm()], [/^\/edit-job\/(\w+)$/, jobForm], [/^\/job\/(\w+)$/, jobDetail],
  [/^\/apply\/(\w+)$/, applyPage], [/^\/applicants\/(\w+)$/, applicantsPage], [/^\/profile$/, profilePage],
  [/^\/logout$/, () => { put("jpp_session", ""); flash("Logged out successfully.", "info"); go("/login") }]
];
function route() {
  const path = (location.hash.slice(1) || "/").split("?")[0];
  for (const [re, fn] of routes) { const m = path.match(re); if (m) return fn(m[1]) }
  go("/");
}
addEventListener("hashchange", route);
route();

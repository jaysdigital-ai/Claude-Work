/* Dental automation demo (demo-dental-automation.html).
   Talks to the demo API on Supabase. Every visitor gets a private sandbox,
   identified by a random id kept in sessionStorage for this tab only. */
(function () {
  "use strict";
  var API = "https://omqjodseliirfbyizuvm.supabase.co/functions/v1/demo-api";
  var KEY = "agila-dental-demo";
  var root = document.getElementById("dd");
  if (!root) return;

  var STAGES = [
    ["new_lead", "New lead", "#3fe6ff", "is-cyan"], ["contacted", "Contacted", "#8fb6ff", "is-blue"],
    ["booked", "Booked", "#c9a6ff", "is-violet"], ["showed", "Showed", "#6fe3a8", "is-good"],
    ["no_show", "No-show", "#ff9a8f", "is-crit"], ["recall", "Recall", "#ffcf8a", "is-amber"], ["nurture", "Nurture", "#b9bfdc", ""]
  ];
  var STEP = {
    instant_sms: "Instant text", instant_email: "Instant email", missed_call_sms: "Missed call text-back",
    followup_1h_sms: "1 hour nudge", followup_d1_email: "Day 1 email", followup_d3_sms: "Day 3 text", followup_d7_sms: "Day 7 final text",
    appt_confirm_sms: "Booking confirmation text", appt_confirm_email: "Booking confirmation email",
    appt_reminder_72h: "72 hour reminder", appt_reminder_24h: "24 hour reminder", appt_unconfirmed_task: "Call task if unconfirmed", appt_reminder_2h: "2 hour reminder",
    thank_you_sms: "Thank-you text", review_request: "Review request", review_link_sms: "Google review link", review_followup_sms: "Reply to low rating",
    no_show_sms: "No-show text", no_show_call_task: "No-show call task", no_show_d2_sms: "No-show day 2 text",
    recall_6m_sms: "6 month recall text", recall_6m_email: "6 month recall email", recall_6m_final_sms: "6 month final reminder",
    reactivation_12m_sms: "12 month reactivation", appt_confirmed_reply: "Confirmation reply"
  };
  var REPLY_SAID = {
    opted_out: "Opted out. All future texts are cancelled.",
    appointment_confirmed: "Appointment confirmed.",
    review_link_sent: "Happy patient. Google review link sent.",
    manager_alerted: "Low rating. The practice manager has a call task.",
    task_created: "Follow-ups paused and a task created for staff to answer."
  };
  var ICON = {
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.800 7L4 20l1.200-4.400A8 8 0 1 1 21 12z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>'
  };
  var GUIDE = ["lead", "book", "confirm", "showed"];

  var data = null, selected = null, busy = false, toastTimer = null, session = null, isNew = false, tab = "chat", done = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nameOf(c) { return [c.first_name, c.last_name].filter(Boolean).join(" ") || (c.source === "missed_call" ? "Missed caller" : "New contact"); }
  function hasName(c) { return !!(c.first_name || c.last_name); }
  function initials(c) {
    var s = ((c.first_name || "").charAt(0) + (c.last_name || "").charAt(0)).toUpperCase();
    return s || "?";
  }
  function stageOf(key) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i][0] === key) return STAGES[i]; return [key, key, "#b9bfdc", ""]; }
  function stepName(k) { return STEP[k] || String(k || "").replace(/_/g, " "); }
  function fmt(ts) {
    var o = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    try { o.timeZone = (data && data.settings && data.settings.timezone) || undefined; return new Intl.DateTimeFormat("en-AU", o).format(new Date(ts)); }
    catch (e) { delete o.timeZone; return new Intl.DateTimeFormat("en-AU", o).format(new Date(ts)); }
  }
  function rel(ts) {
    var m = Math.round((new Date(ts) - Date.now()) / 60000);
    if (m <= 1) return "due now";
    if (m < 60) return "in " + m + " min";
    if (m < 2880) return "in " + Math.round(m / 60) + " h";
    if (m < 86400) return "in " + Math.round(m / 1440) + " days";
    return "in " + Math.round(m / 43200) + " months";
  }
  function toast(text) {
    var t = $("dd-toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4200);
  }
  function setStatus(text, kind) { $("dd-status").textContent = text; $("dd-dot").className = "dd-dot" + (kind ? " " + kind : ""); }
  function notice(text) { var n = $("dd-notice"); n.hidden = !text; n.textContent = text || ""; }
  function setBusy(b) { busy = b; root.classList.toggle("is-busy", b); }
  function flash(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("dd-flash"); void el.offsetWidth; el.classList.add("dd-flash");
  }

  function getSession() {
    var id = null;
    try { id = sessionStorage.getItem(KEY); done = JSON.parse(sessionStorage.getItem(KEY + "-guide") || "{}") || {}; } catch (e) { done = {}; }
    if (!id || !/^[a-z0-9]{16,40}$/.test(id)) {
      var bytes = new Uint8Array(12);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      id = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      isNew = true; done = {};
      try { sessionStorage.setItem(KEY, id); } catch (e) {}
    }
    return id;
  }
  function mark(step) {
    if (step) done[step] = true; else done = {};
    try { sessionStorage.setItem(KEY + "-guide", JSON.stringify(done)); } catch (e) {}
    renderGuide();
  }

  function call(action, payload) {
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: session, action: action, payload: payload || {} })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || !body.ok) throw new Error(body.error || "The demo did not answer. Try again in a moment.");
        return body;
      });
    }, function () { throw new Error("Could not reach the demo. Check your connection and try again."); });
  }
  function apply(body) {
    data = body.data;
    if (selected && !data.contacts.some(function (c) { return c.id === selected; })) selected = null;
    if (!selected && data.contacts.length) selected = data.contacts[0].id;
    notice(""); renderAll();
    setStatus("Running · updated " + new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date()), "is-live");
  }
  function load(action) {
    setStatus("Loading", "");
    return call(action || "load").then(apply, function (e) { setStatus("Not connected", "is-off"); notice(e.message); });
  }
  function act(action, payload, doneFn) {
    if (busy) return;
    setBusy(true);
    call(action, payload).then(function (body) {
      var r = body.result || {};
      if (r.contact_id) selected = r.contact_id;
      var said = doneFn(r);
      apply(body); toast(said);
    }, function (e) { toast(e.message); }).then(function () { setBusy(false); });
  }

  function nextStep(id) {
    for (var i = 0; i < data.queue.length; i++) if (data.queue[i].contact_id === id && data.queue[i].status === "pending") return data.queue[i];
    return null;
  }
  function renderAll() {
    var s = data.settings || {};
    $("dd-clinic").textContent = s.clinic_name || "Dental clinic";
    renderGuide(); renderStats(); renderBoard(); renderDetail(); renderTasks();
  }
  function renderGuide() {
    var count = 0, nextFound = false;
    var items = $("dd-steps").children;
    GUIDE.forEach(function (key, i) {
      var isDone = !!done[key];
      if (isDone) count++;
      items[i].className = isDone ? "is-done" : (!nextFound ? "is-next" : "");
      if (!isDone) nextFound = true;
      items[i].querySelector("i").textContent = isDone ? "✓" : String(i + 1);
    });
    $("dd-guide-count").textContent = count === 4 ? "All done. Keep exploring." : count + " of 4 done";
  }
  function renderStats() {
    var sent = data.messages.filter(function (m) { return m.direction === "outbound"; }).length;
    var queued = data.queue.filter(function (q) { return q.status === "pending"; }).length;
    var vals = [data.contacts.length, sent, queued, data.tasks.length];
    var tiles = $("dd-stats").querySelectorAll("b");
    vals.forEach(function (v, i) { tiles[i].textContent = v; });
  }
  function renderBoard() {
    $("dd-board").innerHTML = STAGES.map(function (st) {
      var list = data.contacts.filter(function (c) { return c.stage === st[0]; });
      var cards = list.map(function (c) {
        var n = nextStep(c.id);
        return '<button type="button" class="dd-card' + (c.id === selected ? " is-sel" : "") + '" data-dd="select" data-id="' + esc(c.id) + '">' +
          '<span class="dd-card-top"><span class="dd-avatar">' + esc(initials(c)) + "</span><b>" + esc(nameOf(c)) + "</b></span>" +
          "<small>" + esc(hasName(c) ? (c.source || "").replace(/_/g, " ") : (c.phone || c.email || "")) + (c.treatment_interest ? " · " + esc(c.treatment_interest) : "") + "</small>" +
          (n ? '<small class="dd-next">Next: ' + esc(stepName(n.step_key)) + " " + rel(n.due_at) + "</small>" : "<small>Nothing queued</small>") +
          (c.sms_opt_out ? '<span><span class="dd-pill is-crit">Opted out</span></span>' : "") + "</button>";
      }).join("");
      return '<div class="dd-col" style="--dd-stage:' + st[2] + '"><div class="dd-col-head"><i></i><span>' + st[1] + "</span><span>" + list.length + "</span></div>" + (cards || '<div class="dd-col-empty">No one here</div>') + "</div>";
    }).join("");
  }
  function renderDetail() {
    var c = null;
    data.contacts.forEach(function (x) { if (x.id === selected) c = x; });
    if (!c) { $("dd-detail").innerHTML = '<div class="dd-empty">Your sandbox is empty. Send a new enquiry, or load the sample patients, to watch the automation respond.</div>'; return; }
    var st = stageOf(c.stage);
    var appt = data.appointments.filter(function (a) { return a.contact_id === c.id && (a.status === "booked" || a.status === "confirmed"); }).pop();
    var msgs = data.messages.filter(function (m) { return m.contact_id === c.id; });
    var queue = data.queue.filter(function (q) { return q.contact_id === c.id; });
    var pending = queue.filter(function (q) { return q.status === "pending"; });
    var stopped = queue.filter(function (q) { return q.status !== "pending"; });
    var def = new Date(Date.now() + 3 * 864e5); def.setHours(10, 0, 0, 0);
    var defLocal = new Date(def - def.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    var thread = msgs.map(function (m) {
      var out = m.direction === "outbound", email = m.channel === "email";
      return '<div class="dd-msg ' + (out ? "is-out" : "is-in") + (email ? " is-email" : "") + '">' +
        '<span class="dd-meta">' + (ICON[m.channel] || "") + (out ? esc(stepName(m.step_key)) : "Patient replied") + " · " + fmt(m.created_at) + "</span>" +
        '<div class="dd-body">' + (m.subject ? '<span class="dd-subj">' + esc(m.subject) + "</span>" : "") + esc(m.body) + "</div></div>";
    }).join("") || '<div class="dd-empty">No messages yet.</div>';

    var chat =
      '<div class="dd-thread" id="dd-thread">' + thread + "</div>" +
      '<div class="dd-composer"><input id="dd-reply-text" autocomplete="off" maxlength="300" aria-label="Reply as the patient" placeholder="Reply as the patient…"><button type="button" class="dd-primary" data-dd="reply">Send</button></div>' +
      '<div class="dd-quick"><span>Quick replies:</span><button type="button" class="dd-chip" data-dd="quick" data-text="C">C to confirm</button><button type="button" class="dd-chip" data-dd="quick" data-text="5">Rate 5</button><button type="button" class="dd-chip" data-dd="quick" data-text="2">Rate 2</button><button type="button" class="dd-chip" data-dd="quick" data-text="How much is a clean?">Ask a question</button><button type="button" class="dd-chip dd-danger" data-dd="quick" data-text="STOP">STOP</button></div>';

    function row(q, off) {
      return '<div class="dd-row' + (off ? " is-off" : "") + '"><div class="dd-row-main"><span class="dd-ico ' + (q.channel === "email" ? "is-email" : q.channel === "task" ? "is-task" : "") + '">' + (ICON[q.channel] || ICON.sms) + "</span><div>" +
        (off ? "<s>" + esc(stepName(q.step_key)) + "</s>" : esc(stepName(q.step_key))) + "</div></div>" +
        '<div class="dd-when">' + (off ? esc(q.note || q.status) : "<b>" + rel(q.due_at) + "</b>" + fmt(q.due_at)) + "</div></div>";
    }
    var plan = '<div class="dd-plan">' +
      '<div class="dd-panel-head"><div class="dd-sub">Coming up</div>' + (pending.length ? '<button type="button" class="dd-chip" data-dd="advance">Skip the wait: send the next one now</button>' : "") + "</div>" +
      '<div class="dd-rows">' + (pending.map(function (q) { return row(q, false); }).join("") || '<div class="dd-empty">Nothing queued for this patient.</div>') + "</div>" +
      (stopped.length ? '<div class="dd-sub">Stopped automatically</div><div class="dd-rows">' + stopped.map(function (q) { return row(q, true); }).join("") + "</div>" : "") + "</div>";

    var nextBox = appt
      ? '<div class="dd-nextbox" id="dd-nextbox"><div class="dd-sub">Appointment</div><div class="dd-actions"><div class="dd-appt"><b>' + esc(appt.service) + '</b><br><span class="dd-muted">' + fmt(appt.starts_at) + '</span> <span class="dd-pill ' + (appt.status === "confirmed" ? "is-good" : "is-amber") + '">' + (appt.status === "confirmed" ? "Confirmed" : "Not confirmed yet") + "</span></div>" +
        '<button type="button" class="dd-primary" data-dd="outcome" data-id="' + esc(appt.id) + '" data-outcome="showed">Mark as showed</button>' +
        '<button type="button" class="dd-danger" data-dd="outcome" data-id="' + esc(appt.id) + '" data-outcome="no_show">Mark as no-show</button></div></div>'
      : '<div class="dd-nextbox" id="dd-nextbox"><div class="dd-sub">Book an appointment</div><div class="dd-actions"><label>Date and time<input id="dd-book-when" type="datetime-local" value="' + defLocal + '"></label>' +
        '<label>Service<input id="dd-book-service" maxlength="80" value="Check-up and clean"></label><button type="button" class="dd-primary" data-dd="book">Book it</button></div></div>';

    $("dd-detail").innerHTML =
      '<div class="dd-who" style="--dd-stage:' + st[2] + '"><span class="dd-avatar is-lg">' + esc(initials(c)) + "</span><div><h3>" + esc(nameOf(c)) + "</h3>" +
      '<div class="dd-facts">' + (c.phone ? "<span>" + esc(c.phone) + "</span>" : "") + (c.email ? "<span>" + esc(c.email) + "</span>" : "") + "<span>From " + esc((c.source || "unknown").replace(/_/g, " ")) + "</span>" + (c.treatment_interest ? "<span>Wants " + esc(c.treatment_interest) + "</span>" : "") + "</div></div>" +
      '<div class="dd-badges"><span class="dd-pill ' + st[3] + '">' + esc(st[1]) + "</span>" + (c.sms_opt_out ? '<span class="dd-pill is-crit">Opted out of SMS</span>' : "") + "</div></div>" +
      '<div class="dd-tabs" role="tablist"><button type="button" role="tab" aria-selected="' + (tab === "chat") + '" class="' + (tab === "chat" ? "is-on" : "") + '" data-dd="tab" data-tab="chat">Conversation <em>' + msgs.length + '</em></button>' +
      '<button type="button" role="tab" aria-selected="' + (tab === "plan") + '" class="' + (tab === "plan" ? "is-on" : "") + '" data-dd="tab" data-tab="plan">Schedule <em>' + pending.length + "</em></button></div>" +
      (tab === "chat" ? chat : plan) + nextBox;
    var th = $("dd-thread"); if (th) th.scrollTop = th.scrollHeight;
  }
  function renderTasks() {
    $("dd-task-count").textContent = data.tasks.length ? data.tasks.length + " open" : "";
    $("dd-tasks").innerHTML = data.tasks.map(function (t) {
      var c = null;
      data.contacts.forEach(function (x) { if (x.id === t.contact_id) c = x; });
      return '<div class="dd-row"><div class="dd-row-main"><span class="dd-ico is-task">' + ICON.task + "</span><div><b>" + esc(t.title) + '</b><br><span class="dd-muted">' + (c ? esc(nameOf(c)) + " · " : "") + esc(t.detail || "") + "</span></div></div>" +
        '<button type="button" class="dd-chip" data-dd="task-done" data-id="' + esc(t.id) + '">Done</button></div>';
    }).join("") || '<div class="dd-empty">Nothing for staff to do right now.</div>';
  }

  var RESET_HTML = '<button type="button" class="dd-ghost" data-dd="seed">Load sample patients</button><button type="button" class="dd-ghost dd-danger" data-dd="reset-ask">Clear my demo</button>';
  function goto(step) {
    if (step === "lead") { flash($("dd-lead-form")); return; }
    if (!data || !data.contacts.length) return toast("Send a new enquiry first.");
    if (step === "book") {
      if (!$("dd-book-when")) return toast("This patient is already booked. Select one without an appointment, or send a new enquiry.");
      return flash($("dd-nextbox"));
    }
    if (step === "confirm") {
      if (tab !== "chat") { tab = "chat"; renderDetail(); }
      return flash(root.querySelector(".dd-quick"));
    }
    if (step === "showed") {
      if ($("dd-book-when")) return toast("Book this patient first, then mark them as showed.");
      return flash($("dd-nextbox"));
    }
  }
  root.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-dd]"); if (!b) return;
    var a = b.getAttribute("data-dd");
    if (a === "goto") return goto(b.getAttribute("data-step"));
    if (a === "select") { selected = b.getAttribute("data-id"); if (data) { renderBoard(); renderDetail(); } return; }
    if (a === "tab") { tab = b.getAttribute("data-tab"); if (data) renderDetail(); return; }
    if (a === "reset-ask") { $("dd-reset-box").innerHTML = '<span>Delete every patient in your sandbox?</span><button type="button" class="dd-ghost dd-danger" data-dd="reset-yes">Yes, clear it</button><button type="button" class="dd-ghost" data-dd="reset-no">Keep it</button>'; return; }
    if (a === "reset-no") { $("dd-reset-box").innerHTML = RESET_HTML; return; }
    if (a === "reset-yes") { $("dd-reset-box").innerHTML = RESET_HTML; selected = null; return act("reset", {}, function () { mark(null); return "Sandbox cleared."; }); }
    if (a === "seed") {
      if (data && data.contacts.length) return toast("Clear your demo first to load the samples again.");
      return act("seed", {}, function () { return "Three sample patients loaded."; });
    }
    if (a === "task-done") return act("task_done", { task_id: b.getAttribute("data-id") }, function () { return "Task marked done."; });
    if (!selected) return;
    if (a === "advance") return act("advance", { contact_id: selected }, function (r) {
      return r.advanced ? (r.result === "sent" ? "Sent: " + stepName(r.step) : "Skipped: " + (r.note || stepName(r.step))) : "Nothing left to send.";
    });
    if (a === "outcome") {
      var outcome = b.getAttribute("data-outcome");
      return act("outcome", { appointment_id: b.getAttribute("data-id"), outcome: outcome }, function () {
        if (outcome === "showed") { mark("showed"); tab = "plan"; return "Marked as showed. Thank-you, review and recall are queued."; }
        tab = "plan"; return "Marked as no-show. Reschedule steps are queued.";
      });
    }
    if (a === "book") {
      var when = $("dd-book-when").value;
      if (!when) return toast("Pick a date and time first.");
      return act("book", { contact_id: selected, starts_at: new Date(when).toISOString(), service: $("dd-book-service").value }, function () { mark("book"); tab = "chat"; return "Booked. Follow-ups stopped and reminders queued."; });
    }
    if (a === "reply" || a === "quick") {
      var text = a === "quick" ? b.getAttribute("data-text") : $("dd-reply-text").value.trim();
      if (!text) return toast("Type a reply first.");
      return act("reply", { contact_id: selected, body: text }, function (r) {
        if (r.action === "appointment_confirmed") mark("confirm");
        tab = "chat"; return REPLY_SAID[r.action] || "Reply received.";
      });
    }
  });
  root.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.id === "dd-reply-text") { ev.preventDefault(); var b = root.querySelector('[data-dd="reply"]'); if (b) b.click(); }
  });
  $("dd-lead-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    function v(id) { return $(id).value.trim(); }
    if (!v("dd-lead-phone") && !v("dd-lead-email")) return toast("Add a mobile number or an email.");
    act("lead", { first_name: v("dd-lead-first"), last_name: v("dd-lead-last"), phone: v("dd-lead-phone"), email: v("dd-lead-email"), source: v("dd-lead-source"), treatment_interest: v("dd-lead-interest") },
      function (r) {
        if (r.enrolled) { mark("lead"); tab = "chat"; return "Enquiry received. Instant reply sent and follow-ups queued."; }
        return "Already booked, so staff got a task instead.";
      });
  });
  $("dd-refresh").addEventListener("click", function () { if (!busy) load(); });

  session = getSession();
  renderGuide();
  load(isNew ? "seed" : "load");
})();

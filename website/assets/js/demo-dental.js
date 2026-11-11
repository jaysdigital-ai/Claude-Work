/* Dental automation demo (demo-dental-automation.html).
   Talks to the demo API on Supabase. Every visitor gets a private sandbox,
   identified by a random id kept in sessionStorage for this tab only. */
(function () {
  "use strict";
  var API = "https://omqjodseliirfbyizuvm.supabase.co/functions/v1/demo-api";
  var KEY = "agila-dental-demo";
  var root = document.getElementById("dd");
  if (!root) return;

  var STAGES = [["new_lead", "New lead"], ["contacted", "Contacted"], ["booked", "Booked"], ["showed", "Showed"], ["no_show", "No-show"], ["recall", "Recall"], ["nurture", "Nurture"]];
  var STAGE_PILL = { booked: "is-accent", showed: "is-good", no_show: "is-crit", recall: "is-warn" };
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

  var data = null, selected = null, busy = false, toastTimer = null, session = null, isNew = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nameOf(c) { return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.phone || c.email || "Unknown"; }
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
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }
  function setStatus(text, kind) { $("dd-status").textContent = text; $("dd-dot").className = "dd-dot" + (kind ? " " + kind : ""); }
  function notice(text) { var n = $("dd-notice"); n.hidden = !text; n.textContent = text || ""; }
  function setBusy(b) { busy = b; root.classList.toggle("is-busy", b); }

  function getSession() {
    var id = null;
    try { id = sessionStorage.getItem(KEY); } catch (e) {}
    if (!id || !/^[a-z0-9]{16,40}$/.test(id)) {
      var bytes = new Uint8Array(12);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      id = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      isNew = true;
      try { sessionStorage.setItem(KEY, id); } catch (e) {}
    }
    return id;
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
  function act(action, payload, done) {
    if (busy) return;
    setBusy(true);
    call(action, payload).then(function (body) {
      var r = body.result || {};
      if (r.contact_id) selected = r.contact_id;
      apply(body); toast(done(r));
    }, function (e) { toast(e.message); }).then(function () { setBusy(false); });
  }

  function nextStep(id) {
    for (var i = 0; i < data.queue.length; i++) if (data.queue[i].contact_id === id && data.queue[i].status === "pending") return data.queue[i];
    return null;
  }
  function renderAll() {
    var s = data.settings || {};
    $("dd-clinic").textContent = s.clinic_name || "Dental clinic";
    renderBoard(); renderDetail(); renderTasks();
  }
  function renderBoard() {
    $("dd-board").innerHTML = STAGES.map(function (st) {
      var list = data.contacts.filter(function (c) { return c.stage === st[0]; });
      var cards = list.map(function (c) {
        var n = nextStep(c.id);
        return '<button type="button" class="dd-card' + (c.id === selected ? " is-sel" : "") + '" data-dd="select" data-id="' + esc(c.id) + '">' +
          "<b>" + esc(nameOf(c)) + "</b>" +
          "<small>" + esc((c.source || "").replace(/_/g, " ")) + (c.treatment_interest ? " · " + esc(c.treatment_interest) : "") + "</small>" +
          "<small>" + (n ? "Next: " + esc(stepName(n.step_key)) + " · " + rel(n.due_at) : "Nothing queued") + "</small>" +
          (c.sms_opt_out ? '<span><span class="dd-pill is-crit">Opted out of SMS</span></span>' : "") + "</button>";
      }).join("");
      return '<div class="dd-col"><div class="dd-col-head"><span>' + st[1] + "</span><span>" + list.length + "</span></div>" + (cards || '<div class="dd-col-empty">No one here</div>') + "</div>";
    }).join("");
  }
  function renderDetail() {
    var c = null;
    data.contacts.forEach(function (x) { if (x.id === selected) c = x; });
    if (!c) { $("dd-detail").innerHTML = '<div class="dd-empty">Your sandbox is empty. Send a test enquiry from the form, or load the sample patients, to watch the automation respond.</div>'; return; }
    var stageLabel = c.stage;
    STAGES.forEach(function (st) { if (st[0] === c.stage) stageLabel = st[1]; });
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
        '<span class="dd-meta">' + (out ? esc(stepName(m.step_key)) : "Patient replied") + " · " + esc(m.channel) + " · " + fmt(m.created_at) + "</span>" +
        '<div class="dd-body">' + (m.subject ? '<span class="dd-subj">' + esc(m.subject) + "</span>" : "") + esc(m.body) + "</div></div>";
    }).join("") || '<div class="dd-empty">No messages yet.</div>';

    var apptBlock = appt
      ? '<div class="dd-sub">Appointment</div><div class="dd-actions"><div class="dd-appt"><b>' + esc(appt.service) + '</b><br><span class="dd-muted">' + fmt(appt.starts_at) + " · " + esc(appt.status) + "</span></div>" +
        '<button type="button" data-dd="outcome" data-id="' + esc(appt.id) + '" data-outcome="showed">Mark showed</button>' +
        '<button type="button" class="dd-danger" data-dd="outcome" data-id="' + esc(appt.id) + '" data-outcome="no_show">Mark no-show</button></div>'
      : '<div class="dd-sub">Book an appointment</div><div class="dd-actions"><label>Date and time<input id="dd-book-when" type="datetime-local" value="' + defLocal + '"></label>' +
        '<label>Service<input id="dd-book-service" maxlength="80" value="Check-up and clean"></label><button type="button" class="dd-primary" data-dd="book">Book</button></div>';

    $("dd-detail").innerHTML =
      '<div class="dd-who"><h3>' + esc(nameOf(c)) + '</h3><span class="dd-pill ' + (STAGE_PILL[c.stage] || "") + '">' + esc(stageLabel) + "</span>" + (c.sms_opt_out ? '<span class="dd-pill is-crit">Opted out of SMS</span>' : "") + "</div>" +
      '<div class="dd-facts">' + (c.phone ? "<span>" + esc(c.phone) + "</span>" : "") + (c.email ? "<span>" + esc(c.email) + "</span>" : "") + "<span>Source: " + esc((c.source || "unknown").replace(/_/g, " ")) + "</span>" + (c.treatment_interest ? "<span>Interest: " + esc(c.treatment_interest) + "</span>" : "") + "</div>" +
      '<div class="dd-thread" id="dd-thread">' + thread + "</div>" +
      '<div class="dd-sub">Reply as the patient</div>' +
      '<div class="dd-actions"><label>Message<input id="dd-reply-text" autocomplete="off" maxlength="300" placeholder="Type what the patient texts back"></label><button type="button" data-dd="reply">Send reply</button></div>' +
      '<div class="dd-actions"><button type="button" class="dd-chip" data-dd="quick" data-text="C">C to confirm</button><button type="button" class="dd-chip" data-dd="quick" data-text="5">Rate 5</button><button type="button" class="dd-chip" data-dd="quick" data-text="2">Rate 2</button><button type="button" class="dd-chip" data-dd="quick" data-text="How much is a clean?">Ask a question</button><button type="button" class="dd-chip dd-danger" data-dd="quick" data-text="STOP">STOP</button></div>' +
      apptBlock +
      '<div class="dd-panel-head"><div class="dd-sub">Coming up</div>' + (pending.length ? '<button type="button" data-dd="advance">Send next step now</button>' : "") + "</div>" +
      '<div class="dd-rows">' + (pending.map(function (q) {
        return '<div class="dd-row"><div>' + esc(stepName(q.step_key)) + ' <span class="dd-pill">' + esc(q.channel) + '</span></div><div class="dd-when">' + fmt(q.due_at) + " · " + rel(q.due_at) + "</div></div>";
      }).join("") || '<div class="dd-row is-off"><div>Nothing queued for this patient.</div></div>') + "</div>" +
      (stopped.length ? '<div class="dd-sub">Stopped by the automation</div><div class="dd-rows">' + stopped.map(function (q) {
        return '<div class="dd-row is-off"><div>' + esc(stepName(q.step_key)) + '</div><div class="dd-when">' + esc(q.note || q.status) + "</div></div>";
      }).join("") + "</div>" : "");
    var th = $("dd-thread"); th.scrollTop = th.scrollHeight;
  }
  function renderTasks() {
    $("dd-task-count").textContent = data.tasks.length ? data.tasks.length + " open" : "";
    $("dd-tasks").innerHTML = data.tasks.map(function (t) {
      var c = null;
      data.contacts.forEach(function (x) { if (x.id === t.contact_id) c = x; });
      return '<div class="dd-row"><div><b>' + esc(t.title) + '</b><br><span class="dd-muted">' + (c ? esc(nameOf(c)) + " · " : "") + esc(t.detail || "") + "</span></div>" +
        '<button type="button" class="dd-chip" data-dd="task-done" data-id="' + esc(t.id) + '">Done</button></div>';
    }).join("") || '<div class="dd-empty">No open tasks.</div>';
  }

  var RESET_HTML = '<button type="button" class="dd-danger" data-dd="reset-ask">Clear my demo</button><button type="button" data-dd="seed">Load sample patients</button>';
  root.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-dd]"); if (!b) return;
    var a = b.getAttribute("data-dd");
    if (a === "select") { selected = b.getAttribute("data-id"); if (data) { renderBoard(); renderDetail(); } return; }
    if (a === "reset-ask") { $("dd-reset-box").innerHTML = '<span class="dd-muted">Delete every patient in your sandbox?</span><button type="button" class="dd-danger" data-dd="reset-yes">Yes, clear it</button><button type="button" data-dd="reset-no">Keep it</button>'; return; }
    if (a === "reset-no") { $("dd-reset-box").innerHTML = RESET_HTML; return; }
    if (a === "reset-yes") { $("dd-reset-box").innerHTML = RESET_HTML; selected = null; return act("reset", {}, function () { return "Sandbox cleared."; }); }
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
        return outcome === "showed" ? "Marked as showed. Thank-you, review and recall are queued." : "Marked as no-show. Reschedule steps are queued.";
      });
    }
    if (a === "book") {
      var when = $("dd-book-when").value;
      if (!when) return toast("Pick a date and time first.");
      return act("book", { contact_id: selected, starts_at: new Date(when).toISOString(), service: $("dd-book-service").value }, function () { return "Booked. Follow-ups stopped and reminders queued."; });
    }
    if (a === "reply" || a === "quick") {
      var text = a === "quick" ? b.getAttribute("data-text") : $("dd-reply-text").value.trim();
      if (!text) return toast("Type a reply first.");
      return act("reply", { contact_id: selected, body: text }, function (r) { return REPLY_SAID[r.action] || "Reply received."; });
    }
  });
  $("dd-lead-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    function v(id) { return $(id).value.trim(); }
    if (!v("dd-lead-phone") && !v("dd-lead-email")) return toast("Add a mobile number or an email.");
    act("lead", { first_name: v("dd-lead-first"), last_name: v("dd-lead-last"), phone: v("dd-lead-phone"), email: v("dd-lead-email"), source: v("dd-lead-source"), treatment_interest: v("dd-lead-interest") },
      function (r) { return r.enrolled ? "Enquiry received. Instant reply sent and follow-ups queued." : "Already booked, so staff got a task instead."; });
  });
  $("dd-refresh").addEventListener("click", function () { if (!busy) load(); });

  session = getSession();
  load(isNew ? "seed" : "load");
})();

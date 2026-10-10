"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Task = { id: string; title: string; category: string; xp: number; done: boolean };
type Completion = { id: string; task_id: string | null; completed_on: string; xp: number };
type Tab = "Dashboard" | "My quests" | "Progress" | "Reminder" | "Settings";
type PersonalReminder = { id: string; title: string; time: string; date: string; repeatDaily: boolean; enabled: boolean };
type FocusArea = "WELLNESS" | "STUDY" | "PERSONAL GROWTH" | "HOME" | "WORK" | "CONFIDENCE";
type Profile = { user_id: string; focus_areas: string[]; onboarding_complete: boolean; reminder_time: string | null; reminders_enabled: boolean };

const focusOptions: { id: FocusArea; title: string; detail: string; icon: string }[] = [
  { id: "WELLNESS", title: "Wellness", detail: "Movement, water, rest", icon: "♡" },
  { id: "STUDY", title: "Study", detail: "Focus and learning", icon: "✎" },
  { id: "PERSONAL GROWTH", title: "Personal growth", detail: "Reading and reflection", icon: "✧" },
  { id: "HOME", title: "Home", detail: "Small daily resets", icon: "⌂" },
  { id: "WORK", title: "Work & goals", detail: "Progress on priorities", icon: "❀" },
  { id: "CONFIDENCE", title: "Confidence", detail: "Self-care and courage", icon: "☆" },
];

const taskBank: Record<FocusArea, { title: string; xp: number }[]> = {
  WELLNESS: [
    { title: "Drink a glass of water after waking up", xp: 10 },
    { title: "Move your body for 10 minutes", xp: 20 },
    { title: "Eat one nourishing meal", xp: 15 },
    { title: "Take a 5-minute stretch break", xp: 10 },
  ],
  STUDY: [
    { title: "Complete one 25-minute focus session", xp: 25 },
    { title: "Review today's class notes", xp: 20 },
    { title: "Practice one topic you find difficult", xp: 25 },
    { title: "Put your phone away while studying", xp: 15 },
  ],
  "PERSONAL GROWTH": [
    { title: "Read 10 pages or learn for 10 minutes", xp: 20 },
    { title: "Write down one thought in a journal", xp: 15 },
    { title: "Spend 5 minutes planning tomorrow", xp: 15 },
    { title: "Learn one small new thing", xp: 20 },
  ],
  HOME: [
    { title: "Reset your desk or study space", xp: 15 },
    { title: "Put away 5 things", xp: 10 },
    { title: "Prepare what you need for tomorrow", xp: 15 },
    { title: "Spend 5 minutes tidying one area", xp: 15 },
  ],
  WORK: [
    { title: "Choose your most important task", xp: 15 },
    { title: "Make progress on one priority for 20 minutes", xp: 25 },
    { title: "Clear one small pending task", xp: 15 },
    { title: "Review what you achieved today", xp: 15 },
  ],
  CONFIDENCE: [
    { title: "Get ready in a way that makes you feel good", xp: 15 },
    { title: "Do one thing you've been putting off", xp: 25 },
    { title: "Write down one thing you did well", xp: 15 },
    { title: "Take 5 minutes away from scrolling", xp: 10 },
  ],
};

const rewardMessages = [
  "A tiny win is still a win. Your future self is cheering for you! 🌷",
  "Your black cat has found a little lucky charm for you. Keep blooming! 🎀",
  "Reward unlocked: permission to take a guilt-free 5-minute break. ☕",
  "A little reminder: consistency beats perfection. You're doing lovely. ✨",
  "You earned a moment to be proud of yourself. Look how far you've come! 🖤",
  "Bonus magic: stretch, smile, and enjoy this little victory. 🌙",
];
const navItems: { id: Tab; icon: string }[] = [
  { id: "Dashboard", icon: "⌂" }, { id: "My quests", icon: "✓" },
  { id: "Progress", icon: "↗" }, { id: "Reminder", icon: "◷" }, { id: "Settings", icon: "⚙" },
];
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("PERSONAL GROWTH");
  const [newXp, setNewXp] = useState(20);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<FocusArea[]>(["WELLNESS", "STUDY", "PERSONAL GROWTH"]);
  const [onboardingMessage, setOnboardingMessage] = useState("");
  const [today, setToday] = useState("");
  const [currentHour, setCurrentHour] = useState(12);
  const [weekly, setWeekly] = useState<{ label: string; count: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderStatus, setReminderStatus] = useState("");
  const [celebration, setCelebration] = useState("");
  const [personalReminders, setPersonalReminders] = useState<PersonalReminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAt, setReminderAt] = useState("20:00");
  const [reminderDate, setReminderDate] = useState("");
  const [repeatDaily, setRepeatDaily] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<PersonalReminder | null>(null);
  const [alarmDismissed, setAlarmDismissed] = useState<string[]>([]);

  useEffect(() => {
    const refreshClock = () => { const now = new Date(); setToday(todayKey()); setCurrentHour(now.getHours()); setReminderDate((current) => current || todayKey()); };
    refreshClock();
    const clock = window.setInterval(refreshClock, 60_000);
    try {
      const savedReminders = localStorage.getItem("daily-bloom-personal-reminders");
      if (savedReminders) setPersonalReminders(JSON.parse(savedReminders) as PersonalReminder[]);
    } catch { /* Ignore invalid local reminder data and continue safely. */ }
    const savedEnabled = localStorage.getItem("daily-bloom-reminders") === "true";
    const savedTime = localStorage.getItem("daily-bloom-reminder-time");
    setRemindersEnabled(savedEnabled);
    if (savedTime) setReminderTime(savedTime);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    return () => { window.clearInterval(clock); listener.subscription.unsubscribe(); };
  }, []);

  const loadData = useCallback(async (userId: string) => {
    setLoading(true); setError("");
    const [profileResult, taskResult, completionResult] = await Promise.all([
      supabase.from("user_profiles").select("user_id,focus_areas,onboarding_complete,reminder_time,reminders_enabled").eq("user_id", userId).maybeSingle(),
      supabase.from("tasks").select("id,title,category,xp,is_completed,user_id,created_at").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("quest_completions").select("id,task_id,completed_on,xp").eq("user_id", userId).order("completed_on", { ascending: true }),
    ]);
    if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return; }
    if (taskResult.error) { setError(taskResult.error.message); setLoading(false); return; }
    if (completionResult.error) { setError(completionResult.error.message); setLoading(false); return; }
    const savedProfile = profileResult.data as Profile | null;
    setProfile(savedProfile);
    setOnboardingComplete(Boolean(savedProfile?.onboarding_complete));
    if (savedProfile?.focus_areas?.length) setSelectedFocus(savedProfile.focus_areas as FocusArea[]);
    if (savedProfile?.reminder_time) setReminderTime(savedProfile.reminder_time);
    if (typeof savedProfile?.reminders_enabled === "boolean") setRemindersEnabled(savedProfile.reminders_enabled);
    const rows = taskResult.data ?? [];
    const completionRows = (completionResult.data ?? []) as Completion[];
    setCompletions(completionRows);
    const completedTodayIds = new Set(completionRows.filter((c) => c.completed_on === (today || todayKey())).map((c) => c.task_id));
    setTasks(rows.map((t) => ({ id: t.id, title: t.title, category: t.category, xp: Number(t.xp), done: completedTodayIds.has(t.id) })));
    setLoading(false);
  }, [today]);

  useEffect(() => {
    if (session?.user.id && today) void loadData(session.user.id);
    else if (!session) { setTasks([]); setCompletions([]); setProfile(null); setOnboardingComplete(false); setLoading(false); }
  }, [session?.user.id, today, loadData]);

  const todayCompletions = useMemo(() => completions.filter((c) => c.completed_on === today), [completions, today]);
  const completedToday = new Set(todayCompletions.map((c) => c.task_id).filter((id): id is string => Boolean(id))).size;
  const remainingToday = Math.max(0, tasks.length - completedToday);
  const earnedXP = completions.reduce((sum, c) => sum + Number(c.xp || 0), 0);
  const level = Math.floor(earnedXP / 500) + 1;
  const xpInLevel = earnedXP % 500;
  const completedDates = useMemo(() => new Set(completions.map((c) => c.completed_on)), [completions]);
  const mood = completedToday >= 4 ? "excited" : completedToday >= 2 ? "happy" : completedToday === 0 && currentHour >= 22 ? "sleepy" : "idle";
  const catLine = tasks.length > 0 && remainingToday === 0 ? "Every quest is done. I'm so proud of you!" : completedToday >= 4 ? "Look at you shine!" : completedToday >= 2 ? "I'm so proud of you!" : completedToday >= 1 ? "Little steps, lovely." : "Let's make today gentle.";

  useEffect(() => {
    if (!today) return;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!completedDates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (completedDates.has(dateKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
    setStreak(count);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      const key = dateKey(d);
      return { label: d.toLocaleDateString("en", { weekday: "short" }), count: completions.filter((c) => c.completed_on === key).length };
    });
    setWeekly(days);
  }, [completedDates, completions, today]);

  useEffect(() => {
    if (!remindersEnabled || !today) return;
    const checkReminder = () => {
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const sentKey = `daily-bloom-reminder-sent-${session?.user.id ?? "guest"}-${today}`;
      if (current === reminderTime && localStorage.getItem(sentKey) !== "true") {
        localStorage.setItem(sentKey, "true");
        const body = remainingToday > 0 ? `You have ${remainingToday} little quest${remainingToday === 1 ? "" : "s"} waiting. You can do this. 🌷` : "Your quests are complete for today. Be proud of yourself! 🌷";
        if ("Notification" in window && Notification.permission === "granted") new Notification("A little Daily Bloom reminder", { body });
        setReminderStatus("Your reminder has been sent in this browser.");
      }
    };
    checkReminder();
    const timer = window.setInterval(checkReminder, 15_000);
    return () => window.clearInterval(timer);
  }, [remindersEnabled, reminderTime, today, remainingToday, session?.user.id]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const date = todayKey();
      const due = personalReminders.find((r) => r.enabled && r.time === clock && (r.repeatDaily || r.date === date) && !alarmDismissed.includes(`${r.id}-${date}`));
      if (due && !activeAlarm) {
        setActiveAlarm(due);
        try {
          const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            [0, 0.35, 0.7, 1.05, 1.4].forEach((delay, index) => {
              const oscillator = ctx.createOscillator();
              const gain = ctx.createGain();
              oscillator.type = "sine";
              oscillator.frequency.value = index % 2 ? 880 : 660;
              gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
              gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + delay + 0.03);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.25);
              oscillator.connect(gain); gain.connect(ctx.destination);
              oscillator.start(ctx.currentTime + delay); oscillator.stop(ctx.currentTime + delay + 0.27);
            });
            window.setTimeout(() => void ctx.close(), 2200);
          }
        } catch { /* Sound may be blocked until the user interacts with the page. */ }
        if ("Notification" in window && Notification.permission === "granted") new Notification(`Daily Bloom alarm: ${due.title}`, { body: `It's time — ${due.title}` });
      }
    };
    checkAlarms();
    const timer = window.setInterval(checkAlarms, 10_000);
    return () => window.clearInterval(timer);
  }, [personalReminders, alarmDismissed, activeAlarm]);

  function persistPersonalReminders(next: PersonalReminder[]) {
    setPersonalReminders(next);
    localStorage.setItem("daily-bloom-personal-reminders", JSON.stringify(next));
  }
  function addPersonalReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = reminderTitle.trim();
    if (!title) return;
    const next = [...personalReminders, { id: crypto.randomUUID(), title, time: reminderAt, date: reminderDate || todayKey(), repeatDaily, enabled: true }];
    persistPersonalReminders(next);
    setReminderTitle("");
    setReminderStatus(`Alarm set for ${title} at ${reminderAt}. Keep this app open for the alarm to ring.`);
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  }
  function dismissAlarm() {
    if (activeAlarm) setAlarmDismissed((old) => [...old, `${activeAlarm.id}-${todayKey()}`]);
    setActiveAlarm(null);
  }
  function deletePersonalReminder(id: string) { persistPersonalReminders(personalReminders.filter((r) => r.id !== id)); }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthMessage(""); setSaving(true);
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) setAuthMessage(result.error.message);
    else if (authMode === "signup" && !result.data.session) setAuthMessage("Check your email to confirm your account, then sign in.");
    setSaving(false);
  }
  async function signOut() { await supabase.auth.signOut(); setActiveTab("Dashboard"); }

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.id || selectedFocus.length === 0 || saving) return;
    setSaving(true); setError(""); setOnboardingMessage("");
    const userId = session.user.id;
    const { data: existingTasks, error: taskReadError } = await supabase.from("tasks").select("id,title").eq("user_id", userId);
    if (taskReadError) { setError(taskReadError.message); setSaving(false); return; }
    // Replace only the old generic starter quests. Keep any quests the user created themselves.
    const oldStarterTitles = ["Move your body", "Read 10 pages", "Focus session", "Drink enough water", "Plan tomorrow"];
    const oldStarterIds = (existingTasks ?? []).filter((task) => oldStarterTitles.includes(task.title)).map((task) => task.id);
    if (oldStarterIds.length) {
      const { error: removeStarterError } = await supabase.from("tasks").delete().in("id", oldStarterIds).eq("user_id", userId);
      if (removeStarterError) { setError(removeStarterError.message); setSaving(false); return; }
    }
    const chosenTasks = selectedFocus.flatMap((area) => taskBank[area].slice(0, 2).map((task) => ({ ...task, category: area, is_completed: false, user_id: userId })));
    const { error: seedError } = await supabase.from("tasks").insert(chosenTasks);
    if (seedError) { setError(seedError.message); setSaving(false); return; }
    const { data: saved, error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: userId, focus_areas: selectedFocus, onboarding_complete: true,
      reminder_time: reminderTime, reminders_enabled: remindersEnabled,
    }, { onConflict: "user_id" }).select("user_id,focus_areas,onboarding_complete,reminder_time,reminders_enabled").single();
    if (profileError) { setError(profileError.message); setSaving(false); return; }
    setProfile(saved as Profile); setOnboardingComplete(true); setOnboardingMessage("Your personal daily quests are ready. Let's bloom! 🌷");
    await loadData(userId);
    setSaving(false);
  }

  async function toggleTask(id: string) {
    if (!session?.user.id || !today) return;
    setError(""); setCelebration("");
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const beforeCount = completedToday;
    if (task.done) {
      const { data, error: deleteError } = await supabase.from("quest_completions").delete().eq("task_id", id).eq("user_id", session.user.id).eq("completed_on", today).select("id");
      if (deleteError) { setError(deleteError.message); return; }
      if (data?.length) {
        setCompletions((current) => current.filter((c) => !(c.task_id === id && c.completed_on === today)));
        setTasks((current) => current.map((t) => t.id === id ? { ...t, done: false } : t));
      }
      return;
    }
    const { data, error: completionError } = await supabase.from("quest_completions").insert({
      user_id: session.user.id, task_id: id, completed_on: today, xp: task.xp,
    }).select("id,task_id,completed_on,xp").single();
    if (completionError) { setError(completionError.message); return; }
    setCompletions((current) => [...current, data as Completion]);
    setTasks((current) => current.map((t) => t.id === id ? { ...t, done: true } : t));
    const newCount = beforeCount + 1;
    const milestone = Math.floor(newCount / 3);
    let rewardText = "";
    if (milestone > Math.floor(beforeCount / 3)) {
      const rewardKey = `daily-bloom-reward-${session.user.id}-${today}-${milestone}`;
      if (localStorage.getItem(rewardKey) !== "true") {
        localStorage.setItem(rewardKey, "true");
        rewardText = rewardMessages[Math.floor(Math.random() * rewardMessages.length)];
      }
    }
    if (newCount >= tasks.length && tasks.length > 0) {
      setCelebration(rewardText ? `${rewardText} All today's quests are complete! 🌷` : "All today's quests are complete! Rest easy, lovely. 🌷");
    } else setCelebration(rewardText || `Quest complete! +${task.xp} XP ✨`);
  }

  async function addTask(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); const title = newTitle.trim();
    if (!title || saving || !session?.user.id) return;
    setSaving(true); setError("");
    const { data, error: insertError } = await supabase.from("tasks").insert({ title, category: newCategory, xp: newXp, is_completed: false, user_id: session.user.id }).select().single();
    if (insertError) setError(insertError.message);
    else if (data) { setTasks((current) => [...current, { id: data.id, title: data.title, category: data.category, xp: Number(data.xp), done: false }]); setNewTitle(""); setShowAdd(false); }
    setSaving(false);
  }
  async function deleteTask(task: Task) {
    if (!session?.user.id || !window.confirm(`Delete "${task.title}"? Its completion history will remain in your progress.`)) return;
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", session.user.id);
    if (deleteError) setError(deleteError.message);
    else { setTasks((current) => current.filter((t) => t.id !== task.id)); }
  }
  async function setupReminder() {
    if (!("Notification" in window)) { setReminderStatus("This browser doesn't support notifications. Try a supported desktop browser."); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setReminderStatus("Notifications are blocked. Allow them in your browser's site settings."); setRemindersEnabled(false); return; }
    setRemindersEnabled(true); localStorage.setItem("daily-bloom-reminders", "true"); localStorage.setItem("daily-bloom-reminder-time", reminderTime);
    if (session?.user.id) {
      const { data } = await supabase.from("user_profiles").upsert({ user_id: session.user.id, focus_areas: profile?.focus_areas ?? selectedFocus, onboarding_complete: true, reminder_time: reminderTime, reminders_enabled: true }, { onConflict: "user_id" }).select("user_id,focus_areas,onboarding_complete,reminder_time,reminders_enabled").single();
      if (data) setProfile(data as Profile);
    }
    setReminderStatus("Reminder enabled. Keep Daily Bloom open in this browser around your chosen time.");
  }
  async function turnRemindersOff() {
    setRemindersEnabled(false); localStorage.setItem("daily-bloom-reminders", "false");
    if (session?.user.id) await supabase.from("user_profiles").upsert({ user_id: session.user.id, focus_areas: profile?.focus_areas ?? selectedFocus, onboarding_complete: true, reminder_time: reminderTime, reminders_enabled: false }, { onConflict: "user_id" });
    setReminderStatus("Reminder disabled.");
  }
  function saveReminderTime(value: string) {
    setReminderTime(value); localStorage.setItem("daily-bloom-reminder-time", value);
  }

  if (authLoading) return <main className="app-shell"><div className="app-frame"><p className="secondary-copy">Opening your little corner...</p></div></main>;
  if (!session) return (
    <main className="app-shell"><div className="app-frame auth-frame"><header className="topbar"><a className="wordmark" href="#"><span className="wordmark-mark">✦</span><span>Daily Bloom<span className="wordmark-dot">.</span></span></a></header>
      <section className="auth-card"><img className="auth-cat" src="/cat/idle.svg" alt="Daily Bloom black cat mascot"/><p className="eyebrow">YOUR LITTLE CORNER OF THE WORLD</p><h1>{authMode === "signin" ? <>Welcome <em>back.</em></> : <>Begin your <em>bloom.</em></>}</h1><p className="secondary-copy">A softer way to build habits, one small quest at a time.</p>
        <form className="auth-form" onSubmit={(e) => void signIn(e)}><label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters"/></label><button className="primary-button" disabled={saving}>{saving ? "One moment..." : authMode === "signin" ? "Sign in" : "Create account"}</button></form>
        {authMessage && <p className="status-message" role="status">{authMessage}</p>}<button className="text-button auth-switch" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>{authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      </section>
    </div></main>
  );

  if (!onboardingComplete) return (
    <main className="app-shell"><div className="app-frame auth-frame"><header className="topbar"><a className="wordmark" href="#"><span className="wordmark-mark">✦</span><span>Daily Bloom<span className="wordmark-dot">.</span></span></a></header>
      <section className="auth-card onboarding-card"><img className="auth-cat" src="/cat/happy.svg" alt="Your black cat companion"/><p className="eyebrow">LET'S MAKE THIS YOURS</p><h1>Your days, <em>your way.</em></h1><p className="secondary-copy">Choose the areas you want to focus on. We'll build your first set of daily quests around what matters to you.</p>
        <form onSubmit={(e) => void finishOnboarding(e)}><div className="focus-grid">{focusOptions.map((option) => <button key={option.id} type="button" className={`focus-option ${selectedFocus.includes(option.id) ? "selected" : ""}`} onClick={() => setSelectedFocus((current) => current.includes(option.id) ? current.filter((x) => x !== option.id) : [...current, option.id])} aria-pressed={selectedFocus.includes(option.id)}><span className="focus-icon">{option.icon}</span><strong>{option.title}</strong><small>{option.detail}</small><span className="focus-check">{selectedFocus.includes(option.id) ? "✓" : "+"}</span></button>)}</div>
          <p className="onboarding-hint">Choose at least one focus area. We'll create two small quests per area, and your checklist will reset each day.</p><button className="primary-button onboarding-submit" type="submit" disabled={saving || selectedFocus.length === 0}>{saving ? "Creating your quests..." : "Create my daily quests ✧"}</button></form>
        {onboardingMessage && <p className="status-message">{onboardingMessage}</p>}{error && <p role="alert" className="error-message">{error}</p>}
      </section>
    </div></main>
  );

  return (
    <main className="app-shell"><div className="app-frame">
      <header className="topbar"><a className="wordmark" href="#" onClick={(e) => { e.preventDefault(); setActiveTab("Dashboard"); }}><span className="wordmark-mark">✦</span><span>Daily Bloom<span className="wordmark-dot">.</span></span></a><div className="topbar-actions"><span className="user-email">{session.user.email}</span></div></header>
      {activeTab === "Dashboard" && <>
        <section className="welcome"><div><p className="eyebrow">YOUR LITTLE CORNER OF THE WORLD</p><h1>Hello, <em>lovely.</em></h1><p className="welcome-copy">One gentle step at a time. You don't have to do everything—just start with one little quest.</p></div><div className="cat-companion"><img src={`/cat/${mood}.svg`} alt={`Cat mascot feeling ${mood}`}/><div className="cat-note"><span className="cat-note-title">A NOTE FROM YOUR CAT</span><p>{catLine}</p></div></div></section>
        <section className="level-card"><div className="level-top"><div className="level-medallion">✧</div><div className="level-info"><div className="level-label-row"><span className="eyebrow">YOUR CURRENT JOURNEY</span><span className="rank-pill">✦ BLOOMING SOUL</span></div><h2>Level {level}</h2><p>Growing at your own pace.</p><div className="progress-track"><div className="progress-fill" style={{ width: `${(xpInLevel / 500) * 100}%` }}/></div></div></div><div className="level-footer"><span>{xpInLevel} / 500 XP</span><span>{500 - xpInLevel} XP to next level</span></div></section>
        <section className="daily-summary"><div className="daily-summary-item"><span className="summary-number">{completedToday}</span><span>Completed today</span></div><div className="summary-divider"/><div className="daily-summary-item"><span className="summary-number">{remainingToday}</span><span>Left to do</span></div><div className="summary-divider"/><div className="daily-summary-item"><span className="summary-number">{tasks.length}</span><span>Today's quests</span></div></section>
        <section className="section-block"><div className="section-heading"><div><p className="eyebrow">A LITTLE PROGRESS GOES A LONG WAY</p><h2>Today's quests <span className="heading-spark">✧</span></h2></div><button className="text-button" onClick={() => setActiveTab("My quests")}>View all ↗</button></div>
          <div className="task-card">{loading ? <p className="secondary-copy padded-copy">Loading your quests...</p> : tasks.length === 0 ? <p className="secondary-copy padded-copy">No quests yet. Add a little goal to begin.</p> : tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}/>)}
            {showAdd && <AddForm title={newTitle} setTitle={setNewTitle} category={newCategory} setCategory={setNewCategory} xp={newXp} setXp={setNewXp} saving={saving} onSubmit={addTask} onCancel={() => setShowAdd(false)}/>}<button className="add-task-button" onClick={() => setShowAdd((v) => !v)}><span>＋</span> Add a little quest</button>
          </div></section>
        <section className="reminder-card"><div className="reminder-icon">♡</div><div className="reminder-copy"><p className="eyebrow">A GENTLE REMINDER</p><strong>{remainingToday === 0 && tasks.length > 0 ? "You showed up for yourself today." : `${remainingToday} little quest${remainingToday === 1 ? " is" : "s are"} waiting for you.`}</strong><span>{remainingToday === 0 && tasks.length > 0 ? "Rest and enjoy your progress." : "You can do this at your own pace."}</span></div><span className="reminder-arrow">✧</span></section>
      </>}
      {activeTab === "My quests" && <section className="secondary-screen"><p className="eyebrow">YOUR PERSONAL DAILY LIST</p><h1>My <em>quests.</em></h1><p className="secondary-copy">Today's checklist resets tomorrow. Your progress stays saved.</p><div className="daily-summary compact-summary"><div className="daily-summary-item"><span className="summary-number">{completedToday}</span><span>Done</span></div><div className="summary-divider"/><div className="daily-summary-item"><span className="summary-number">{remainingToday}</span><span>Remaining</span></div></div><div className="task-card secondary-task-list">{loading ? <p className="secondary-copy">Loading quests...</p> : tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}/>)}{showAdd && <AddForm title={newTitle} setTitle={setNewTitle} category={newCategory} setCategory={setNewCategory} xp={newXp} setXp={setNewXp} saving={saving} onSubmit={addTask} onCancel={() => setShowAdd(false)}/>}<button className="add-task-button" onClick={() => setShowAdd((v) => !v)}><span>＋</span> Add a little quest</button></div></section>}
      {activeTab === "Progress" && <section className="secondary-screen"><p className="eyebrow">LOOK HOW FAR YOU'VE COME</p><h1>Your <em>progress.</em></h1><p className="secondary-copy">Growth isn't always loud. Sometimes it's keeping a promise to yourself.</p><div className="feature-card"><div className="feature-symbol">✧</div><h2>Level {level} · Blooming soul</h2><p>You've earned {earnedXP} XP across {completions.length} quest completions.</p><div className="progress-track"><div className="progress-fill" style={{ width: `${(xpInLevel / 500) * 100}%` }}/></div><div className="badge-row"><span>{earnedXP} total XP</span><span>{completedToday} quests done today</span><span>{streak}-day streak</span></div><h3 className="chart-title">Your last 7 days</h3><div className="mini-bars">{weekly.map((day) => <div className="mini-bar-column" key={day.label}><span style={{ height: `${Math.max(8, Math.min(100, day.count * 18))}%` }} title={`${day.count} completions`}/><small>{day.label}</small></div>)}</div></div><div className="cat-companion"><img src={`/cat/${mood}.svg`} alt="Your cat companion"/><div className="cat-note"><span className="cat-note-title">YOUR CAT SAYS</span><p>Be proud of the small things, too.</p></div></div></section>}
      {activeTab === "Reminder" && <section className="secondary-screen"><p className="eyebrow">YOUR PERSONAL ALARMS</p><h1>Set a <em>reminder.</em></h1><p className="secondary-copy">Medicine, water, meetings, or anything you don't want to forget.</p>
        <div className="feature-card settings-list"><div className="feature-symbol">◷</div><h2>Create an alarm</h2><form className="add-form reminder-form" onSubmit={addPersonalReminder}><label>What should we remind you?<input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="e.g. Take medicine, drink water, meeting" maxLength={100} required /></label><label>Time<input type="time" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} required /></label><label>Date<input type="date" value={reminderDate} min={today || undefined} onChange={(e) => setReminderDate(e.target.value)} disabled={repeatDaily} required={!repeatDaily} /></label><label className="reminder-repeat"><input type="checkbox" checked={repeatDaily} onChange={(e) => setRepeatDaily(e.target.checked)} /> Repeat every day</label><button className="primary-button" type="submit">＋ Save alarm</button></form><p className="status-message">Alarm-style sound and an on-screen alert work while this app is open. Keep this tab open and your device awake for best reliability.</p></div>
        <div className="feature-card settings-list"><h2>Your alarms ({personalReminders.length})</h2>{personalReminders.length === 0 ? <p className="secondary-copy">No alarms yet. Add your first reminder above.</p> : personalReminders.slice().sort((a,b) => a.time.localeCompare(b.time)).map((r) => <div className="personal-reminder-row" key={r.id}><div className="personal-reminder-time">{r.time}</div><div className="personal-reminder-info"><strong>{r.title}</strong><small>{r.repeatDaily ? "Every day" : r.date}</small></div><button className="cancel-button" type="button" onClick={() => persistPersonalReminders(personalReminders.map((item) => item.id === r.id ? {...item, enabled: !item.enabled} : item))}>{r.enabled ? "On" : "Off"}</button><button className="delete-task" type="button" onClick={() => deletePersonalReminder(r.id)} aria-label={`Delete reminder ${r.title}`}>×</button></div>)}</div>
      </section>}
      {activeTab === "Settings" && <section className="secondary-screen"><p className="eyebrow">MAKE THIS SPACE YOURS</p><h1>Your <em>settings.</em></h1><p className="secondary-copy">A few details about your little corner.</p>
        <div className="feature-card settings-list"><div className="feature-symbol">♡</div><h2>Daily reminders</h2><p>Choose when Daily Bloom should nudge you. Allow browser notifications to enable reminders.</p><label className="setting-control">Reminder time<input type="time" value={reminderTime} onChange={(e) => saveReminderTime(e.target.value)}/></label><button className="primary-button" onClick={() => void setupReminder()}>{remindersEnabled ? "Update reminder" : "Enable browser reminder"}</button><button className="cancel-button full-button" onClick={() => void turnRemindersOff()}>Turn reminders off</button>{reminderStatus && <p className="status-message" role="status">{reminderStatus}</p>}<small>For now, reminders fire while Daily Bloom is open in this browser. Reliable notifications when the app is closed need a push-notification service.</small></div>
        <div className="feature-card settings-list"><div className="feature-symbol">⚙</div><h2>Your Daily Bloom</h2><p><span>Theme</span><strong>Burgundy & ivory</strong></p><p><span>Focus areas</span><strong>{(profile?.focus_areas ?? selectedFocus).join(", ")}</strong></p><p><span>Account</span><strong>{session.user.email}</strong></p><button className="cancel-button full-button" onClick={() => void signOut()}>Sign out</button></div>
      </section>}
      {activeAlarm && <div className="alarm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title"><div className="alarm-dialog"><div className="alarm-bell">◷</div><p className="eyebrow">DAILY BLOOM ALARM</p><h2 id="alarm-title">{activeAlarm.title}</h2><p>It's time for your reminder.</p><button className="primary-button" onClick={dismissAlarm}>Dismiss alarm</button></div></div>}
      {celebration && <div className="toast-message" role="status">{celebration}</div>}{error && <p role="alert" className="error-message">Could not complete that action: {error}</p>}
      <p className="gentle-footer">Made with a little love <span>♡</span> and room to grow.</p><nav className="bottom-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.id}</span></button>)}</nav>
    </div></main>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string) => void; onDelete: (task: Task) => void }) {
  return <div className={`task-row-wrap ${task.done ? "is-done" : ""}`}><button className={`task-row ${task.done ? "is-done" : ""}`} onClick={() => void onToggle(task.id)} aria-pressed={task.done}><span className={`check-circle ${task.done ? "checked" : ""}`}>{task.done ? "✓" : ""}</span><span className="task-copy"><strong>{task.title}</strong><small>{task.category}</small></span><span className="xp-chip">+{task.xp} XP</span></button><button className="delete-task" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} title="Delete quest">×</button></div>;
}
function AddForm({ title, setTitle, category, setCategory, xp, setXp, saving, onSubmit, onCancel }: { title: string; setTitle: (s: string) => void; category: string; setCategory: (s: string) => void; xp: number; setXp: (n: number) => void; saving: boolean; onSubmit: (event?: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="add-form" onSubmit={(e) => void onSubmit(e)}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What little thing will you do?" maxLength={120} autoFocus required/><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Quest category">{["PERSONAL GROWTH", "WELLNESS", "STUDY", "PERSONAL", "WORK", "HOME", "CONFIDENCE"].map((categoryName) => <option key={categoryName}>{categoryName}</option>)}</select><label className="xp-select-label">XP reward<select value={xp} onChange={(e) => setXp(Number(e.target.value))}><option value={10}>10 XP</option><option value={15}>15 XP</option><option value={20}>20 XP</option><option value={25}>25 XP</option><option value={30}>30 XP</option></select></label><button className="primary-button" type="submit" disabled={saving || !title.trim()}>{saving ? "Saving..." : "Save quest"}</button><button className="cancel-button" type="button" onClick={onCancel}>Cancel</button></form>;
}

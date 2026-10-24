// plan.js: the day's plan on the front page, split into morning, day and evening.
//
// A task is an item (see db.js) like this:
//   { id: "task-...", kind: "task", part: "morning", text: "Take meds", note: "with food",
//     day: "2026-10-24" }   a one-off task, only on that day
//     day: "", since: "2026-10-24" }   an every-day task, shown from that day on
//
// Ticking a task off saves a separate "tick" item for that day:
//   { id: "tick-<task id>-2026-10-24", kind: "tick", day: "2026-10-24", taskId: "task-...", done: true }
// An every-day task is a habit. A habit can also be skipped for a day (skip: true),
// which the Insight page shows as a tiny grey dot and which doesn't break a streak.
// The tick's id is made from the task and the day, so the same tick made on two
// phones is still one tick after syncing.
//
// Bud days have their own, separate list. Its tasks carry list: "bud" (normal
// tasks have no list). Whether a day is a bud day is saved as its own item:
//   { id: "budday-2026-10-24", kind: "budday", day: "2026-10-24", on: true }

const PARTS = [
  { key: 'morning', name: 'Morning' },
  { key: 'day', name: 'Day' },
  { key: 'evening', name: 'Evening' },
];

// The tasks for one day from one list ("" or "bud"), each with done: true or false,
// in the order they were added.
async function getPlan(day, list = '') {
  const items = await getAllItems();
  const ticks = new Map();
  for (const item of items) {
    if (item.kind === 'tick' && item.day === day && !item.deleted) ticks.set(item.taskId, item);
  }
  return items
    .filter((item) => item.kind === 'task' && !item.deleted && (item.list || '') === list)
    .filter((task) => task.day === day || (task.day === '' && task.since <= day))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((task) => {
      const tick = ticks.get(task.id);
      return { ...task, done: Boolean(tick && tick.done), skipped: Boolean(tick && tick.skip && !tick.done) };
    });
}

function addTask({ part, text, note, everyDay }, day, list = '') {
  return putItem({
    id: newId('task'),
    kind: 'task',
    list,
    part,
    text,
    note,
    day: everyDay ? '' : day,
    since: day,
    createdAt: Date.now(),
  });
}

// Changes a task's words or part of the day. Switching between one-off and
// every day keeps its ticks.
function updateTask(task, { part, text, note, everyDay }, day) {
  return putItem({
    id: task.id,
    kind: 'task',
    list: task.list || '',
    part,
    text,
    note,
    day: everyDay ? '' : day,
    since: task.since || day,
    createdAt: task.createdAt,
  });
}

// state is "done", "skip" or "" (not done).
function setTicked(task, day, state) {
  return putItem({ id: `tick-${task.id}-${day}`, kind: 'tick', day, taskId: task.id, done: state === 'done', skip: state === 'skip' });
}

async function isBudDay(day) {
  const items = await getItemsForDay(day);
  return items.some((item) => item.kind === 'budday' && item.on && !item.deleted);
}

function setBudDay(day, on) {
  return putItem({ id: `budday-${day}`, kind: 'budday', day, on });
}

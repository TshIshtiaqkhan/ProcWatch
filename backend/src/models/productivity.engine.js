const { getPool, getSetting } = require("../db");
const { formatDateString } = require("../utils/paths");
const { logger } = require("../utils/logger");

const PRODUCTIVE_CATEGORIES = new Set(["Development", "Productivity", "Creative"]);
const DISTRACTING_CATEGORIES = new Set(["Entertainment"]);

/**
 * Computes 0-100% productivity score.
 * Formula:
 * - If no activity: 0%
 * - If only neutral: 50%
 * - Ratio of productive / (productive + distracting) clamped to [0, 100]
 */
function computeScore(productiveSeconds, distractingSeconds, neutralSeconds) {
  const p = Math.max(0, productiveSeconds || 0);
  const d = Math.max(0, distractingSeconds || 0);
  const n = Math.max(0, neutralSeconds || 0);
  const total = p + d + n;

  if (p + d === 0) {
    return total > 0 ? 50 : 0;
  }

  const score = Math.round((p / (p + d)) * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Helper to calculate calendar day difference (date1 - date2 in days).
 */
function getDaysDiff(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + "T00:00:00Z");
  const d2 = new Date(dateStr2 + "T00:00:00Z");
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates current streak and best streak from daily stats.
 * Expects `days` to be sorted descending by date (today first).
 */
function calculateStreakFromDays(days, goal, minSeconds = 600) {
  if (!Array.isArray(days) || days.length === 0) {
    return { currentStreak: 0, bestStreak: 0, goalMetToday: false };
  }

  // Qualifies if user had at least minSeconds of active time and met the target goal
  const qualifies = (d) => (d.totalSeconds || 0) >= minSeconds && (d.score || 0) >= goal;

  const today = days[0];
  const goalMetToday = qualifies(today);

  // Compute all contiguous streaks across history
  let bestStreak = 0;
  let tempStreak = 0;
  let lastQualifyingDate = null;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (qualifies(day)) {
      if (!lastQualifyingDate) {
        tempStreak = 1;
      } else {
        const diff = getDaysDiff(lastQualifyingDate, day.date);
        if (diff === 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      }
      lastQualifyingDate = day.date;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
      lastQualifyingDate = null;
    }
  }

  // Current streak calculation:
  // Check backwards from today or yesterday
  let currentStreak = 0;
  let expectedDiff = 0;

  if (goalMetToday) {
    currentStreak = 1;
    let prevDate = today.date;

    for (let i = 1; i < days.length; i++) {
      const day = days[i];
      const diff = getDaysDiff(prevDate, day.date);
      if (diff === 1 && qualifies(day)) {
        currentStreak += 1;
        prevDate = day.date;
      } else {
        break;
      }
    }
  } else {
    // Today hasn't qualified yet.
    // If yesterday qualified, the streak is alive from yesterday!
    if (days.length > 1) {
      const yesterday = days[1];
      const diffFromToday = getDaysDiff(today.date, yesterday.date);

      if (diffFromToday === 1 && qualifies(yesterday)) {
        currentStreak = 1;
        let prevDate = yesterday.date;

        for (let i = 2; i < days.length; i++) {
          const day = days[i];
          const diff = getDaysDiff(prevDate, day.date);
          if (diff === 1 && qualifies(day)) {
            currentStreak += 1;
            prevDate = day.date;
          } else {
            break;
          }
        }
      }
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return { currentStreak, bestStreak, goalMetToday };
}

/**
 * Fetches breakdown and score for a specific date string (YYYY-MM-DD).
 */
async function getProductivityForDate(dateStr) {
  const pool = getPool();
  const rows = await pool.query(
    `SELECT s.duration_seconds,
            COALESCE(c.category, 'Uncategorized') as category,
            COALESCE(c.is_distracting, 0) as is_distracting
     FROM sessions s
     LEFT JOIN app_categories c ON LOWER(c.app_name) = LOWER(s.app_name)
     WHERE s.date_local = $1 AND s.is_idle = 0`,
    [dateStr]
  );

  let productiveSeconds = 0;
  let distractingSeconds = 0;
  let neutralSeconds = 0;

  for (const row of rows.rows) {
    const dur = row.duration_seconds || 0;
    if (row.is_distracting === 1 || DISTRACTING_CATEGORIES.has(row.category)) {
      distractingSeconds += dur;
    } else if (PRODUCTIVE_CATEGORIES.has(row.category)) {
      productiveSeconds += dur;
    } else {
      neutralSeconds += dur;
    }
  }

  const totalSeconds = productiveSeconds + distractingSeconds + neutralSeconds;
  const score = computeScore(productiveSeconds, distractingSeconds, neutralSeconds);

  return {
    date: dateStr,
    score,
    productiveSeconds,
    distractingSeconds,
    neutralSeconds,
    totalSeconds,
  };
}

/**
 * Fetches comprehensive productivity summary including today, yesterday, and streaks.
 */
async function getProductivitySummary() {
  const now = new Date();
  const today = formatDateString(now);

  const yesterdayObj = new Date(now);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = formatDateString(yesterdayObj);

  const goal = parseInt(getSetting("productivity_score_goal"), 10) || 70;
  const minMinutes = parseInt(getSetting("productivity_min_minutes"), 10) || 10;
  const minSeconds = minMinutes * 60;

  const pool = getPool();

  // Query daily aggregates for trailing 60 days
  const historyRows = await pool.query(
    `SELECT s.date_local as date,
            SUM(CASE WHEN c.is_distracting = 1 OR c.category = 'Entertainment' THEN s.duration_seconds ELSE 0 END) as distracting_seconds,
            SUM(CASE WHEN (c.is_distracting = 0 OR c.is_distracting IS NULL) AND c.category IN ('Development', 'Productivity', 'Creative') THEN s.duration_seconds ELSE 0 END) as productive_seconds,
            SUM(s.duration_seconds) as total_seconds
     FROM sessions s
     LEFT JOIN app_categories c ON LOWER(c.app_name) = LOWER(s.app_name)
     WHERE s.is_idle = 0 AND s.date_local >= date($1, '-60 days')
     GROUP BY s.date_local
     ORDER BY s.date_local DESC`,
    [today]
  );

  const daysMap = new Map();
  for (const r of historyRows.rows) {
    const p = r.productive_seconds || 0;
    const d = r.distracting_seconds || 0;
    const total = r.total_seconds || 0;
    const n = Math.max(0, total - (p + d));
    const score = computeScore(p, d, n);
    daysMap.set(r.date, {
      date: r.date,
      score,
      productiveSeconds: p,
      distractingSeconds: d,
      neutralSeconds: n,
      totalSeconds: total,
    });
  }

  // Ensure today and yesterday entries exist even if 0 seconds tracked
  const todayData = daysMap.get(today) || {
    date: today,
    score: 0,
    productiveSeconds: 0,
    distractingSeconds: 0,
    neutralSeconds: 0,
    totalSeconds: 0,
  };

  const yesterdayData = daysMap.get(yesterday) || {
    date: yesterday,
    score: 0,
    productiveSeconds: 0,
    distractingSeconds: 0,
    neutralSeconds: 0,
    totalSeconds: 0,
  };

  // Build sorted days list for streak calculation
  const sortedDays = [todayData];
  const iterDate = new Date(yesterdayObj);
  for (let i = 0; i < 60; i++) {
    const dStr = formatDateString(iterDate);
    sortedDays.push(
      daysMap.get(dStr) || {
        date: dStr,
        score: 0,
        productiveSeconds: 0,
        distractingSeconds: 0,
        neutralSeconds: 0,
        totalSeconds: 0,
      }
    );
    iterDate.setDate(iterDate.getDate() - 1);
  }

  const { currentStreak, bestStreak, goalMetToday } = calculateStreakFromDays(
    sortedDays,
    goal,
    minSeconds
  );

  const scoreDiff = todayData.score - yesterdayData.score;

  return {
    today: todayData,
    yesterday: yesterdayData,
    scoreDiff,
    goal,
    currentStreak,
    bestStreak,
    goalMetToday,
  };
}

module.exports = {
  PRODUCTIVE_CATEGORIES,
  DISTRACTING_CATEGORIES,
  computeScore,
  calculateStreakFromDays,
  getProductivityForDate,
  getProductivitySummary,
};

// ============================================================
// UNLOCK ENGINE — decides whether a challenge is visible/playable
// for a given guest right now. This is the flexible core that lets
// challenges be added later without touching this logic.
// ============================================================

export function evaluateUnlock(challenge, ctx) {
  const { pointsTotal = 0, completedChallengeIds = [], guest, now = new Date(), triggeredHiddenIds = [] } = ctx;
  const rule = challenge.unlock || { type: 'immediate' };

  switch (rule.type) {
    case 'immediate':
      return { unlocked: true, hidden: false };

    case 'scheduled': {
      const start = rule.unlockAt ? new Date(rule.unlockAt) : null;
      const unlocked = !start || now >= start;
      return { unlocked, hidden: !unlocked, reason: unlocked ? null : `Unlocks at ${formatWhen(start)}` };
    }

    case 'after_challenge': {
      const unlocked = completedChallengeIds.includes(rule.challengeId);
      return { unlocked, hidden: !unlocked, reason: unlocked ? null : 'Complete the required challenge first' };
    }

    case 'point_threshold': {
      const unlocked = pointsTotal >= (rule.minPoints || 0);
      return {
        unlocked,
        hidden: !unlocked,
        reason: unlocked ? null : `Reach ${rule.minPoints} points to unlock`,
      };
    }

    case 'relationship_group': {
      const groups = rule.groups || [];
      const unlocked = guest ? groups.includes(guest.relationshipTheme) : false;
      return { unlocked, hidden: !unlocked, reason: unlocked ? null : null };
    }

    case 'hidden': {
      const unlocked = triggeredHiddenIds.includes(challenge.id);
      return { unlocked, hidden: !unlocked, reason: null };
    }

    default:
      return { unlocked: true, hidden: false };
  }
}

function formatWhen(date) {
  if (!date) return 'a scheduled time';
  try {
    return date.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
  } catch {
    return 'a scheduled time';
  }
}

/**
 * Filter + annotate a challenge list for the current guest state.
 * `relationship_group` and `after_challenge`/`point_threshold` locked
 * challenges still show (as locked cards) UNLESS the rule type is
 * `hidden` and not yet triggered, or `relationship_group` and the
 * guest isn't in the group — those stay fully invisible, per spec.
 */
export function visibleChallengesFor(challenges, ctx) {
  return challenges
    .filter((c) => c.active)
    .map((c) => ({ ...c, status: evaluateUnlock(c, ctx) }))
    .filter((c) => {
      if (c.unlock?.type === 'hidden' && !c.status.unlocked) return false;
      if (c.unlock?.type === 'relationship_group' && !c.status.unlocked) return false;
      return true;
    });
}

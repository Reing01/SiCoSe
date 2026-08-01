export function parseReplicaProgress(value) {
  const match = /^\s*(\d+)\s*\/\s*(\d+)(?:\s|$)/.exec(value ?? "");

  if (!match) return null;

  return {
    running: Number(match[1]),
    desired: Number(match[2]),
  };
}

export function replicasConverged(value) {
  const progress = parseReplicaProgress(value);
  return Boolean(
    progress && progress.desired > 0 && progress.running === progress.desired,
  );
}

const failedUpdateStates = new Set([
  "paused",
  "rollback_started",
  "rollback_paused",
  "rollback_completed",
]);

export function updateFailed(value) {
  return failedUpdateStates.has((value ?? "").trim().toLowerCase());
}

export function updateSettled(value) {
  const state = (value ?? "").trim().toLowerCase();
  return state === "" || state === "completed";
}

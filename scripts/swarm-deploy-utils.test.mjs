import assert from "node:assert/strict";
import test from "node:test";
import {
  parseReplicaProgress,
  replicasConverged,
  updateFailed,
  updateSettled,
} from "./swarm-deploy-utils.mjs";

test("interpreta el progreso normal de replicas", () => {
  assert.deepEqual(parseReplicaProgress("12/12"), {
    running: 12,
    desired: 12,
  });
  assert.equal(replicasConverged("12/12"), true);
});

test("acepta el sufijo que Docker agrega cuando hay un maximo por nodo", () => {
  assert.deepEqual(parseReplicaProgress("1/1 (max 3 per node)"), {
    running: 1,
    desired: 1,
  });
  assert.equal(replicasConverged("1/1 (max 3 per node)"), true);
});

test("rechaza servicios incompletos, detenidos o salidas invalidas", () => {
  assert.equal(replicasConverged("2/12 (max 3 per node)"), false);
  assert.equal(replicasConverged("0/0 (max 3 per node)"), false);
  assert.equal(replicasConverged("pending"), false);
});

test("espera una actualizacion activa y acepta una actualizacion completa", () => {
  assert.equal(updateSettled("updating"), false);
  assert.equal(updateSettled("completed"), true);
  assert.equal(updateSettled(""), true);
});

test("detecta actualizaciones pausadas o revertidas", () => {
  assert.equal(updateFailed("paused"), true);
  assert.equal(updateFailed("rollback_started"), true);
  assert.equal(updateFailed("rollback_paused"), true);
  assert.equal(updateFailed("rollback_completed"), true);
  assert.equal(updateFailed("updating"), false);
});

// Amulet Lock example — lock and unlock Canton Coin via CIP-56 allocations.
//
// Flow (all as the single LocalNet `app-user` party):
//   lock   = create AmuletLock (an AllocationRequest) + fund it via the Amulet
//            registry's AllocationFactory_Allocate -> holdings become locked
//   unlock = Allocation_Withdraw (releases holdings) + AllocationRequest_Withdraw
//
// Talks to the participant JSON Ledger API v2, the validator API (onboard/tap),
// and the scan-hosted Amulet registry API, all via the serve.py same-origin proxy.

"use strict";

const JSON_API = "/proxy/json";
const VALIDATOR_API = "/proxy/validator";
const SCAN_API = "/proxy/scan";

const AMULET_INSTRUMENT_ID = "Amulet";
const LOCK_LEG_ID = "lock";
const ALLOCATE_GRACE_MINUTES = 10;
const NUMERIC_SCALE = 10;

const TEMPLATE_AMULET_LOCK = "#amulet-lock:AmuletLock:AmuletLock";
const IFACE_HOLDING = "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding";
const IFACE_ALLOCATION = "#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation";
const IFACE_ALLOCATION_FACTORY =
  "#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory";
const IFACE_ALLOCATION_REQUEST =
  "#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest";

const state = {
  token: null,
  user: null,
  party: null,
  dso: null,
  holdings: [],
  allocations: [],
  lockRequests: [],
};

const $ = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  const el = $("status");
  el.textContent = message;
  el.className = kind;
}

function emptyMeta() {
  return { values: {} };
}

function emptyExtraArgs() {
  return { context: { values: {} }, meta: emptyMeta() };
}

function fmtAmount(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function toNumericString(value) {
  return Number(value).toFixed(NUMERIC_SCALE);
}

async function api(base, path, options = {}) {
  const headers = {
    Authorization: `Bearer ${state.token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(base + path, { ...options, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const detail = body.cause || body.error || body.errors?.join("; ") || text;
    if (response.status === 404 && /Contract could not be found/i.test(detail)) {
      throw new Error(
        "A contract was archived on-ledger (stale holding). The view was refreshed — try again."
      );
    }
    throw new Error(`${path} -> HTTP ${response.status}: ${detail}`);
  }
  return body;
}

const ledger = (path, options) => api(JSON_API, path, options);
const validator = (path, options) => api(VALIDATOR_API, path, options);
const scan = (path, options) => api(SCAN_API, path, options);

async function submit(commands, disclosedContracts = []) {
  return ledger("/v2/commands/submit-and-wait", {
    method: "POST",
    body: JSON.stringify({
      commands,
      commandId: crypto.randomUUID(),
      actAs: [state.party],
      userId: state.user,
      disclosedContracts,
    }),
  });
}

async function queryAcs(cumulativeFilter) {
  const { offset } = await ledger("/v2/state/ledger-end");
  return ledger("/v2/state/active-contracts", {
    method: "POST",
    body: JSON.stringify({
      activeAtOffset: offset,
      eventFormat: {
        filtersByParty: { [state.party]: { cumulative: [cumulativeFilter] } },
        verbose: false,
      },
    }),
  });
}

function activeContracts(acsResponse) {
  return acsResponse
    .map((entry) => entry.contractEntry?.JsActiveContract)
    .filter(Boolean);
}

function interfaceView(createdEvent) {
  return createdEvent.interfaceViews?.[0]?.viewValue;
}

// --- bootstrap ---------------------------------------------------------------

async function init() {
  setStatus("Connecting…");
  const tokenResponse = await fetch("/token").then((r) => r.json());
  state.token = tokenResponse.token;
  state.user = tokenResponse.user;

  // Onboard the wallet user if this is a fresh LocalNet.
  let status;
  try {
    status = await validator("/api/validator/v0/wallet/user-status");
  } catch {
    status = null;
  }
  if (!status?.user_onboarded || !status?.user_wallet_installed) {
    setStatus("Onboarding wallet user…");
    await validator("/api/validator/v0/register", { method: "POST", body: "{}" });
    status = await validator("/api/validator/v0/wallet/user-status");
  }
  state.party = status.party_id;
  $("party").textContent = state.party;

  const dsoResponse = await scan("/api/scan/v0/dso-party-id");
  state.dso = dsoResponse.dso_party_id;

  await refresh();
  setStatus("");
}

// --- read side ---------------------------------------------------------------

async function refresh() {
  const [holdingsAcs, allocationsAcs, requestsAcs] = await Promise.all([
    queryAcs({
      identifierFilter: {
        InterfaceFilter: {
          value: { interfaceId: IFACE_HOLDING, includeInterfaceView: true, includeCreatedEventBlob: false },
        },
      },
    }),
    queryAcs({
      identifierFilter: {
        InterfaceFilter: {
          value: { interfaceId: IFACE_ALLOCATION, includeInterfaceView: true, includeCreatedEventBlob: false },
        },
      },
    }),
    queryAcs({
      identifierFilter: {
        TemplateFilter: { value: { templateId: TEMPLATE_AMULET_LOCK, includeCreatedEventBlob: false } },
      },
    }),
  ]);

  state.holdings = activeContracts(holdingsAcs)
    .map((ac) => ({ contractId: ac.createdEvent.contractId, view: interfaceView(ac.createdEvent) }))
    .filter((h) => h.view?.instrumentId?.id === AMULET_INSTRUMENT_ID && h.view?.owner === state.party);

  state.allocations = activeContracts(allocationsAcs)
    .map((ac) => ({ contractId: ac.createdEvent.contractId, view: interfaceView(ac.createdEvent) }))
    .filter((a) => a.view?.allocation?.transferLeg?.sender === state.party);

  state.lockRequests = activeContracts(requestsAcs).map((ac) => ({
    contractId: ac.createdEvent.contractId,
    payload: ac.createdEvent.createArgument,
  }));

  render();
}

function unlockedHoldings() {
  return state.holdings.filter((h) => !h.view.lock);
}

function render() {
  const available = unlockedHoldings().reduce((sum, h) => sum + Number(h.view.amount), 0);
  const locked = state.holdings
    .filter((h) => h.view.lock)
    .reduce((sum, h) => sum + Number(h.view.amount), 0);
  $("balance").textContent = fmtAmount(available);
  $("lockedBalance").textContent = fmtAmount(locked);

  renderLocks();
  renderHoldings();
}

function renderLocks() {
  const container = $("locks");
  const allocationLockIds = new Set(
    state.allocations.map((a) => a.view.allocation.settlement.settlementRef?.id)
  );
  const pendingRequests = state.lockRequests.filter((r) => !allocationLockIds.has(r.payload.lockId));

  if (state.allocations.length === 0 && pendingRequests.length === 0) {
    container.innerHTML = '<div class="empty">No locks. Lock some tokens above.</div>';
    return;
  }

  const rows = [];
  for (const allocation of state.allocations) {
    const spec = allocation.view.allocation;
    const until = new Date(spec.settlement.settleBefore);
    rows.push(`
      <tr>
        <td><span class="pill amber">locked</span></td>
        <td>${fmtAmount(spec.transferLeg.amount)} CC</td>
        <td>until ${until.toLocaleString()}</td>
        <td style="text-align:right">
          <button data-action="unlock" data-cid="${allocation.contractId}">Unlock</button>
        </td>
      </tr>`);
  }
  for (const request of pendingRequests) {
    rows.push(`
      <tr>
        <td><span class="pill">pending</span></td>
        <td>${fmtAmount(request.payload.amount)} CC</td>
        <td>awaiting allocation</td>
        <td style="text-align:right">
          <button class="ghost" data-action="cancel-request" data-cid="${request.contractId}">Cancel</button>
        </td>
      </tr>`);
  }
  container.innerHTML = `<table>
    <thead><tr><th>State</th><th>Amount</th><th>Expiry</th><th></th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>`;
}

function renderHoldings() {
  const container = $("holdings");
  if (state.holdings.length === 0) {
    container.innerHTML = '<div class="empty">No amulet holdings. Tap to get test CC.</div>';
    return;
  }
  const rows = state.holdings
    .sort((a, b) => Number(b.view.amount) - Number(a.view.amount))
    .map((h) => {
      const lock = h.view.lock;
      const pill = lock
        ? `<span class="pill amber">locked${lock.expiresAt ? ` until ${new Date(lock.expiresAt).toLocaleTimeString()}` : ""}</span>`
        : '<span class="pill green">unlocked</span>';
      return `<tr><td>${fmtAmount(h.view.amount)} CC</td><td>${pill}</td>
        <td style="color:var(--muted); font-size:0.75rem;">${h.contractId.slice(0, 18)}…</td></tr>`;
    });
  container.innerHTML = `<table>
    <thead><tr><th>Amount</th><th>State</th><th>Contract</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>`;
}

// --- write side ----------------------------------------------------------------

function selectInputHoldings(amount) {
  const candidates = unlockedHoldings().sort((a, b) => Number(b.view.amount) - Number(a.view.amount));
  const selected = [];
  let covered = 0;
  for (const holding of candidates) {
    if (covered >= amount) break;
    selected.push(holding.contractId);
    covered += Number(holding.view.amount);
  }
  if (covered < amount) {
    throw new Error(`Insufficient unlocked balance: have ${fmtAmount(covered)}, need ${fmtAmount(amount)}.`);
  }
  return selected;
}

function allocationSpec(lock) {
  return {
    settlement: {
      executor: state.party,
      settlementRef: { id: lock.lockId, cid: null },
      requestedAt: lock.createdAt,
      allocateBefore: lock.allocateBefore,
      settleBefore: lock.lockedUntil,
      meta: emptyMeta(),
    },
    transferLegId: LOCK_LEG_ID,
    transferLeg: {
      sender: state.party,
      receiver: state.party,
      amount: lock.amount,
      instrumentId: { admin: state.dso, id: AMULET_INSTRUMENT_ID },
      meta: emptyMeta(),
    },
  };
}

async function lockTokens() {
  const amount = Number($("lockAmount").value);
  const minutes = Number($("lockMinutes").value);
  if (!(amount > 0) || !(minutes >= 1)) {
    setStatus("Enter a positive amount and a duration of at least 1 minute.", "error");
    return;
  }

  $("lockBtn").disabled = true;
  try {
    // Holdings are UTXOs — each lock/unlock archives old ones and creates new
    // contract ids. Always reload from the ledger before picking inputs.
    setStatus("Loading current holdings…");
    await refresh();

    const now = new Date();
    const lock = {
      owner: state.party,
      amount: toNumericString(amount),
      instrumentId: { admin: state.dso, id: AMULET_INSTRUMENT_ID },
      lockId: crypto.randomUUID(),
      createdAt: now.toISOString(),
      allocateBefore: new Date(now.getTime() + ALLOCATE_GRACE_MINUTES * 60_000).toISOString(),
      lockedUntil: new Date(now.getTime() + minutes * 60_000).toISOString(),
    };
    const inputHoldingCids = selectInputHoldings(amount);

    setStatus("Creating lock request…");
    await submit([
      { CreateCommand: { templateId: TEMPLATE_AMULET_LOCK, createArguments: lock } },
    ]);

    setStatus("Fetching allocation factory from the Amulet registry…");
    const allocateArgs = {
      expectedAdmin: state.dso,
      allocation: allocationSpec(lock),
      requestedAt: lock.createdAt,
      inputHoldingCids,
      extraArgs: emptyExtraArgs(),
    };
    const factory = await scan("/registry/allocation-instruction/v1/allocation-factory", {
      method: "POST",
      body: JSON.stringify({ choiceArguments: allocateArgs, excludeDebugFields: true }),
    });

    setStatus("Locking holdings via AllocationFactory_Allocate…");
    await submit(
      [
        {
          ExerciseCommand: {
            templateId: IFACE_ALLOCATION_FACTORY,
            contractId: factory.factoryId,
            choice: "AllocationFactory_Allocate",
            choiceArgument: {
              ...allocateArgs,
              extraArgs: { context: factory.choiceContext.choiceContextData, meta: emptyMeta() },
            },
          },
        },
      ],
      factory.choiceContext.disclosedContracts
    );

    await refresh();
    setStatus(`Locked ${fmtAmount(amount)} CC for ${minutes} minute(s).`, "ok");
  } catch (error) {
    console.error(error);
    await refresh().catch(() => {});
    setStatus(String(error.message || error), "error");
  } finally {
    $("lockBtn").disabled = false;
  }
}

async function unlockAllocation(allocationCid) {
  try {
    await refresh();
    if (!state.allocations.some((a) => a.contractId === allocationCid)) {
      setStatus("That lock is no longer active (already unlocked or expired).", "error");
      return;
    }

    setStatus("Fetching withdraw context from the Amulet registry…");
    const context = await scan(
      `/registry/allocations/v1/${encodeURIComponent(allocationCid)}/choice-contexts/withdraw`,
      { method: "POST", body: JSON.stringify({ excludeDebugFields: true }) }
    );

    const allocation = state.allocations.find((a) => a.contractId === allocationCid);
    const lockId = allocation?.view.allocation.settlement.settlementRef?.id;
    const request = state.lockRequests.find((r) => r.payload.lockId === lockId);

    const commands = [
      {
        ExerciseCommand: {
          templateId: IFACE_ALLOCATION,
          contractId: allocationCid,
          choice: "Allocation_Withdraw",
          choiceArgument: {
            extraArgs: { context: context.choiceContextData, meta: emptyMeta() },
          },
        },
      },
    ];
    if (request) {
      commands.push({
        ExerciseCommand: {
          templateId: IFACE_ALLOCATION_REQUEST,
          contractId: request.contractId,
          choice: "AllocationRequest_Withdraw",
          choiceArgument: { extraArgs: emptyExtraArgs() },
        },
      });
    }

    setStatus("Unlocking…");
    await submit(commands, context.disclosedContracts);
    await refresh();
    setStatus("Unlocked. Holdings are spendable again.", "ok");
  } catch (error) {
    console.error(error);
    await refresh().catch(() => {});
    setStatus(String(error.message || error), "error");
  }
}

async function cancelRequest(requestCid) {
  try {
    await refresh();
    if (!state.lockRequests.some((r) => r.contractId === requestCid)) {
      setStatus("That lock request is no longer active.", "error");
      return;
    }

    setStatus("Cancelling lock request…");
    await submit([
      {
        ExerciseCommand: {
          templateId: IFACE_ALLOCATION_REQUEST,
          contractId: requestCid,
          choice: "AllocationRequest_Withdraw",
          choiceArgument: { extraArgs: emptyExtraArgs() },
        },
      },
    ]);
    await refresh();
    setStatus("Lock request cancelled.", "ok");
  } catch (error) {
    console.error(error);
    setStatus(String(error.message || error), "error");
  }
}

async function tap() {
  $("tapBtn").disabled = true;
  try {
    setStatus("Tapping 100 CC…");
    await validator("/api/validator/v0/wallet/tap", {
      method: "POST",
      body: JSON.stringify({ amount: toNumericString(100) }),
    });
    await refresh();
    setStatus("Tapped 100 CC.", "ok");
  } catch (error) {
    console.error(error);
    setStatus(String(error.message || error), "error");
  } finally {
    $("tapBtn").disabled = false;
  }
}

// --- wiring --------------------------------------------------------------------

$("lockBtn").addEventListener("click", lockTokens);
$("tapBtn").addEventListener("click", tap);
$("refreshBtn").addEventListener("click", () =>
  refresh().then(() => setStatus("Refreshed.", "ok")).catch((e) => setStatus(String(e), "error"))
);
$("locks").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "unlock") unlockAllocation(button.dataset.cid);
  if (button.dataset.action === "cancel-request") cancelRequest(button.dataset.cid);
});

init().catch((error) => {
  console.error(error);
  setStatus(`Failed to connect: ${error.message || error}`, "error");
});

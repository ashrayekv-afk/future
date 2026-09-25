/* Review-state fixes layered over the archived OCR engine. The OCR crops and recognition logic remain unchanged. */
'use strict';

const originalResetResultsOnly = resetResultsOnly;
resetResultsOnly = function () {
  originalResetResultsOnly();
  // Hiding a prior report is insufficient: remove source images/data URLs from the DOM.
  el('reviewContent')?.replaceChildren();
  el('detectedSummary')?.replaceChildren();
};

const originalClearSession = clearSession;
clearSession = function (notifyParent = true) {
  for (const worker of state.workers) Promise.resolve(worker.terminate()).catch(() => {});
  state.workers = [];
  state.workerPromise = null;
  originalClearSession(notifyParent);
};

function invalidateVerifiedPayload() {
  state.payload = null;
  state.autoSubmitDone = false;
  if (state.autoSubmitTimer) clearTimeout(state.autoSubmitTimer);
  state.autoSubmitTimer = null;
  if (el('confirmValues')) el('confirmValues').checked = false;
  el('exportSection')?.classList.add('hidden');
  if (el('jsonOutput')) el('jsonOutput').value = '';
  if (el('sendStatus')) el('sendStatus').textContent = '';
  window.StreamlitBridge.setComponentValue({action:'dirty'});
}

function reviewIssue(wrapper) {
  const input = wrapper.querySelector('input[type="number"]');
  try {
    NKPIImport.number(input?.value, input?.dataset.variable || 'Measurement', input?.dataset.variable !== 'BAD_D');
  } catch (error) { return error.message; }
  if (wrapper.dataset.needsVerification === 'true' && !wrapper.querySelector('.field-verification-checkbox')?.checked) return 'Verify this value against the source.';
  return null;
}

function unresolvedCurrentStudyCount() {
  const studies = state.mode === 'baseline' ? state.baselineStudies : [...state.earlierStudies, ...state.laterStudies];
  return unresolvedStudies(studies).length;
}

function selectedIntervalDays(first, last) {
  if (!(first instanceof Date) || !(last instanceof Date) || !Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) return null;
  const day = date => Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()) / 86400000;
  return day(last) - day(first);
}

// Bilateral appearance is not evidence of laterality. Two studies can be same-eye repeats.
reconcileStudyLaterality = function (results) {
  return [...results].sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
};

createLateralityResolver = function (studies) {
  const unresolved = unresolvedStudies(studies);
  if (!unresolved.length) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'laterality-resolver';
  const title = document.createElement('h3'); title.textContent = 'Confirm the eye on each source report'; wrapper.append(title);
  for (const study of unresolved) {
    const card = document.createElement('div'); card.className = 'visit-card';
    const label = document.createElement('label'); label.className = 'field';
    const text = document.createElement('span'); text.textContent = formatTimestamp(study.timestamp); label.append(text);
    const select = document.createElement('select');
    for (const [value, name] of [['','Select eye…'],['OD','Right eye — OD'],['OS','Left eye — OS']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option);
    }
    select.addEventListener('change', () => {
      if (!['OD','OS'].includes(select.value)) return;
      invalidateVerifiedPayload(); study.eye = select.value; study.eyeResolution = 'confirmed by user';
      renderDetected(); renderReview();
    });
    label.append(select); card.append(label, sourcePreview(study)); wrapper.append(card);
  }
  return wrapper;
};

valueInput = function (variable, originalValue, inputId, quality, study) {
  const meta = VARIABLE_META[variable];
  const manual = study?.manualEdits?.[variable];
  const value = manual ? manual.value : (Number.isFinite(originalValue) ? originalValue.toFixed(meta.decimals) : '');
  const needs = Boolean(manual) || fieldNeedsVerification(study, variable);
  const wrapper = document.createElement('div'); wrapper.className = 'value-field'; wrapper.dataset.variable = variable;
  wrapper.dataset.needsVerification = needs ? 'true' : 'false';
  const labelRow = document.createElement('div'); labelRow.className = 'value-label-row';
  const label = document.createElement('label'); label.htmlFor = inputId; label.textContent = meta.label;
  const badge = document.createElement('span'); badge.className = 'quality-badge quality-high';
  badge.textContent = needs ? (manual?.verified ? 'Source verified' : 'Review') : 'Cross-checked';
  labelRow.append(label, badge); wrapper.append(labelRow);
  const input = document.createElement('input'); input.id = inputId; input.type = 'number'; input.step = meta.step;
  input.dataset.variable = variable; input.value = value; wrapper.append(input);
  if (meta.unit) {const unit = document.createElement('span'); unit.className = 'unit'; unit.textContent = meta.unit; wrapper.append(unit);}
  const review = document.createElement('div'); review.className = 'micro-verification'; review.hidden = !needs;
  const note = study?.fieldPreviewNotes?.[variable];
  if (note) {const p = document.createElement('p'); p.className = 'calculation-preview-card'; p.textContent = note; review.append(p);}
  const url = study?.fieldPreviews?.[variable];
  if (url) {const image = document.createElement('img'); image.src = url; image.alt = `${meta.label} source crop`; image.className = 'micro-verification-image'; review.append(image);}
  const verifyLabel = document.createElement('label'); verifyLabel.className = 'field-verification-label';
  const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = fieldVerificationId(inputId);
  checkbox.className = 'field-verification-checkbox'; checkbox.checked = Boolean(manual?.verified);
  const text = document.createElement('span'); text.textContent = url ? 'Source verified' : 'Verified against original report';
  verifyLabel.append(checkbox, text); review.append(verifyLabel); wrapper.append(review);
  const persist = (verified) => {
    if (study) {study.manualEdits ||= {}; study.manualEdits[variable] = {value:input.value, verified};}
  };
  input.addEventListener('input', () => {
    invalidateVerifiedPayload(); wrapper.dataset.needsVerification = 'true'; review.hidden = false;
    checkbox.checked = false; badge.textContent = 'Review'; badge.className = 'quality-badge quality-unavailable';
    persist(false); updateVerificationGate();
  });
  checkbox.addEventListener('change', () => {
    invalidateVerifiedPayload(); persist(checkbox.checked);
    badge.textContent = checkbox.checked ? 'Source verified' : 'Review';
    badge.className = checkbox.checked ? 'quality-badge quality-high' : 'quality-badge quality-unavailable';
    updateVerificationGate();
  });
  const candidates = auditCandidateValues(study?.audit?.[variable], variable);
  if (needs && candidates.length > 1) {
    const choices = document.createElement('div'); choices.className = 'candidate-buttons';
    candidates.forEach(candidate => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'candidate-button'; button.textContent = candidate.toFixed(meta.decimals);
      button.addEventListener('click', () => {input.value = candidate.toFixed(meta.decimals); input.dispatchEvent(new Event('input'));}); choices.append(button);
    });
    review.prepend(choices);
  }
  return wrapper;
};

const originalVisitCard = visitCard;
visitCard = function (...args) {
  const card = originalVisitCard(...args);
  const status = card.querySelector(':scope > .extraction-warning, :scope > .extraction-ok');
  if (status) status.dataset.reviewStatus = 'true';
  return card;
};

allRequiredFieldsVerified = function () {
  const fields = [...document.querySelectorAll('#reviewContent .value-field')];
  return fields.length > 0 && !unresolvedCurrentStudyCount() && fields.every(wrapper => !reviewIssue(wrapper));
};

// A final explicit case confirmation is required; independent OCR agreement is not human review.
maybeAutoCalculate = function () {};

updateVerificationGate = function () {
  const fields = [...document.querySelectorAll('#reviewContent .value-field')];
  const remaining = fields.filter(wrapper => reviewIssue(wrapper));
  state.verificationRequiredCount = remaining.length;
  for (const wrapper of fields) {
    const issue = reviewIssue(wrapper); const input = wrapper.querySelector('input[type="number"]');
    input?.setAttribute('aria-invalid', issue ? 'true' : 'false');
  }
  for (const status of document.querySelectorAll('[data-review-status]')) {
    const local = [...status.closest('.visit-card').querySelectorAll('.value-field')];
    const count = local.filter(wrapper => !reviewIssue(wrapper)).length;
    status.textContent = `${count}/${local.length} values ready`;
    status.className = count === local.length ? 'extraction-ok' : 'extraction-warning';
  }
  const summary = el('verificationSummary');
  const unresolved = unresolvedCurrentStudyCount();
  summary.textContent = unresolved ? `Confirm the eye for ${unresolved} unresolved study/studies above.` : fields.length ? `${fields.length - remaining.length}/${fields.length} values ready` : 'Resolve the study eye to review measurements.';
  summary.className = remaining.length || !fields.length ? 'verification-summary verification-needed' : 'verification-summary verification-complete';
  const confirm = el('confirmValues'); confirm.disabled = Boolean(remaining.length || !fields.length || unresolved);
  if (confirm.disabled) confirm.checked = false;
  confirm.closest('label')?.classList.toggle('confirmation-disabled', confirm.disabled);
  syncFrameHeight();
};

const originalRenderReview = renderReview;
renderReview = function () {
  invalidateVerifiedPayload(); originalRenderReview();
  if (state.mode === 'longitudinal') {
    const shared = el('intervalDays'); const sharedWrap = shared?.closest('.form-grid');
    if (sharedWrap) {
      sharedWrap.innerHTML = '';
      const earlier = groupByEye(state.earlierStudies), later = groupByEye(state.laterStudies);
      for (const eye of ['OD','OS']) {
        if (!earlier[eye].length || !later[eye].length) continue;
        const first = selectedStudy(earlier, eye, 'earlier'), last = selectedStudy(later, eye, 'later');
        const days = selectedIntervalDays(first?.timestamp,last?.timestamp);
        const label = document.createElement('label'); label.className = 'field';
        const text = document.createElement('span'); text.textContent = `${eye} — days between selected visits`;
        const input = document.createElement('input'); input.id = `intervalDays_${eye}`; input.type = 'number'; input.min = '1'; input.step = '1';
        if (days > 0) input.value = days;
        const help = document.createElement('small');
        help.textContent = days !== null && days <= 0 ? 'Select two different visits in chronological order.' : 'Confirm the interval. Exact dates remain in this browser.';
        input.addEventListener('input', invalidateVerifiedPayload); label.append(text, input, help); sharedWrap.append(label);
      }
    }
  }
  updateVerificationGate();
};

readVisitValues = function (visitKey, eye) {
  return Object.fromEntries(NKPIImport.FIELDS.map(variable => {
    const input = el(`${visitKey}_${eye}_${variable}`);
    return [variable, NKPIImport.number(input?.value, `${eye} ${visitKey}: ${VARIABLE_META[variable].label}`, variable !== 'BAD_D')];
  }));
};

buildPayload = function () {
  if (unresolvedCurrentStudyCount()) throw new Error('Confirm the eye for each unresolved source study before importing.');
  if (!allRequiredFieldsVerified()) throw new Error('Review each highlighted measurement against its source before importing.');
  const value = {mode:state.mode, age:NKPIImport.number(el('age').value, 'Age', true)};
  if (state.mode === 'baseline') {
    value.eyes = {};
    for (const eye of ['OD','OS']) if (el(`baseline_${eye}_A`)) value.eyes[eye] = readVisitValues('baseline', eye);
  } else {
    value.baseline = {}; value.followup = {}; value.interval_days_by_eye = {};
    const earlier = groupByEye(state.earlierStudies), later = groupByEye(state.laterStudies);
    for (const eye of ['OD','OS']) {
      if (!el(`earlier_${eye}_A`) || !el(`later_${eye}_A`)) continue;
      const first = selectedStudy(earlier, eye, 'earlier'), last = selectedStudy(later, eye, 'later');
      const knownDays = selectedIntervalDays(first?.timestamp,last?.timestamp);
      if (knownDays !== null && knownDays <= 0) throw new Error(`${eye}: select an earlier scan followed by a later scan. Same-day repeats are not longitudinal follow-up.`);
      value.baseline[eye] = readVisitValues('earlier', eye); value.followup[eye] = readVisitValues('later', eye);
      value.interval_days_by_eye[eye] = NKPIImport.number(el(`intervalDays_${eye}`)?.value, `${eye} interval`, true);
    }
  }
  return NKPIImport.sanitize(value);
};

sendPayloadToCalculator = function () {
  try {
    if (!el('confirmValues').checked) throw new Error('Confirm eye, visit order and measurements before importing.');
    state.payload = buildPayload();
    StreamlitBridge.setComponentValue({action:'submit', payload:state.payload, nonce:Date.now()});
    el('sendStatus').textContent = 'Calculation requested. The bilateral results are shown below.';
    scheduleFrameHeightSync();
  } catch (error) {state.payload = null; showError(error.message);}
};

const originalGenerateExport = generateExport;
generateExport = function () {
  if (!el('confirmValues').checked) {
    invalidateVerifiedPayload();
    return;
  }
  originalGenerateExport();
  // v4.1: confirmation enables the visible step-3 button. Only a deliberate
  // Calculate click submits; there is no second quality/history review screen.
};

document.addEventListener('DOMContentLoaded', () => {
  el('age').addEventListener('input', invalidateVerifiedPayload);
  document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', invalidateVerifiedPayload));
  el('processButton').addEventListener('click', invalidateVerifiedPayload);
  el('caseId').readOnly = true;
  const caseField = el('caseId').closest('label'); if (caseField) caseField.hidden = true;
  el('autoCalculate').checked = false;
  const auto = el('autoCalculate').closest('label'); if (auto) auto.hidden = true;
  for (const id of ['baselineZip','earlierZip','laterZip']) el(id)?.addEventListener('change', () => {resetResultsOnly(); invalidateVerifiedPayload();});
  const confirmText = el('confirmValues').closest('label').querySelector('span');
  if (confirmText) confirmText.textContent = 'I verified the eye, measurements and visit order against the source. Ready to calculate.';
  el('processButton').textContent = 'Extract measurements';
  el('sendButton').textContent = 'Calculate NKPI now';
});

window.addEventListener("pagehide", () => { for (const worker of state.workers) Promise.resolve(worker.terminate()).catch(() => {}); });

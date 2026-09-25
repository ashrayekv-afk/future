# Treatment-benefit workspace — implementation boundary

## Integration

`components/index.html` embeds `benefit/index.html` in the former 3D iframe.
The iframe/tab IDs are retained to preserve existing layout and keyboard tab
handling. `report_gallery.js`, the extractor, entry form, score panels and exports
are unchanged. The parent no longer sends report images or numerical map grids
to this iframe.

`components/app.js` sends a numeric-only `nkpi:benefit:context` message:
version 1, session ID, input revision, source-dirty flag, and enabled OD/OS cases.
Each case contains mode, age, interval, verification/import/demo flags and the
six first/latest scalar values. No NKPI score, report filename, image or identity
field is consumed by the panel.

The child checks the sender and origin, validates the message schema, discards
older revisions within the active session, and clears context when a trusted
message is malformed. Changed input revisions and patient sessions return the
view to entered measurements. A session reset clears all previous values and
resets the fictional example. Child-to-parent messages contain readiness/height
only; there is no prediction result to export or send for calculation.

## Entered-measurement view

The six values use the existing calculator's numeric bounds. Missing, boolean,
nonfinite and out-of-range inputs are not interpreted as zero. Later-minus-first
differences require verified source values, two visits and a valid whole-day
interval. Missing pairs are left blank. Differences are not annualized, assigned
clinical progression thresholds or fed into the fictional risk fixture.

The view deliberately does not show a patient probability or treatment
recommendation. Manual versus imported provenance, synthetic calculator inputs,
source verification and scan interval remain visible. Source verification is a
user confirmation; it does not establish scan quality or progression.

## Simulated comparison

`benefit_core.js` contains explicit handcrafted fixtures for two cases, two
information scenarios and six time points (0, 3, 6, 12, 18, 24 months). The UI
allows horizon summaries at 6, 12 and 24 months and inspecting every fixture time
point. Straight segments join preset points; they are not fitted hazard curves.

Both paths start at the selected visit. The fictional outcome is further
confirmed tomographic progression. Surveillance includes hypothetical scheduled
monitoring and rescue CXL; it is not a never-treated counterfactual. Thresholds,
confirmation rules, rescue policy and treatment eligibility are not specified as
clinical recommendations in this software.

Absolute difference = surveillance cumulative risk minus CXL cumulative risk,
reported in **percentage points**. The benefit range is independently preset; it
is not a confidence interval and is not obtained by subtracting marginal range
endpoints. Case B includes no benefit within its illustrative range. Risk bands
and the benefit range have no calibrated coverage.

Changing baseline/follow-up switches fixtures. It does not fit a model, learn
from actual entered scans or update a real treatment effect. No patient values
are copied into fictional examples. Actual values remain in a separate mode.

## Work required for a real model

No training data, fitted causal estimator or outcome-validation result has been
supplied for this release. Before implementing a patient estimator, define the
eligible population, time zero, progression endpoint, CXL protocol, surveillance
and rescue strategy, follow-up/censoring rules and treatment confounders. Fit on
appropriate longitudinal outcomes, quantify uncertainty and evaluate on held-out
and external data. Do not substitute the existing CXL-associated NKPI score for a
causal effect or multiply it by a presumed treatment efficacy.

Vision, adverse events, recovery burden and net clinical benefit are not
modeled. A benefit-only display would still not determine a treatment decision.

## Runtime and packaging

The new child panel is plain HTML/CSS/JavaScript with SVG charts, no external
libraries and no local/session storage. Existing Python requirements are
unchanged. `TREATMENT_BENEFIT_DEMO.html` bundles these same assets, explicitly
opens simulation mode and carries a standalone-demo banner. It is regenerated
from production sources when this release is packaged.

The UI version is 6.0.0-treatment-benefit-preview; the frozen calculator model
release remains 3.0.0. Historical corneal visualization modules are retained but
are not the main website's selected model panel.

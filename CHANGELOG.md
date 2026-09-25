# 6.0.0-treatment-benefit-preview

- Replace the 3D panel with the new treatment-benefit research workspace.
- Add verified entered-measurement context and an isolated fictional treatment
  comparison with two cases, visit scenarios, horizons, risk curves and ranges.
- Keep the frozen calculator, importer, source gallery and exports unchanged.
- No trained treatment-benefit estimator or new clinical prediction is included.
- Add offline preview, message/state regression tests and release documentation.

# 5.0.0-numerical-maps

- Curvature and thickness only; five visit/map controls.
- Calibrated image-derived numerical grids and signed difference heatmaps.
- Original baseline/latest report pixels retained on the numerical corneal cap.
- Explicitly estimated curvature-driven shape and thickness shell/cutaway.
- Map-only native JSON imports no longer require z geometry.
- Frozen scoring and automatic DICOM report import retained.

# 4.8.1-change-fix

- Replace segmentation-bound comparisons with verified printed-frame positions and fixed crop windows. Missing/asymmetric colors cannot move the comparison crop or block unrelated maps.
- Check actual frame rules, header position and matching printed legends before showing a comparison.
- Repeated Change clicks immediately switch the displayed visit and keep playing; map changes resume comparison. Select Baseline/Latest for a fixed view.
- Test all eight actual map pairs plus shifted/shrunken detection metadata, damaged frames, repeated clicks and session lifecycle.
- This repairs visual comparison only. Numerical difference-map generation from JPEGs remains unsupported.

# 4.8.0-visual-change

- Add paired original-image comparison under Change, with synchronized visit labels and pause/reduced-motion support.
- Require matching report windows and printed color scales; share one crop across both visits.
- Fix small colored summary boxes interfering with Belin thickness identification.
- Retain the strict numerical subtraction path, automatic DICOM import, seven buttons, models and reference-eye geometry.
- Validate 16 actual source maps and eight visual comparisons from supplied baseline/follow-up ZIPs. Quantitative image reconstruction is not included.

# 4.7.0-simple-maps

- Replace the viewer controls with exactly Baseline / Latest / Change and
  Curvature / Elevation / Posterior elevation / Thickness.
- Remove report/map-number dropdowns, manual crop selection, review-pin tools,
  camera presets, opacity, comparison selectors and measured-mode switches
  from the simplified 3D viewer. Drag rotation and wheel zoom remain.
- Show enabled imported OD/OS eyes automatically under the same controls.
- Recognize the relative Topometric/Belin layout independently of page size,
  padding and detection order; remove the exact 1200×838 template gate.
- Read unresolved map titles with the existing browser OCR worker during import;
  transport only map-role/crop metadata to the viewer.
- Search associated reports automatically for the requested map, preserving
  source/eye/visit identity and clearing genuinely unavailable maps.
- Preserve automatic DICOM import, numerical difference requirements, the
  reference-eye renderer, frozen models and scoring.

See `docs/SIMPLE_MAPS.md` for test scope and deployment checks.

---

# 4.6.0-combined

- Merge automatic decoded-report identification from 4.5.0-auto-dicom with
  thickness-map routing and Baseline / Latest / Change from 4.5.0-map-comparison.
- Retain both feature branches; no overwrite of the newer importer by the map release.
- Use one combined footer/diagnostic version and refreshed deployment instructions.
- Preserve frozen models, scoring, audit, decoder support and 3D geometry.

See `docs/COMBINED_RELEASE.md` for verification and inherited limitations.

---

# 4.5.0-map-comparison

- Route Thickness to the pachymetry circle without first applying elevation.
- Match supported template circles by location, independent of order/count;
  ambiguous or absent target maps clear the old texture.
- Retain requested map type across baseline/latest selections and guard stale
  asynchronous image loads.
- Add Baseline / Latest / Change on the existing reference-eye renderer.
- Calculate signed differences only from matched registered numerical maps;
  require one common fixed reference for elevation differences.
- Add explicit signed legend, per-sample readouts, missing-data masks, and
  source-verification/reset invalidation.
- Preserve the current reference-eye view instead of automatically switching
  to measured geometry when numerical data arrive.
- Keep importer, models, scoring, audit and reference-eye geometry unchanged.

See `docs/MAP_COMPARISON.md` for exact software-test scope and data requirements.

---

# 4.4.0-import-repair

- Read image file signatures, extensionless/misnamed report images and bounded nested ZIP archives.
- Add optional browser PDF/TIFF and restricted DICOM report adapters with format-specific failure diagnostics.
- Retain folder/inner-archive scope when grouping equal report timestamps.
- Add explicit source-page/eye association for unfamiliar layouts; no order-based pairing guesses.
- Keep report images and blank, source-verifiable inputs when OCR is unavailable; no synthetic measurement defaults.
- Cancel pending source selection and revoke old results on every new import path.
- Preserve original-source links for same-ZIP numerical indices after file-name normalization.
- Bundle the existing JSZip 3.10.1 code and license locally. Frozen inference, model artifacts, ranked audit and geometry rules remain unchanged.

The exact screenshot archive was not provided for testing. See docs/TEST_REPORT.md for scope and remaining checks.

---

# 4.3.0-ranked-review

- Fix duplicate-render collapse by retaining unchanged result DOM and per-eye disclosure state.
- Open a complete, absolute-impact-ranked input/median table by default, with signed NKPI points, counterfactual index and per-eye CSV.
- Independently verify stored training medians, feature mapping, effects and cohort metadata.
- Add manual source-linked review pins on cropped report images, the corresponding 3D reference texture and the original-report overlay.
- Preserve eye/visit/study/page/crop identity, hide/undo/remove controls, and full reset.
- Keep inference, model artifacts, calibration and input workflow unchanged.

## Earlier history

# 4.2.0-auto3d

- Default 3D reference eye opens automatically, with no separate surface upload.
- Same source ZIP supplies original map pixels as texture; shape remains a fixed, explicitly labelled reference.
- Added native WebGL renderer and self-contained CPU 3D fallback, linked comparison, map opacity, close-up, reference cutaway and source-crop inspection.
- Added conservative layout-based curvature/elevation/thickness shortcuts. Unrecognized layouts retain generic labels.
- Added explicit same-ZIP numerical JSON association and source-confirmed numerical display; wrong/ambiguous/missing geometry is withheld.
- Preserved step-3 single-click bilateral calculation, unknown optional metadata, input/result audit, and frozen model artifacts.

---

# Changelog

## 4.1.0-purple-maps — 2026-09-21

### Streamlined workflow

Removed mandatory scan-quality/treatment-history UI controls. Unknown or omitted optional metadata no longer hold a verified calculation; they remain unknown and produce explicit limitations in results/PDFs. Known poor quality or prior treatment still hold a score. Complete source verification and input auditing remain mandatory.

Moved Calculate directly into measurement verification (step 3); checking the final confirmation only enables calculation, while one Calculate click submits the verified bilateral measurements to inference. No extra step or second calculation click. Revoking confirmation clears previous results.

### Original report maps

Added browser-only original-image report gallery as the default bottom viewer tab. Uses the selected eye/visit/study's associated source image pixels, not an invented 3D reconstruction. Includes page thumbnails, OD/OS and first/later selectors, zoom/fit and inline enlargement. Extra same-study pages retained when explicitly associated; generic numbered pages are not automatically assigned a map type. True numerical 3D and supplied-only overlays remain separate and unchanged.

### Lifecycle and audit

Report-image messages use same-origin/session-bound local transport, separate from scalar model requests. Source changes and resets clear previous report references. Added cancellation of delayed extraction completion after a source reset and stale-image guards. Preserved input/result audit and per-eye isolation.

### Model preservation and tests

Model JSON files, registry and `infer()` source unchanged. Only handling of unknown optional eligibility metadata changed. 107 automated unit/component checks passed, with an additional 300 exact synthetic prediction/explanation comparisons and four one-page PDF checks. No live Streamlit/Cloud, real OCR accuracy, clinical validation, or device-level geometry verification is claimed. See `docs/TEST_REPORT.md`.

## 4.0.0-purple — 2026-09-21

### Restored

Purple report-import header and card styling; OD/OS side-by-side calculator and results; gradient index gauges, reasons, source review, per-eye PDF/reset controls, and mobile stacking.

### Added

Snapshot-bound input/model/explanation audit in both Python and browser, per-eye snapshot and model hashes, stale-response rejection, source dirty/reset invalidation, and explicit change-direction labels in explanations and reports. Numerical corneal viewer after all calculator results, strict sample/units/frame contract, supported-data-only mesh, supplied-only overlays, manual case/eye/visit confirmation, and a separate synthetic demonstration. Local CSV-to-schema converter and regression tests.

### Deliberately not restored or added

No false assurance of clinical stability or reliability percentage. No fictitious patient geometry from A/B/C/Kmax/BAD-D/ARTmax or screenshot colors. No inferred posterior layer, guessed reference surface, fabricated missing values, smoothing across gaps, or undocumented score adjustment.

### Unchanged

v3 model registry, baseline and longitudinal JSON models, and inference implementation. No new training, calibration, age adjustment, cohort validation, or clinical-performance claim.

### Known verification limits

The actual Streamlit runtime/Cloud deployment, external OCR asset initialization and OCR accuracy on real reports, and real device-export compatibility were not run in this build environment. Component tests used actual Chromium/Python inference with simulated message transport. See `docs/TEST_REPORT.md`.

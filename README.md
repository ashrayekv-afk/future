# NKPI 6.0 — Treatment benefit preview

Complete GitHub / Streamlit update based on **5.0.0-numerical-maps**.
The new **Treatment benefit** workspace replaces the old 3D viewer in the same
place. The existing calculator, frozen model artifacts, import workflow,
source-report gallery, score explanations, numerical exports and PDF reports
are retained.

## What is included

- **Entered measurements:** OD / OS, baseline or two visits, all six scalar
  measurements and verified later-minus-first differences. Values update from
  the existing calculator; there is no second upload.
- **Simulated treatment comparison:** CXL now versus surveillance with rescue
  CXL, with baseline-only and follow-up scenarios, 6/12/24-month horizons,
  interactive risk curves, absolute differences in percentage points,
  illustrative ranges and two fictional examples.
- **An uncertain example:** a benefit range spanning zero is explicitly described
  as inconclusive. No treatment recommendation is produced.
- Responsive layout, keyboard-accessible controls, local SVG charts, no new
  network dependency, and reset/verification handling for each patient.

**This release implements the interface, not a trained treatment-benefit model.**
Real patient measurements do not generate risk curves or CXL benefit estimates.
The comparison is available only after selecting **Explore simulated example**.
All example measurements, risks and ranges are handcrafted, not calibrated
predictions or confidence intervals. Actual patient-specific estimation requires
longitudinal treatment/outcome data, model fitting and independent validation.
The existing NKPI index is not repurposed as a treatment-effect estimate.

## Install

1. Extract the release ZIP.
2. Upload the extracted contents to the repository root, replacing matching files
   and retaining the folder structure. Do not upload the ZIP as the app itself.
3. Keep **`kcn_dual_calculator_app.py`** as the Streamlit main file.
4. Reboot the Streamlit app, then reload the browser.
5. Confirm **6.0.0-treatment-benefit-preview** in the calculator footer.
6. At the former 3D location, select **Treatment benefit · preview**.
   Enter/import measurements above, or open the clearly labelled simulated example.

No additional Python dependency is required. Existing files in `components/cornea`
remain for compatibility with the source gallery and historical tools; the main
website no longer embeds the 3D viewer.

## Try the design without deploying

Open **`TREATMENT_BENEFIT_DEMO.html`** in a browser. It is a standalone fictional
example, needs no internet connection and has no link to actual patient inputs.
The embedded Streamlit panel defaults to entered-measurement context instead.

## Local verification

```bash
python tools/verify_package.py
node tests/test_benefit.cjs
node tests/test_benefit_ui.cjs
node tests/test_auto_import_merge.cjs
```

The UI test uses a mock DOM/message harness. See
[the verification report](docs/TEST_REPORT.md) for the completed checks and their
limits. Full browser/Streamlit deployment testing was not available in this build
environment. Clinical validity is not established by software tests.

See [implementation and model boundary](docs/TREATMENT_BENEFIT.md) and
[update instructions](UPDATE_INSTRUCTIONS.md). Older map documents are historical;
they do not describe the new default workspace. No patient reports are packaged.

> Historical release notes. Current behavior is described in [NUMERICAL_MAPS.md](NUMERICAL_MAPS.md) and the root README.

> Historical verification of 4.6.0, the source package for this release.
> Current UI and map recognition changes are documented in `SIMPLE_MAPS.md`.

# Combined release · 4.6.0-combined

This complete package merges:

- `NKPI_Auto_DICOM_Import_GitHub.zip` — automatic title/printed-eye identification
  for decoded report pages, before the existing extraction workflow.
- `NKPI_v4_5_0_GitHub.zip` — corrected thickness-map routing and the existing-eye
  Baseline / Latest / Change viewer.

Both descended from the 4.4.0 lean package. A three-way comparison found separate
runtime feature edits. Shared changes were confined to README, changelog and UI
version; these were reconciled into this release. The file inventory was rebuilt.

## Preserved code

All 13 files in `components/cornea/` are byte-for-byte identical to the map
release. All 15 files in `components/extractor/` match the DICOM release, except
that the diagnostic release string now reads `4.6.0-combined`. The same-ZIP
numerical schema additions, converter options and source association are retained.

Both frozen model artifacts and their registry, scoring, report generation,
ranked audit, app/viewer bridge, main Streamlit entry point and Python requirements
are unchanged from both source packages. `nkpi/service.py` changes only UI_VERSION.

## Verification performed on this merged package

- 33 map routing and numerical comparison checks passed.
- 22 surface-contract and 10 reference-map unit checks passed.
- 12 viewer scenarios passed using a mock DOM, native Canvas pixels and the
  production software eye renderer. These include distinct thickness/elevation
  crops, visit changes, stale-image cancellation and reset.
- 6 automatic-import merge checks passed using production routing and title
  classification with simulated decoded pages, OCR results and extraction.
  They exercise automatic OD/OS routing, original source path retention,
  known JPEG naming, explicit fallback, manual override and obsolete scan rejection.
- Syntax checks passed for 8 Python and 27 JavaScript files.
- All 35 local HTML resource references resolve.
- Source-package byte comparisons, rebuilt file inventory, ZIP CRC and
  archive round-trip contents checks passed.

These are software regression checks, not real-report OCR, real DICOM decoding,
live Streamlit/WebGL testing or clinical validation. Neither source package's
format/decoder limitations are broadened by the merge. Source review and
measurement confirmation remain necessary, including patient, eye and visit order.

Change still needs paired registered numerical maps; elevation also needs a
common fixed reference. DICOM report-image decoding does not itself supply these
numerical grids. Image-only reports retain Baseline / Latest map viewing.

## Deploy

Extract `NKPI_Combined_DICOM_3D_GitHub.zip` and upload its contents, preserving
folders and replacing matching files. The archive contains 67 files. Use this
combined package alone rather than uploading both earlier versions over each
other. Keep `kcn_dual_calculator_app.py` as the Streamlit main file. After reload,
confirm footer `4.6.0-combined`, reimport the report and verify its measurements.

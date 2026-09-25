> Historical release notes. Current behavior is described in [NUMERICAL_MAPS.md](NUMERICAL_MAPS.md) and the root README.

> Current release: 4.8.1 adds a report-only **visual** Change mode. See [VISUAL_CHANGE.md](VISUAL_CHANGE.md). The numerical-data requirements below still apply to calculated difference maps.

# Simplified automatic map viewer · 4.7.0

## Problem reproduced

The supplied screenshot showed two detected circles labelled Map 1 and Map 2,
while the named Curvature button displayed “could not be identified.” The former
code required an aspect ratio near 1200/838 and map centers near fixed positions.
A resized, padded or otherwise repositioned report could pass circle detection
but fail map naming. Manual map numbers worked because they bypassed the naming
step. The screenshot did not contain the original report pixels or archive, so
its exact source report could not be tested directly.

## Current behavior

The viewer has exactly seven buttons: Baseline, Latest, Change, Curvature,
Elevation, Posterior elevation and Thickness. No source/report/map-number,
coordinate-sample or display-mode dropdowns remain. Camera presets, crop tools,
review-pin controls, cutaway/grid/opacity and linked-visit selectors have been
removed from this viewer. Drag rotation and wheel zoom remain. The generic eye
renderer itself is unchanged. Enabled OD/OS eyes are shown automatically; a
missing visit for one eye never reuses its baseline or the other eye's data.

Named buttons automatically search the associated pages of that selected eye
and visit, prioritizing its known Topometric or Belin page. Map identity is based
on source-page type and map layout/title, never on a color's implied clinical value.
No map type changes the underlying reference-eye shape.

## Automatic identity

- Topometric/KC-Staging: identify the two horizontally aligned, similarly sized
  map circles as anterior (left) and posterior (right), independent of absolute
  page position or aspect ratio.
- Belin: identify repeated elevation columns/rows and the isolated upper-right
  thickness circle. Multiple layout anchors must agree. Missing unrelated
  circles and reordered detections do not shift the requested role to another map.
- Other/unresolved circles: the existing browser OCR worker reads the printed
  caption above each map during import. Curvature requires a front/back caption;
  elevation requires anterior/front or posterior/back; pachymetry/thickness has
  its own title. Low-confidence, conflicting, exclusion/enhanced-reference and
  reference-difference titles are not assigned to the ordinary map buttons.
- Only normalized crop geometry and enumerated roles pass between frames.
  Raw OCR title strings are not stored or posted. The gallery and viewer validate
  the metadata, and the viewer matches hints back to the same detected circle.
  Ambiguous duplicate roles on one page do not select an arbitrary circle.

Known layouts remain usable when title OCR is unavailable. Unknown layouts with
unreadable or unsupported titles remain unavailable; there is no numbered-map
fallback in this viewer. Actual source images are required to add/test further
layout-specific support. This release does not claim every Pentacam layout is
recognized or that OCR establishes patient identity.

The per-eye generation guard cancels obsolete image results after a newer map,
visit, source or session selection. Every new selection clears the old texture
before loading. Disabled eyes and resets clear displayed textures and legends.

## Numerical Change

The existing `visit_comparison.js` and surface schema are unchanged. Change is
latest minus baseline on matching registered numeric grids for the same eye.
Both sources must be confirmed, map definitions must match and elevation must
use the same fixed reference. Source screenshots alone do not produce a Change
map. Its zero-centered legend is shown automatically, with no extra controls.
Missing samples stay empty. There is no automatic progression classification.

The old numerical-only viewer files remain in the package as supporting code,
but measured-surface mode is not an option in this simplified reference-eye UI.
Source-linked manual review-pin files are likewise retained without UI controls.

## Checks run on this release

- 33 map selection / numerical comparison tests passed, including signed changes,
  eye/visit matching, missing data and common-reference requirements.
- 20 additional automatic identification / metadata tests passed: padded/scaled
  layouts, all four title roles, low-confidence and conflicting titles, duplicate
  roles, invalid hints, forwarding the existing OCR worker through the same-ZIP
  numerical wrapper and preserving identities through the gallery sanitizer.
- 10 reference-eye/map unit checks and 22 numerical schema checks passed.
- 6 automatic DICOM import routing regression checks passed with simulated
  decoded pages and OCR results.
- 12 simplified-viewer scenarios passed using production JS in a mock DOM with
  native Canvas pixels and the actual software eye renderer. Synthetic source
  pages were resized/padded to 1440×1200. Each named map button was checked
  against a distinct expected RGB value from its source circle, as well as
  visit retention, both eyes, missing visits/maps, Change, source revocation,
  out-of-order image loads and patient reset. Exactly seven buttons and zero
  dropdowns were asserted from the actual HTML.
- Python/JavaScript syntax, local HTML resources, frozen-file comparisons,
  archive integrity and the distributed file inventory were checked.

The tests used synthetic software fixtures. Live browser/Streamlit transport,
accelerated WebGL, recognition of real printed captions, and this user's original
report archive were not validated in this environment. No clinical validation
or blanket import/recognition guarantee is claimed. Source measurement review
and the inherited DICOM decoder limitations remain in effect.

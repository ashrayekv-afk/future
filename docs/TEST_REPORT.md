# Verification — 6.0.0-treatment-benefit-preview

## Completed checks

- Numeric contract tests: correct later-minus-first arithmetic, missing versus
  zero, invalid numeric types/ranges, source verification, dirty sources, visit
  interval, baseline-only isolation, invalid eye/duplicate eye rejection and
  removal of unexpected identity/score fields.
- Actual parent context builder and dispatch executed in a JavaScript harness;
  the message contains the selected eye/visits and numeric context, no score or
  source report images. The main iframe points to the new panel.
- Production child JavaScript executed in a mock DOM/message environment:
  all 12 case/information/horizon combinations, displayed arithmetic, isolated
  fictional history, OD/OS switching, baseline-only fields, foreign sender/origin
  rejection, outdated revision rejection, malformed context clearing, source
  verification revocation, patient reset and return to measurement context.
- Chart controls: uncertainty toggle, line toggles with at least one retained,
  keyboard range input, pointer inspection and responsive SVG dimensions at
  650 and 280 pixels. Both exact chart SVGs were rasterized and inspected.
- 91 retained checks passed across surface contracts, map routing/comparison,
  map identification, automatic source-map handling and simulated import merge.
- 17 calculator payloads compared with the previous release: baseline/two-visit,
  OD/OS, three ages, missing/invalid inputs, verification/treatment holds and a
  bilateral case. Scores, explanations, warnings, hashes and audits matched
  exactly after excluding the interface version field. PDF generation verified
  in both versions.
- Original scoring/model/import/gallery/export implementation files compared
  byte-for-byte. Only the parent iframe/context integration and the service's UI
  version changed in existing runtime files. New benefit assets are isolated.
- JavaScript syntax checks and complete package SHA-256 manifest verification.

## Reproducible new checks

```bash
node tests/test_benefit.cjs
node tests/test_benefit_ui.cjs
python tools/verify_package.py
```

Pass an output directory as the optional argument to `test_benefit_ui.cjs` to
write synthetic wide/narrow chart SVGs for inspection. No patient values are
written to these files. Retained map tests requiring the private baseline/followup
report ZIPs were not rerun for this replacement-panel change; those source-image
fixtures are not included in the distribution.

## Limits

No full browser/Streamlit end-to-end run or live deployment was performed in this
build environment. DOM tests do not verify final browser typography, iframe
layout or all device interactions. Reboot and reload after updating, then check
the new panel and existing import/results flow in your deployment.

These tests validate software behavior only. The treatment-benefit examples are
handcrafted, not trained, calibrated or externally validated. There is no real
patient treatment-effect estimator in this release.

The previous version's numerical-map verification is retained in the existing
map-method documents as historical background; this release replaces that viewer
rather than revalidating its image-derived surfaces.

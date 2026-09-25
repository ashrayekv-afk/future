# Update to 6.0.0-treatment-benefit-preview

1. Extract **NKPI_Treatment_Benefit_v6_0_GitHub.zip**.
2. Upload all extracted contents to the existing repository root, replacing
   matching files. Preserve every folder, including the new `components/benefit`.
3. Keep `kcn_dual_calculator_app.py` as the Streamlit main file. Requirements are
   unchanged. Reboot/redeploy the app and reload the browser.
4. Confirm **6.0.0-treatment-benefit-preview** in the calculator footer.
5. The section formerly containing the 3D model now opens **Treatment benefit ·
   preview**. The adjacent **Imported report maps · 2D** tab is retained.
6. Import/verify values as before. The panel's entered-measurement view should
   reflect the selected eye and visit mode. It shows no patient benefit estimate.
7. Select **Explore simulated example** to use the interactive comparison.
   Try cases A/B, baseline/follow-up, and 6/12/24-month horizons.
8. Use **Next patient / clear** before another patient. Both entered context and
   active example selection reset; the source gallery and calculator clear as before.

The package is below GitHub's 100-file batch limit. Upload the complete package,
not a mixture of versions. Old 3D files remain in the package as compatibility
assets, but the new main iframe loads `components/benefit/index.html`.

For a preview without deploying, open `TREATMENT_BENEFIT_DEMO.html`. Its curves and
measurements are fictional and do not use the calculator's patient inputs.

This is a research interface release. It does not add trained patient-specific
CXL benefit predictions. The existing frozen NKPI calculation is unchanged.

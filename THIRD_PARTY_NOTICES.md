# Dependency and provenance notices

This package preserves application assets and frozen model artifacts from the previously generated NKPI releases and adds source-map integration, reference-eye rendering, numerical viewing and safety checks. Model release provenance and SHA-256 values are in `models/release.json`; historical verification is described in `docs/TEST_REPORT.md` (raw test logs are excluded from this lean deployment). No rights in clinical data, institutional branding, or model artifacts are newly granted by this notice.

Runtime Python dependencies are installed by `requirements.txt`: Streamlit 1.50.0 and ReportLab 4.4.9. Their installed distributions retain their upstream license and copyright notices. Development-only dependencies are omitted here; the original full archive contains `requirements-dev.txt`.

JSZip **3.10.1** is now bundled at `components/extractor/vendor/jszip-3.10.1.min.js`. Its upstream license notice is included in `components/extractor/vendor/JSZIP_LICENSE.txt`; use is under the MIT option. The bytes were copied from the installed JSZip 3.10.1 distribution, not rewritten.

Tesseract.js 7.0.0, its corresponding OCR worker/core and English language data remain external pinned dependencies.

New optional rendering dependencies load into the browser only when the relevant format is detected: Mozilla PDF.js (`pdfjs-dist` **5.4.624**, Apache-2.0), UTIF **3.1.0** (MIT) and its pako **1.0.11** dependency (MIT/Zlib). Those distributions are not included as local files. Exact asset URLs are in `components/extractor/archive_reader.js`. No patient file is POSTed to those hosts by the application; the requests obtain static decoder code. The DICOM report parser is application-specific code with deliberately restricted supported encodings.

No fonts are included in this distribution.

The viewer uses application-specific native WebGL, CPU ray rendering and Canvas mesh code. It does not use Plotly, Three.js, an image-generation service, or a downloaded font. No font files are included in this distribution.

Upstream references:

```text
https://streamlit.io/
https://docs.streamlit.io/
https://www.reportlab.com/
https://stuk.github.io/jszip/
https://github.com/naptha/tesseract.js
https://github.com/naptha/tesseract.js-core
https://mozilla.github.io/pdf.js/
https://github.com/photopea/UTIF.js
https://github.com/nodeca/pako
```

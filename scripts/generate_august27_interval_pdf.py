import os, subprocess, json

with open("tmp/clean_grid_reps.json", "r", encoding="utf-8") as f:
    reps = json.load(f)

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Interwał 10x 400m (27.08.2026)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 9px;
    color: #1e293b;
    background: #f8fafc;
    line-height: 1.3;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 12px 16px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #fc4c02;
    padding-bottom: 5px;
    margin-bottom: 8px;
  }
  .title {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .subtitle {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }
  .header-right {
    text-align: right;
    font-size: 8.5px;
    color: #64748b;
    line-height: 1.25;
  }
  .badge-orange {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #ffedd5;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 8px;
    display: inline-block;
  }
  .badge-purple {
    background: #faf5ff;
    color: #7e22ce;
    border: 1px solid #f3e8ff;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 8px;
    display: inline-block;
  }

  .section-title {
    font-size: 8.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 4px;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  .grid-metrics {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 6px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 7px;
  }
  .card-orange { background: #fff7ed; border-color: #ffedd5; }
  .card-green { background: #f0fdf4; border-color: #dcfce7; }
  .card-blue { background: #eff6ff; border-color: #dbeafe; }
  .card-purple { background: #faf5ff; border-color: #f3e8ff; }
  .card-red { background: #fef2f2; border-color: #fee2e2; }

  .card-label {
    font-size: 6.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748b;
    margin-bottom: 1px;
  }
  .card-value {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .card-sub {
    font-size: 7px;
    color: #64748b;
    margin-top: 1px;
  }

  .table-container {
    margin-bottom: 6px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
  }
  th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-align: left;
    padding: 3.5px 5px;
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid #e2e8f0;
  }
  td {
    padding: 3px 5px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  tr:last-child td { border-bottom: none; }
  tr.row-fast { background: #fff7ed; }
  tr.row-peak { background: #fef2f2; }
  tr:nth-child(even) { background: #f8fafc; }

  .hr-zones-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 6px;
  }
  .zone-box {
    border-radius: 4px;
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .zone-z1 { border-left: 3px solid #94a3b8; }
  .zone-z2 { border-left: 3px solid #3b82f6; }
  .zone-z3 { border-left: 3px solid #22c55e; }
  .zone-z4 { border-left: 3px solid #f59e0b; background: #fffbe6; }
  .zone-z5 { border-left: 3px solid #ef4444; background: #fff5f5; }
  
  .zone-title { font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .zone-time { font-size: 11px; font-weight: 800; color: #0f172a; margin: 1px 0; }
  .zone-pct { font-size: 7px; font-weight: 600; color: #475569; }

  .grid-insights {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    margin-bottom: 6px;
  }
  .insight-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 8px;
  }
  .insight-title {
    font-size: 8.5px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .insight-desc {
    font-size: 7.5px;
    color: #475569;
    line-height: 1.25;
  }

  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    margin-top: 6px;
    font-size: 7px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #fff; padding: 0; }
    .page { max-width: 100%; padding: 4mm 6mm; box-shadow: none; }
    @page { margin: 0; size: A4 portrait; }
  }
</style>
</head>
<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="title">🏃 RAPORT TRENINGOWY — INTERWAŁ 10x 400m</div>
      <div class="subtitle">Rozgrzewka do 1.0 km + 10x (400m Szybko / 400m Trucht) + Schłodzenie · Krosno</div>
    </div>
    <div class="header-right">
      <div class="badge-orange">GARMIN CONNECT API</div>
      <div class="badge-purple" style="margin-left:3px;">VO2MAX 45</div><br>
      <span style="font-weight:700; color:#0f172a;">27 Sierpnia 2026 r.</span> (20:01)<br>
      Jakub Soboń
    </div>
  </div>

  <!-- METRYKI GŁÓWNE -->
  <div class="section-title">1. KLUCZOWE METRYKI TRENINGU (9.44 KM TOTAL)</div>
  <div class="grid-metrics">
    <div class="card card-orange">
      <div class="card-label">Dystans Total</div>
      <div class="card-value">9.44 <span style="font-size:8px;">km</span></div>
      <div class="card-sub">Rozgrzewka: do 1.0 km</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Całkowity</div>
      <div class="card-value">1h 03m</div>
      <div class="card-sub">Moving: 1h 03m 48s</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Tętno śr / max</div>
      <div class="card-value" style="color:#dc2626;">160 / 196 <span style="font-size:8px;">bpm</span></div>
      <div class="card-sub">Z5 (>176): 17m 13s</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Wzrost VO2max</div>
      <div class="card-value" style="color:#7e22ce;">45.0 <span style="font-size:8px;">ml/kg</span></div>
      <div class="card-sub">Najszybsza: 3:50/km</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Kadencja / Kcal</div>
      <div class="card-value">188 <span style="font-size:8px;">spm</span></div>
      <div class="card-sub">687 kcal | Max 204 spm</div>
    </div>
  </div>

  <!-- TABELA: DOKŁADNE 10x 400M WG STRUKTURY -->
  <div class="section-title">2. SZCZEGÓŁOWA TABELA 10 POWTÓRZEŃ 400M (STRUKTURA CO 800 METRÓW)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:8%;">Seria</th>
          <th style="width:20%;">Odcinek na trasie</th>
          <th style="width:12%;">Dystans</th>
          <th style="width:12%;">Czas Serii</th>
          <th style="width:14%;">Tempo Średnie</th>
          <th style="width:18%;">Tętno (Śr / Max)</th>
          <th style="width:16%;">Kadencja Średnia</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f1f5f9;">
          <td><strong>ROZGRZ.</strong></td>
          <td><strong>0.0 – 1.0 km</strong></td>
          <td>1000 m</td>
          <td><strong>08:47</strong></td>
          <td><strong>8:46 min/km</strong></td>
          <td>144.7 / 169 bpm</td>
          <td>159 spm (Trucht/Marsz)</td>
        </tr>
"""

for r in reps:
    row_cls = ""
    if r["rep"] == 1:
        row_cls = "class='row-fast'"
    elif r["rep"] == 7:
        row_cls = "class='row-peak'"
    elif r["rep"] in [8, 10]:
        row_cls = "class='row-fast'"
        
    html_content += f"""
        <tr {row_cls}>
          <td><strong>Interwał #{r['rep']}</strong></td>
          <td><strong>{r['range_km']}</strong></td>
          <td>400.0 m</td>
          <td><strong>{r['dur_str']}</strong></td>
          <td><strong style="color:#ea580c;">{r['pace_str']} min/km</strong></td>
          <td>{r['avg_hr']} / <strong>{r['max_hr']} bpm</strong></td>
          <td><strong>{r['avg_cad']} spm</strong></td>
        </tr>
    """

html_content += """
        <tr style="background:#f1f5f9;">
          <td><strong>FINISZ</strong></td>
          <td><strong>9.0 – 9.44 km</strong></td>
          <td>440 m</td>
          <td><strong>03:43</strong></td>
          <td><strong>8:30 min/km</strong></td>
          <td>148.6 / 162 bpm</td>
          <td>143 spm (Schłodzenie)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ROZKŁAD STREF TĘTNA -->
  <div class="section-title">3. ROZKŁAD STREF TĘTNA (GARMIN HR ZONES)</div>
  <div class="hr-zones-grid">
    <div class="zone-box zone-z1"><div class="zone-title">Z1 (<118 bpm)</div><div class="zone-time">0:07 min</div><div class="zone-pct">0.1%</div></div>
    <div class="zone-box zone-z2"><div class="zone-title">Z2 (118-137)</div><div class="zone-time">8:40 min</div><div class="zone-pct">12.9%</div></div>
    <div class="zone-box zone-z3"><div class="zone-title">Z3 (137-157)</div><div class="zone-time">24:41 min</div><div class="zone-pct">36.8%</div></div>
    <div class="zone-box zone-z4"><div class="zone-title">Z4 (157-176)</div><div class="zone-time">16:22 min</div><div class="zone-pct" style="font-weight:700; color:#d97706;">24.4%</div></div>
    <div class="zone-box zone-z5"><div class="zone-title">Z5 (>176 bpm)</div><div class="zone-time" style="color:#dc2626;">17:13 min</div><div class="zone-pct" style="color:#dc2626; font-weight:800;">25.7% (Z5)</div></div>
  </div>

  <!-- WNIOSKI I REKOMENDACJE -->
  <div class="section-title">4. WNIOSKI FIZJOLOGICZNE & PODSUMOWANIE</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title">🚀 Pacing & Zrywy Prędkości (Seria #1: 3:50/km, Seria #8: 4:06/km)</div>
      <div class="insight-desc">
        Pierwsza seria na odcinku 1.0–1.4 km poszła w tempie <strong>3:50 min/km (czas 1:27)</strong>, a 8. seria (6.6–7.0 km) w tempie <strong>4:06 min/km (1:34)</strong>. Świadczy to o znakomitej dynamice i sile biegowej.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #dc2626;">
      <div class="insight-title">❤️ Szczyt Tętna 196 bpm (Seria #7 na 5.8–6.2 km)</div>
      <div class="insight-desc">
        W trakcie 7. serii na odcinku 5.8–6.2 km tętno osiągnęło **196 bpm**, co dało silną odpowiedź metaboliczną i zaowocowało wzrostem **VO2max do 45.0 ml/kg/min**.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #2563eb;">
      <div class="insight-title">🏃 Kadencja na Szybkich Odcinkach (183–194 spm)</div>
      <div class="insight-desc">
        Średnia kadencja na szybkich 400m wyniosła **183–194 spm** (peak 204 spm). Chroniło to mięsień czworogłowy przed przeciążeniem ekscentrycznym przy lądowaniu.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #7e22ce;">
      <div class="insight-title">🧪 Regeneracja po 687 kcal</div>
      <div class="insight-desc">
        Łącznie ponad 33 minuty w Z4 i Z5. Zalecane uzupełnienie 80-100g węglowodanów i elektrolitów przed snem dla pełnej odbudowy glikogenu.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Interwałowej Garmin Connect</span>
    <span>Wygenerowano: 27.08.2026 21:56 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_interwal_2026-08-27.html"
pdf_file = "tmp/pdfs/raport_interwal_2026-08-27.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_interwal_2026-08-27.pdf"

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Zapisano HTML: {html_file}")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={os.path.abspath(pdf_file)}",
    os.path.abspath(html_file)
]

print("Generowanie PDF przez Microsoft Edge...")
res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(pdf_file):
    import shutil
    shutil.copy(pdf_file, desktop_pdf)
    size_kb = os.path.getsize(desktop_pdf) / 1024
    print(f"SUKCES: Wygenerowano PDF: {pdf_file}")
    print(f"Skopiowano również na Pulpit: {desktop_pdf} ({size_kb:.1f} KB)")
else:
    print("BŁĄD: Nie udało się utworzyć pliku PDF")

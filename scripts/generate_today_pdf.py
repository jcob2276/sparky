import os, subprocess, json

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Jakub Soboń — 28.07.2026 (10 km + Praktyczna Analiza)</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;color:#1e293b;background:#f8fafc;line-height:1.3;}
  .page{max-width:840px;margin:0 auto;padding:14px 18px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
  
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #fc4c02;padding-bottom:6px;margin-bottom:10px;}
  .title{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;}
  .subtitle{font-size:10px;color:#64748b;margin-top:2px;font-weight:500;}
  .header-right{text-align:right;font-size:9.5px;color:#64748b;line-height:1.3;}
  .badge-orange{background:#fff7ed;color:#ea580c;border:1px solid #ffedd5;padding:2px 7px;border-radius:10px;font-weight:600;font-size:9px;display:inline-block;}

  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;display:flex;align-items:center;gap:6px;margin:10px 0 5px;}
  .section-title::after{content:'';flex:1;height:1px;background:#e2e8f0;}

  .grid-metrics{display:grid;grid-template-columns:repeat(5, 1fr);gap:5px;margin-bottom:6px;}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:5px 7px;}
  .card-highlight{background:#fff7ed;border-color:#ffedd5;}
  .card-green{background:#f0fdf4;border-color:#dcfce7;}
  .card-red{background:#fef2f2;border-color:#fee2e2;}
  .card-blue{background:#eff6ff;border-color:#dbeafe;}
  .card-purple{background:#faf5ff;border-color:#f3e8ff;}

  .card-label{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:1px;}
  .card-value{font-size:16px;font-weight:800;color:#0f172a;line-height:1.1;}
  .card-sub{font-size:8px;color:#64748b;margin-top:1px;}

  .table-container{margin-bottom:8px;border:1px solid #e2e8f0;border-radius:5px;overflow:hidden;}
  table{width:100%;border-collapse:collapse;font-size:9px;}
  th{background:#f1f5f9;color:#475569;font-weight:700;text-align:left;padding:4px 5px;font-size:8px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid #e2e8f0;}
  td{padding:4px 5px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:last-child td{border-bottom:none;}
  tr.row-fast{background:#fff7ed;}
  tr.row-slow{background:#ffffff;}
  tr.row-warmup{background:#f8fafc;}

  .tag{display:inline-block;padding:1px 4px;border-radius:3px;font-weight:700;font-size:8px;}
  .tag-fast{background:#ea580c;color:#ffffff;}
  .tag-slow{background:#22c55e;color:#ffffff;}
  .tag-warmup{background:#94a3b8;color:#ffffff;}

  .grid-insights{display:grid;grid-template-columns:repeat(3, 1fr);gap:5px;margin-bottom:6px;}
  .insight-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px 7px;}
  .insight-title{font-size:9px;font-weight:700;color:#0f172a;margin-bottom:2px;display:flex;align-items:center;gap:4px;}

  .footer{border-top:1px solid #e2e8f0;padding-top:5px;margin-top:8px;font-size:7.5px;color:#94a3b8;display:flex;justify-space-between;}

  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    body{background:#fff;padding:0;}
    .page{max-width:100%;padding:5mm 7mm;box-shadow:none;}
    @page{margin:0;size:A4 portrait;}
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="title">🏃 Raport Treningowy — Bieganie 10 km (28 Lipiec 2026)</div>
      <div class="subtitle">Jakub Soboń · Chorkówka · Wtorek 28.07.2026 · 18:42 · Garmin API + Oura Ring Biometrics</div>
    </div>
    <div class="header-right">
      <span class="badge-orange">GARMIN LIVE STREAM API</span>
      <div style="margin-top:2px;">Strefa HR: <strong>Z5: 25m08s | Z4: 22m54s</strong></div>
    </div>
  </div>

  <!-- MAIN METRICS GRID (5 COLUMNS) -->
  <div class="grid-metrics">
    <div class="card card-green">
      <div class="card-label">Dystans total</div>
      <div class="card-value" style="color:#15803d;">10.03 <span style="font-size:10px;font-weight:600;">km</span></div>
      <div class="card-sub">Czas: 60:40 (6:03/km)</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Tętno (HR avg/max)</div>
      <div class="card-value" style="color:#dc2626;">168 / 189 <span style="font-size:10px;font-weight:600;">bpm</span></div>
      <div class="card-sub">Min: 106 bpm (Z5: 41.4%)</div>
    </div>
    <div class="card card-highlight">
      <div class="card-label">Najszybszy Km & GAP</div>
      <div class="card-value" style="color:#c2410c;">5:23 <span style="font-size:10px;font-weight:600;">/km</span></div>
      <div class="card-sub">GAP na podbiegu: 5:25/km</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Przewyższenia (+/-)</div>
      <div class="card-value" style="color:#6b21a8;">+31 / -36 <span style="font-size:10px;font-weight:600;">m</span></div>
      <div class="card-sub">Wysokość: 267–285 m</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Oura Biometria</div>
      <div class="card-value" style="color:#1d4ed8;">67 <span style="font-size:10px;font-weight:600;">/100</span></div>
      <div class="card-sub">Sen: 7h 43m (Score 79)</div>
    </div>
  </div>

  <!-- SECONDARY METRICS GRID (5 COLUMNS) -->
  <div class="grid-metrics">
    <div class="card">
      <div class="card-label">Kadencja avg / max</div>
      <div class="card-value" style="font-size:14px;">165 / 180 <span style="font-size:9px;font-weight:500;">spm</span></div>
      <div class="card-sub">Finisz: 173 spm</div>
    </div>
    <div class="card">
      <div class="card-label">Długość Kroku</div>
      <div class="card-value" style="font-size:14px;">1.00 <span style="font-size:9px;font-weight:500;">m</span></div>
      <div class="card-sub">Max na Km 8: 1.10 m</div>
    </div>
    <div class="card">
      <div class="card-label">Dryf Kardio</div>
      <div class="card-value" style="font-size:14px;color:#166534;">+1.1%</div>
      <div class="card-sub">Doskonała odporność</div>
    </div>
    <div class="card">
      <div class="card-label">Garmin TE (Aerob / An)</div>
      <div class="card-value" style="font-size:14px;">3.8 / 2.6</div>
      <div class="card-sub">Regeneracja: 38–42h</div>
    </div>
    <div class="card">
      <div class="card-label">Spalone Kalorie</div>
      <div class="card-value" style="font-size:14px;">724 <span style="font-size:9px;font-weight:500;">kcal</span></div>
      <div class="card-sub">Active: 638 / BMR: 86</div>
    </div>
  </div>

  <!-- KM BREAKDOWN TABLE FOR TODAY (FULL METRICS + GAP) -->
  <div class="section-title">Tabela 10 Kilometrów z Przewyższeniami i Biomechaniką (Prawdziwe Dane z 28.07.2026)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:24px;">Km</th>
          <th style="width:105px;">Typ Odcinka</th>
          <th style="width:45px;">Czas</th>
          <th style="width:52px;">Tempo</th>
          <th style="width:52px;">GAP</th>
          <th style="width:82px;text-align:center;">HR (Min-Śr-Max)</th>
          <th style="width:60px;text-align:center;">Kad (Śr/Max)</th>
          <th style="width:50px;text-align:right;">Krok</th>
          <th style="width:55px;text-align:right;">Przew. (+)</th>
          <th style="width:55px;text-align:right;">Spadek (-)</th>
          <th style="width:60px;text-align:right;">Wysokość</th>
        </tr>
      </thead>
      <tbody>
        <tr class="row-warmup">
          <td><strong>1</strong></td>
          <td><span class="tag tag-warmup">Rozgrzewka</span></td>
          <td>7:01</td>
          <td><strong>6:53/km</strong></td>
          <td>6:44/km</td>
          <td style="text-align:center;">106 - <strong>143</strong> - 154</td>
          <td style="text-align:center;">164 / 172</td>
          <td style="text-align:right;">0.88 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+10.8 m</td>
          <td style="text-align:right;color:#dc2626;">-11.2 m</td>
          <td style="text-align:right;">279-283 m</td>
        </tr>
        <tr class="row-slow">
          <td><strong>2</strong></td>
          <td><span class="tag tag-slow">Bieg Tlenowy</span></td>
          <td>6:51</td>
          <td><strong>6:59/km</strong></td>
          <td>6:52/km</td>
          <td style="text-align:center;">136 - <strong>151</strong> - 160</td>
          <td style="text-align:center;">159 / 170</td>
          <td style="text-align:right;">0.90 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+7.6 m</td>
          <td style="text-align:right;color:#dc2626;">-10.6 m</td>
          <td style="text-align:right;">277-282 m</td>
        </tr>
        <tr class="row-slow">
          <td><strong>3</strong></td>
          <td><span class="tag tag-slow">Przyspieszenie</span></td>
          <td>6:22</td>
          <td><strong>6:24/km</strong></td>
          <td>6:18/km</td>
          <td style="text-align:center;">155 - <strong>165</strong> - 171</td>
          <td style="text-align:center;">166 / 173</td>
          <td style="text-align:right;">0.94 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+12.0 m</td>
          <td style="text-align:right;color:#dc2626;">-14.2 m</td>
          <td style="text-align:right;">274-280 m</td>
        </tr>
        <tr class="row-fast">
          <td><strong>4</strong></td>
          <td><span class="tag tag-fast">Bieg Progowy</span></td>
          <td>6:05</td>
          <td><strong style="color:#ea580c;">6:03/km</strong></td>
          <td>5:53/km</td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">162 - <strong>172</strong> - 178</td>
          <td style="text-align:center;">167 / 177</td>
          <td style="text-align:right;">0.99 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+14.0 m</td>
          <td style="text-align:right;color:#dc2626;">-9.0 m</td>
          <td style="text-align:right;">276-285 m</td>
        </tr>
        <tr class="row-fast">
          <td><strong>5</strong></td>
          <td><span class="tag tag-fast">Mocny Akcent</span></td>
          <td>5:34</td>
          <td><strong style="color:#ea580c;">5:40/km</strong></td>
          <td>5:38/km</td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">134 - <strong>171</strong> - 181</td>
          <td style="text-align:center;">170 / 180</td>
          <td style="text-align:right;">1.04 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+14.0 m</td>
          <td style="text-align:right;color:#dc2626;">-15.6 m</td>
          <td style="text-align:right;">278-283 m</td>
        </tr>
        <tr class="row-fast">
          <td><strong>6</strong></td>
          <td><span class="tag tag-fast">Mocny Akcent</span></td>
          <td>5:32</td>
          <td><strong style="color:#ea580c;">5:37/km</strong></td>
          <td>5:52/km</td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">170 - <strong>175</strong> - 181</td>
          <td style="text-align:center;">170 / 175</td>
          <td style="text-align:right;">1.04 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+9.6 m</td>
          <td style="text-align:right;color:#dc2626;">-21.8 m</td>
          <td style="text-align:right;">267-279 m</td>
        </tr>
        <tr class="row-slow">
          <td><strong>7</strong></td>
          <td><span class="tag tag-slow">Utrzymanie</span></td>
          <td>6:00</td>
          <td><strong>5:59/km</strong></td>
          <td><strong style="color:#ea580c;">5:25/km</strong></td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">161 - <strong>175</strong> - 184</td>
          <td style="text-align:center;">167 / 180</td>
          <td style="text-align:right;">1.00 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+20.6 m</td>
          <td style="text-align:right;color:#dc2626;">-7.0 m</td>
          <td style="text-align:right;">267-281 m</td>
        </tr>
        <tr class="row-fast" style="background:#ffedd5;">
          <td><strong>8</strong></td>
          <td><span class="tag tag-fast" style="background:#c2410c;">Szybki Akcent (Max HR) 🔥</span></td>
          <td>5:17</td>
          <td><strong style="color:#c2410c;">5:25/km</strong></td>
          <td>5:20/km</td>
          <td style="text-align:center;font-weight:800;color:#b91c1c;">176 - <strong>183</strong> - 189</td>
          <td style="text-align:center;">168 / 177</td>
          <td style="text-align:right;font-weight:700;">1.10 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+13.8 m</td>
          <td style="text-align:right;color:#dc2626;">-11.6 m</td>
          <td style="text-align:right;">277-283 m</td>
        </tr>
        <tr class="row-slow">
          <td><strong>9</strong></td>
          <td><span class="tag tag-slow">Utrzymanie Tempa</span></td>
          <td>6:01</td>
          <td><strong>6:07/km</strong></td>
          <td>6:00/km</td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">159 - <strong>174</strong> - 181</td>
          <td style="text-align:center;">167 / 177</td>
          <td style="text-align:right;">0.98 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+15.0 m</td>
          <td style="text-align:right;color:#dc2626;">-17.0 m</td>
          <td style="text-align:right;">277-285 m</td>
        </tr>
        <tr class="row-fast" style="background:#ffedd5;">
          <td><strong>10</strong></td>
          <td><span class="tag tag-fast" style="background:#b91c1c;">Najszybszy Km (Finisz) ⚡</span></td>
          <td>5:11</td>
          <td><strong style="color:#b91c1c;">5:23/km</strong></td>
          <td>5:17/km</td>
          <td style="text-align:center;font-weight:700;color:#dc2626;">171 - <strong>178</strong> - 181</td>
          <td style="text-align:center;font-weight:700;">173 / 177</td>
          <td style="text-align:right;font-weight:700;">1.07 m</td>
          <td style="text-align:right;color:#166534;font-weight:600;">+8.8 m</td>
          <td style="text-align:right;color:#dc2626;">-14.0 m</td>
          <td style="text-align:right;">277-284 m</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PRACTICAL INSIGHTS (CLEAN HTML TAGS ONLY!) -->
  <div class="section-title">Praktyczne Wnioski Treningowe i Fizjologiczne</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title"><span style="color:#ea580c;">⛰️</span> GAP – Tempo na Podbiegach</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Na Km 7 podbieg <strong>+20.6m</strong> spowolnił tempo zegarkowe do 5:59/km, ale wygenerowana moc odpowiadała tempu <strong>GAP 5:25/km</strong> na płaskim!
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #166534;">
      <div class="insight-title"><span style="color:#166534;">🫀</span> Dryf Kardio (+1.1%)</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Minimalny dryf tętna <strong>+1.1%</strong> (poniżej normy 5%) dowodzi świetnej odporności tlenowej – brak przegrzania i stabilna objętość wyrzutowa serca.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #3b82f6;">
      <div class="insight-title"><span style="color:#3b82f6;">🏃</span> Biomechanika Wahadła (+25%)</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Wzrost długości kroku z <strong>0.88m do 1.10m</strong> nastąpił dzięki mocniejszemu odepchnięciu z pośladka, a nie drobiącemu przyspieszeniu kadencji.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #6b21a8;">
      <div class="insight-title"><span style="color:#6b21a8;">⏳</span> Garmin TE (3.8 / 2.6) & Regeneracja</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Wysoki TE tlenowy (3.8) i beztlenowy (2.6). Sugerowany czas regeneracji to <strong>38–42 godziny</strong> – kolejny akcent najwcześniej w czwartek po południu.
      </div>
    </div>
    <div class="insight-box" style="border-left:3.5px solid #dc2626;">
      <div class="insight-title"><span style="color:#dc2626;">🧪</span> Okno Glikogenowe (140g)</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Zużycie glikogenu w Z5/Z4 wyniosło ok. <strong>140g</strong>. Zjedzenie posiłku z 80g węglowodanów i 30g białka przed 22:00 drastycznie poprawi HRV Oura.
      </div>
    </div>
    <div class="insight-box" style="border-left:3.5px solid #1d4ed8;">
      <div class="insight-title"><span style="color:#1d4ed8;">💍</span> Oura Readiness (67/100)</div>
      <div style="font-size:8.5px;color:#475569;line-height:1.3;">
        Sen: <strong>7h 43m</strong> (Score 79). Wskaźnik ACWR rano wynoszący <strong>0.79</strong> dał idealną przestrzeń pod dzisiejszy bodziec treningowy.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>Vanguard OS · Wygenerowano z Garmin Connect API (Activity ID: 23766461206)</div>
    <div>Stream per-sekunda: 725 próbek · 28.07.2026 18:42</div>
  </div>

</div>
</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_interwal_2026-07-28.html"
pdf_file = "tmp/pdfs/raport_interwal_2026-07-28.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_interwal_2026-07-28.pdf"

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Saved HTML to {html_file}")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={os.path.abspath(pdf_file)}",
    os.path.abspath(html_file)
]

print("Converting HTML to PDF via Microsoft Edge...")
res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(pdf_file):
    import shutil
    shutil.copy(pdf_file, desktop_pdf)
    size_kb = os.path.getsize(desktop_pdf) / 1024
    print(f"SUCCESS: Rebuilt PDF with clean HTML tags on Desktop: {desktop_pdf} ({size_kb:.1f} KB)")
else:
    print("FAILED to create PDF")

import os, subprocess, json

# Load parsed splits
with open("tmp/today_km_splits_parsed.json", "r", encoding="utf-8") as f:
    splits = json.load(f)

# Load summary
with open("tmp/garmin_today_summary.json", "r", encoding="utf-8") as f:
    summary = json.load(f)

# Load HR zones
with open("tmp/garmin_today_zones.json", "r", encoding="utf-8") as f:
    zones = json.load(f)

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Bieganie 10 km (10.08.2026)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 10px;
    color: #1e293b;
    background: #f8fafc;
    line-height: 1.35;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 16px 20px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #fc4c02;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .subtitle {
    font-size: 10.5px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }
  .header-right {
    text-align: right;
    font-size: 9.5px;
    color: #64748b;
    line-height: 1.3;
  }
  .badge-orange {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #ffedd5;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 9px;
    display: inline-block;
  }
  .badge-red {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fee2e2;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 9px;
    display: inline-block;
  }

  .section-title {
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 12px 0 6px;
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
    gap: 6px;
    margin-bottom: 10px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 9px;
  }
  .card-orange { background: #fff7ed; border-color: #ffedd5; }
  .card-green { background: #f0fdf4; border-color: #dcfce7; }
  .card-blue { background: #eff6ff; border-color: #dbeafe; }
  .card-purple { background: #faf5ff; border-color: #f3e8ff; }
  .card-red { background: #fef2f2; border-color: #fee2e2; }

  .card-label {
    font-size: 7.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748b;
    margin-bottom: 2px;
  }
  .card-value {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .card-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 2px;
  }

  .table-container {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-align: left;
    padding: 5px 7px;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid #e2e8f0;
  }
  td {
    padding: 5px 7px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  tr:last-child td { border-bottom: none; }
  tr.row-fast { background: #fff7ed; }
  tr.row-peak { background: #fef2f2; }
  tr.row-slow { background: #ffffff; }

  .hr-zones-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .zone-box {
    border-radius: 6px;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .zone-z1 { border-left: 4px solid #94a3b8; }
  .zone-z2 { border-left: 4px solid #3b82f6; }
  .zone-z3 { border-left: 4px solid #22c55e; }
  .zone-z4 { border-left: 4px solid #f59e0b; }
  .zone-z5 { border-left: 4px solid #ef4444; background: #fff5f5; }
  
  .zone-title { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .zone-time { font-size: 13px; font-weight: 800; color: #0f172a; margin: 2px 0 1px; }
  .zone-pct { font-size: 8px; font-weight: 600; color: #475569; }

  .grid-insights {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .insight-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .insight-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 3px;
  }
  .insight-desc {
    font-size: 8.5px;
    color: #475569;
    line-height: 1.35;
  }

  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 10px;
    font-size: 8px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #fff; padding: 0; }
    .page { max-width: 100%; padding: 6mm 8mm; box-shadow: none; }
    @page { margin: 0; size: A4 portrait; }
  }
</style>
</head>
<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="title">🏃 RAPORT TRENINGOWY — BIEGANIE 10 KM 🏆 (PR)</div>
      <div class="subtitle">Wysoki Akcent Biegowy · Rekord Osobisty (56:11) · Krosno</div>
    </div>
    <div class="header-right">
      <div class="badge-orange">GARMIN CONNECT API</div>
      <div class="badge-red" style="margin-left:4px;">REKORD (PR)</div><br>
      <span style="font-weight:700; color:#0f172a;">10 Sierpnia 2026 r.</span> (18:59)<br>
      Jakub Soboń
    </div>
  </div>

  <!-- METRYKI GLOWNE -->
  <div class="section-title">1. KLUCZOWE METRYKI DZISIEJSZEGO BIEGU (10.08.2026)</div>
  <div class="grid-metrics">
    <div class="card card-orange">
      <div class="card-label">Dystans Total</div>
      <div class="card-value">10.01 <span style="font-size:10px;">km</span></div>
      <div class="card-sub">Trasa: Krosno</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Trwania</div>
      <div class="card-value">56:11 <span style="font-size:10px;">min</span></div>
      <div class="card-sub">Tempo: 5:37 min/km</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Średnie Tętno</div>
      <div class="card-value" style="color:#dc2626;">180 <span style="font-size:10px;">bpm</span></div>
      <div class="card-sub">Max HR: 189 bpm</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Kadencja / Krok</div>
      <div class="card-value">164 <span style="font-size:10px;">spm</span></div>
      <div class="card-sub">Krok: 1.08 m | Max 185</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Kalorie / Elev</div>
      <div class="card-value">739 <span style="font-size:10px;">kcal</span></div>
      <div class="card-sub">+36.3m / -35.2m</div>
    </div>
  </div>

  <!-- PODZIAŁ NA KILOMETRY -->
  <div class="section-title">2. SZCZEGÓŁOWY PODZIAŁ NA KILOMETRY (1 KM SPLITS Z GARMIN STREAM)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:8%;">Km</th>
          <th style="width:14%;">Czas Odcinka</th>
          <th style="width:14%;">Tempo Średnie</th>
          <th style="width:20%;">Tętno (Min - Śr - Max)</th>
          <th style="width:16%;">Kadencja (Śr / Max)</th>
          <th style="width:14%;">Przewyższenie</th>
          <th style="width:14%;">Charakterystyka</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>KM 1</strong></td>
          <td>05:34</td>
          <td><strong>5:31 min/km</strong></td>
          <td>101 - <strong>163.8</strong> - 178</td>
          <td>170 spm (max 178)</td>
          <td>+12.6m / -10.6m</td>
          <td>Wejście w bieg / Rozgrzewka</td>
        </tr>
        <tr class="row-fast">
          <td><strong>KM 2</strong></td>
          <td>05:06</td>
          <td><strong style="color:#ea580c;">5:06 min/km</strong></td>
          <td>177 - <strong>180.3</strong> - 182</td>
          <td>171 spm (max 176)</td>
          <td>+8.6m / -10.6m</td>
          <td>Najszybszy pełny kilometr 🔥</td>
        </tr>
        <tr>
          <td><strong>KM 3</strong></td>
          <td>05:36</td>
          <td><strong>5:35 min/km</strong></td>
          <td>169 - <strong>178.5</strong> - 185</td>
          <td>163 spm (max 176)</td>
          <td>+15.6m / -11.0m</td>
          <td>Utrzymanie tempa tlenowego</td>
        </tr>
        <tr>
          <td><strong>KM 4</strong></td>
          <td>05:56</td>
          <td><strong>5:57 min/km</strong></td>
          <td>144 - <strong>173.2</strong> - 185</td>
          <td>159 spm (max 180)</td>
          <td>+13.0m / -14.6m</td>
          <td>Lekki spadek dynamiki / Kontrola</td>
        </tr>
        <tr>
          <td><strong>KM 5</strong></td>
          <td>05:35</td>
          <td><strong>5:31 min/km</strong></td>
          <td>164 - <strong>181.4</strong> - 187</td>
          <td>164 spm (max 184)</td>
          <td>+12.4m / -18.2m</td>
          <td>Powrót na tempo 5:31 min/km (Z5)</td>
        </tr>
        <tr>
          <td><strong>KM 6</strong></td>
          <td>05:42</td>
          <td><strong>5:40 min/km</strong></td>
          <td>175 - <strong>182.0</strong> - 187</td>
          <td>163 spm (max 176)</td>
          <td>+9.8m / -14.0m</td>
          <td>Stabilny mocny akcent</td>
        </tr>
        <tr style="background:#fff7ed;">
          <td><strong>KM 7</strong></td>
          <td>06:09</td>
          <td><strong>6:11 min/km</strong></td>
          <td>166 - <strong>178.2</strong> - 186</td>
          <td>160 spm (max 176)</td>
          <td>+18.6m / -9.2m</td>
          <td>Największe przewyższenie (+18.6m)</td>
        </tr>
        <tr class="row-fast">
          <td><strong>KM 8</strong></td>
          <td>05:19</td>
          <td><strong style="color:#ea580c;">5:19 min/km</strong></td>
          <td>178 - <strong>185.8</strong> - 188</td>
          <td>168 spm (max 174)</td>
          <td>+16.0m / -14.0m</td>
          <td>Potężne przyspieszenie po podbiegu</td>
        </tr>
        <tr>
          <td><strong>KM 9</strong></td>
          <td>05:54</td>
          <td><strong>5:52 min/km</strong></td>
          <td>176 - <strong>183.1</strong> - 187</td>
          <td>163 spm (max 178)</td>
          <td>+14.2m / -14.2m</td>
          <td>Przedfiniszowa mobilizacja</td>
        </tr>
        <tr class="row-peak">
          <td><strong>KM 10</strong></td>
          <td>05:18</td>
          <td><strong style="color:#b91c1c;">5:19 min/km</strong></td>
          <td>181 - <strong>185.7</strong> - 189</td>
          <td>158 spm (max 176)</td>
          <td>+9.8m / -12.6m</td>
          <td>Mocny finisz / Szczyt HR 189 bpm ⚡</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- STREFY TĘTNA -->
  <div class="section-title">3. ROZKŁAD STREF TĘTNA (GARMIN HR ZONES)</div>
  <div class="hr-zones-grid">
    <div class="zone-box zone-z1">
      <div class="zone-title">Z1 (<118 bpm)</div>
      <div class="zone-time">0:06 min</div>
      <div class="zone-pct">0.2% czasu</div>
    </div>
    <div class="zone-box zone-z2">
      <div class="zone-title">Z2 (118-137)</div>
      <div class="zone-time">0:10 min</div>
      <div class="zone-pct">0.3% czasu</div>
    </div>
    <div class="zone-box zone-z3">
      <div class="zone-title">Z3 (137-157)</div>
      <div class="zone-time">1:12 min</div>
      <div class="zone-pct">2.1% czasu</div>
    </div>
    <div class="zone-box zone-z4">
      <div class="zone-title">Z4 (157-176)</div>
      <div class="zone-time">9:04 min</div>
      <div class="zone-pct">16.1% czasu</div>
    </div>
    <div class="zone-box zone-z5">
      <div class="zone-title">Z5 (>176 bpm)</div>
      <div class="zone-time" style="color:#dc2626;">45:41 min</div>
      <div class="zone-pct" style="color:#dc2626; font-weight:800;">81.3% (DOMINUJĄCA)</div>
    </div>
  </div>

  <!-- WNIOSKI I FIZJOLOGIA -->
  <div class="section-title">4. ANALIZA FIZJOLOGICZNA I WNIOSKI TRENINGOWE</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #dc2626;">
      <div class="insight-title">🔥 Dominacja Strefy Beztlenowej (Z5 = 81.3%)</div>
      <div class="insight-desc">
        Bieg odbył się na wyjątkowo wysokiej intensywności metabolicznej (średnie HR 180 bpm, 81.3% w Z5). To dowód na ogromną determinację i otwarcie komory anaerobowej na dystansie 10 km.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title">📈 Strategia Pacingu i Finisz (KM 8 & KM 10)</div>
      <div class="insight-desc">
        Świetna rozkład sił na dystansie: po pokonaniu najtrudniejszego podbiegu na KM 7 (+18.6m, tempo 6:11/km), nastąpiło natychmiastowe przyspieszenie na KM 8 (5:19/km) oraz kapitalny finisz na KM 10 (5:19/km z max HR 189 bpm).
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #2563eb;">
      <div class="insight-title">⚡ Kadencja i Długość Kroku</div>
      <div class="insight-desc">
        Średnia kadencja 164 spm przy długości kroku 1.08 m zapewniała dobrą dynamikę poruszania się. Szczytowa kadencja sięgnęła 185 spm podczas zrywów prędkości.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #16a34a;">
      <div class="insight-title">🛠️ Sugestia Regeneracyjna i Żywieniowa</div>
      <div class="insight-desc">
        Tak głębokie wyczerpanie glikogenu i praca w Z5 wymaga 48h priorytetowej odbudowy tlenowej. Zalecane uzupełnienie węglowodanów i białka oraz spokojny bieg regeneracyjny (Z1/Z2) w kolejnych dniach.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Treningowej Garmin Connect</span>
    <span>Wygenerowano: 10.08.2026 22:37 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_bieganie_2026-08-10.html"
pdf_file = "tmp/pdfs/raport_bieganie_2026-08-10.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_bieganie_2026-08-10.pdf"

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

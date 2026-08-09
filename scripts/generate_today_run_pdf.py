import os, subprocess, json

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Bieganie Easy Run (03.08.2026)</title>
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
    max-width: 800px;
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
  .badge-blue {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #dbeafe;
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
  tr:nth-child(even) { background: #f8fafc; }

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
  .zone-z5 { border-left: 4px solid #ef4444; }
  
  .zone-title { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .zone-time { font-size: 13px; font-weight: 800; color: #0f172a; margin: 2px 0 1px; }
  .zone-pct { font-size: 8px; font-weight: 600; color: #475569; }

  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .comp-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .comp-title {
    font-size: 10px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

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
      <div class="title">🏃 RAPORT TRENINGOWY — EASY RUN</div>
      <div class="subtitle">Bieg Regeneracyjny (6.05 km) + Kontekst Długiego Wybiegania (25 km)</div>
    </div>
    <div class="header-right">
      <div class="badge-orange">GARMIN CONNECT</div><br>
      <span style="font-weight:700; color:#0f172a;">3 Sierpnia 2026 r.</span> (18:54)<br>
      Krosno, Polska
    </div>
  </div>

  <!-- METRYKI DZISIEJSZEGO BIEGU -->
  <div class="section-title">1. METRYKI DZISIEJSZEGO BIEGU (3 SIERPNIA 2026)</div>
  <div class="grid-metrics">
    <div class="card card-orange">
      <div class="card-label">Dystans</div>
      <div class="card-value">6.05 <span style="font-size:10px;">km</span></div>
      <div class="card-sub">Trasa: Krosno</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Trwania</div>
      <div class="card-value">45:05 <span style="font-size:10px;">min</span></div>
      <div class="card-sub">Moving: 44:23</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Średnie Tempo</div>
      <div class="card-value">7:27 <span style="font-size:10px;">/km</span></div>
      <div class="card-sub">Max: 4:24 min/km</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Średnie Tętno</div>
      <div class="card-value">153 <span style="font-size:10px;">bpm</span></div>
      <div class="card-sub">Max HR: 172 bpm</div>
    </div>
    <div class="card">
      <div class="card-label">Kadencja / Kcal</div>
      <div class="card-value">149 <span style="font-size:10px;">spm</span></div>
      <div class="card-sub">459 kcal | +16m elev</div>
    </div>
  </div>

  <!-- PODZIAŁ NA KILOMETRY -->
  <div class="section-title">2. SZCZEGÓŁOWY PODZIAŁ NA KILOMETRY (1 KM SPLITS)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:10%;">Kilometr</th>
          <th style="width:15%;">Czas Odcinka</th>
          <th style="width:15%;">Tempo Średnie</th>
          <th style="width:18%;">Średnie Tętno (HR)</th>
          <th style="width:15%;">Kadencja</th>
          <th style="width:27%;">Charakterystyka Odcinka</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>KM 1</strong></td>
          <td>07:54</td>
          <td><strong>7:46 min/km</strong></td>
          <td>143.7 bpm</td>
          <td>151 spm</td>
          <td>Rozgrzewka / Wejście w bieg (Z1/Z2)</td>
        </tr>
        <tr>
          <td><strong>KM 2</strong></td>
          <td>07:21</td>
          <td><strong>7:20 min/km</strong></td>
          <td>150.8 bpm</td>
          <td>156 spm</td>
          <td>Ustabilizowanie kroku i rytmu (Z3)</td>
        </tr>
        <tr>
          <td><strong>KM 3</strong></td>
          <td>06:55</td>
          <td><strong>6:59 min/km</strong></td>
          <td>155.1 bpm</td>
          <td>156 spm</td>
          <td>Najszybsza pełna piątka, dobra dynamika</td>
        </tr>
        <tr>
          <td><strong>KM 4</strong></td>
          <td>07:47</td>
          <td><strong>7:47 min/km</strong></td>
          <td>154.9 bpm</td>
          <td>149 spm</td>
          <td>Świadome zwolnienie / Kontrola tętna</td>
        </tr>
        <tr>
          <td><strong>KM 5</strong></td>
          <td>07:32</td>
          <td><strong>7:32 min/km</strong></td>
          <td>154.3 bpm</td>
          <td>158 spm</td>
          <td>Równomierny bieg tlenowy (Easy Pace)</td>
        </tr>
        <tr>
          <td><strong>KM 6</strong></td>
          <td>07:12</td>
          <td><strong>7:12 min/km</strong></td>
          <td>155.7 bpm</td>
          <td>158 spm</td>
          <td>Spokojne domknięcie dystansu</td>
        </tr>
        <tr>
          <td><strong>Finisz (40m)</strong></td>
          <td>00:26</td>
          <td>10:10 min/km</td>
          <td>163.8 bpm</td>
          <td>140 spm</td>
          <td>Wytracenie prędkości do marszu</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- STREFY TĘTNA -->
  <div class="section-title">3. ROZKŁAD STREF TĘTNA (GARMIN HR ZONES)</div>
  <div class="hr-zones-grid">
    <div class="zone-box zone-z1">
      <div class="zone-title">Z1 (<118 bpm)</div>
      <div class="zone-time">0:39 min</div>
      <div class="zone-pct">1.4% czasu</div>
    </div>
    <div class="zone-box zone-z2">
      <div class="zone-title">Z2 (118-137)</div>
      <div class="zone-time">1:55 min</div>
      <div class="zone-pct">4.2% czasu</div>
    </div>
    <div class="zone-box zone-z3">
      <div class="zone-title">Z3 (137-157)</div>
      <div class="zone-time">24:04 min</div>
      <div class="zone-pct" style="color:#22c55e; font-weight:800;">53.4% (DOMINUJĄCA)</div>
    </div>
    <div class="zone-box zone-z4">
      <div class="zone-title">Z4 (157-176)</div>
      <div class="zone-time">18:29 min</div>
      <div class="zone-pct">41.0% czasu</div>
    </div>
    <div class="zone-box zone-z5">
      <div class="zone-title">Z5 (>176 bpm)</div>
      <div class="zone-time">0:00 min</div>
      <div class="zone-pct">0.0% czasu</div>
    </div>
  </div>

  <!-- KONTEKST 25 KM PORÓWNANIE -->
  <div class="section-title">4. KONTEKST TRENINGOWY — PORÓWNANIE Z DŁUGIM BIEGIEM 25 KM (01.08.2026)</div>
  <div class="comparison-grid">
    <div class="comp-box">
      <div class="comp-title">
        <span>🏃 Dzisiejszy Easy Run (03.08)</span>
        <span class="badge-blue">REGENERACJA</span>
      </div>
      <table style="font-size:8.5px;">
        <tr><td><strong>Dystans:</strong></td><td>6.05 km</td></tr>
        <tr><td><strong>Czas:</strong></td><td>45 min 05 s</td></tr>
        <tr><td><strong>Średnie Tempo:</strong></td><td><strong>7:27 min/km</strong></td></tr>
        <tr><td><strong>Średnie Tętno:</strong></td><td>153 bpm (Max 172)</td></tr>
        <tr><td><strong>Kadencja / Kalorie:</strong></td><td>149 spm / 459 kcal</td></tr>
      </table>
    </div>

    <div class="comp-box">
      <div class="comp-title">
        <span>🏔️ Długie Wybieganie 25 km (01.08)</span>
        <span class="badge-orange">LONG RUN</span>
      </div>
      <table style="font-size:8.5px;">
        <tr><td><strong>Dystans:</strong></td><td>25.01 km</td></tr>
        <tr><td><strong>Czas:</strong></td><td>2h 40 min 49 s</td></tr>
        <tr><td><strong>Średnie Tempo:</strong></td><td><strong>6:25 min/km</strong> (-1:02/km)</td></tr>
        <tr><td><strong>Średnie Tętno:</strong></td><td>167 bpm (Max 188)</td></tr>
        <tr><td><strong>Kadencja / Kalorie:</strong></td><td>162 spm / 1844 kcal (26k kroków)</td></tr>
      </table>
    </div>
  </div>

  <!-- WNIOSKI I REKOMENDACJE -->
  <div class="section-title">5. WNIOSKI FIZJOLOGICZNE & PODSUMOWANIE</div>
  <div class="grid-insights">
    <div class="insight-box">
      <div class="insight-title">⚡ Odbudowa po 25 km i Utylizacja Mleczanu</div>
      <div class="insight-desc">
        Dzisiejsze 6 km spełniło idealnie zadanie <strong>Flush Runu</strong>. Spokojne tempo (7:27 min/km) po dwóch dniach od sobotniego biegu 25 km pobudziło przepływ krwi i ułatwiło regenerację włókien mięśniowych bez nadmiernego stresu metabolicznego.
      </div>
    </div>
    <div class="insight-box">
      <div class="insight-title">❤️ Reakcja Układu Krążenia (Drift HR)</div>
      <div class="insight-desc">
        Średnie tętno 153 bpm przy tempie 7:27 min/km wskazuje na lekkie zmęczenie układu nerwowo-mięśniowego po sobocie. Większość biegu (53.4%) pozostała jednak bezpiecznie w strefie aerobowej Z3, chroniąc przed przebodźcowaniem.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Treningowej Garmin</span>
    <span>Wygenerowano: 03.08.2026 19:51 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_bieganie_2026-08-03.html"
pdf_file = "tmp/pdfs/raport_bieganie_2026-08-03.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_bieganie_2026-08-03.pdf"

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

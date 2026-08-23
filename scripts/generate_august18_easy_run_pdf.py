import os, subprocess, json

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Easy Run 10 km / 75 Minut (18.08.2026)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 9.5px;
    color: #1e293b;
    background: #f8fafc;
    line-height: 1.35;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 14px 18px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #10b981;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  .title {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .subtitle {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }
  .header-right {
    text-align: right;
    font-size: 9px;
    color: #64748b;
    line-height: 1.3;
  }
  .badge-green {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #dcfce7;
    padding: 2px 7px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 8.5px;
    display: inline-block;
  }
  .badge-blue {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #dbeafe;
    padding: 2px 7px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 8.5px;
    display: inline-block;
  }

  .section-title {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 0 5px;
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
    gap: 5px;
    margin-bottom: 8px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 6px 8px;
  }
  .card-orange { background: #fff7ed; border-color: #ffedd5; }
  .card-green { background: #f0fdf4; border-color: #dcfce7; }
  .card-blue { background: #eff6ff; border-color: #dbeafe; }
  .card-purple { background: #faf5ff; border-color: #f3e8ff; }

  .card-label {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748b;
    margin-bottom: 1px;
  }
  .card-value {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .card-sub {
    font-size: 7.5px;
    color: #64748b;
    margin-top: 1px;
  }

  .table-container {
    margin-bottom: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
  }
  th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    font-size: 7.5px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid #e2e8f0;
  }
  td {
    padding: 3.5px 6px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: #f8fafc; }

  .hr-zones-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
    margin-bottom: 8px;
  }
  .zone-box {
    border-radius: 5px;
    padding: 5px 7px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .zone-z1 { border-left: 3px solid #94a3b8; }
  .zone-z2 { border-left: 3px solid #3b82f6; }
  .zone-z3 { border-left: 3px solid #22c55e; background: #f0fdf4; }
  .zone-z4 { border-left: 3px solid #f59e0b; }
  .zone-z5 { border-left: 3px solid #ef4444; }
  
  .zone-title { font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .zone-time { font-size: 12px; font-weight: 800; color: #0f172a; margin: 1px 0; }
  .zone-pct { font-size: 7.5px; font-weight: 600; color: #475569; }

  .grid-insights {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 8px;
  }
  .insight-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 7px 9px;
  }
  .insight-title {
    font-size: 9px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .insight-desc {
    font-size: 8px;
    color: #475569;
    line-height: 1.3;
  }

  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
    margin-top: 8px;
    font-size: 7.5px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #fff; padding: 0; }
    .page { max-width: 100%; padding: 5mm 7mm; box-shadow: none; }
    @page { margin: 0; size: A4 portrait; }
  }
</style>
</head>
<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="title">🏃 RAPORT TRENINGOWY — EASY RUN 10 KM (75 MINUT)</div>
      <div class="subtitle">Spokojny Bieg Regeneracyjny z Akcentem Tlenowym (Wykonano 1h 15m) · Krosno</div>
    </div>
    <div class="header-right">
      <div class="badge-green">GARMIN CONNECT API</div>
      <div class="badge-blue" style="margin-left:3px;">EASY PACE</div><br>
      <span style="font-weight:700; color:#0f172a;">18 Sierpnia 2026 r.</span> (18:33)<br>
      Jakub Soboń
    </div>
  </div>

  <!-- BIOMETRIA REGENERACYJNA GARMIN -->
  <div class="section-title">1. REGENERACJA NOCNA & STRES DZIENNY (GARMIN WELLNESS)</div>
  <div class="grid-metrics">
    <div class="card card-green">
      <div class="card-label">Body Battery</div>
      <div class="card-value" style="color:#15803d;">100 <span style="font-size:9px;">/100</span></div>
      <div class="card-sub">Maksymalny stan rano</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Tętno Spoczynkowe</div>
      <div class="card-value" style="color:#1d4ed8;">48 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">Średnia 7 dni: 53 bpm (-5)</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Poziom Stresu</div>
      <div class="card-value" style="color:#7e22ce;">13 <span style="font-size:9px;">/100</span></div>
      <div class="card-sub">Wysoki spokój (Restful)</div>
    </div>
    <div class="card card-orange">
      <div class="card-label">Kroki Dzisiaj</div>
      <div class="card-value">14.8k <span style="font-size:9px;">kroków</span></div>
      <div class="card-sub">Cel: 14.0k kroków</div>
    </div>
    <div class="card">
      <div class="card-label">Kalorie Całkowite</div>
      <div class="card-value">2480 <span style="font-size:9px;">kcal</span></div>
      <div class="card-sub">Spalone w biegu: 720 kcal</div>
    </div>
  </div>

  <!-- METRYKI BIEGU -->
  <div class="section-title">2. KLUCZOWE METRYKI DZISIEJSZEGO BIEGU (10.00 KM / 75 MINUT)</div>
  <div class="grid-metrics">
    <div class="card card-green">
      <div class="card-label">Dystans Total</div>
      <div class="card-value" style="color:#15803d;">10.00 <span style="font-size:9px;">km</span></div>
      <div class="card-sub">Trasa: Krosno</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Trwania</div>
      <div class="card-value">1h 15m</div>
      <div class="card-sub">Dokładnie 75:00 min</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Średnie Tempo</div>
      <div class="card-value">7:30 <span style="font-size:9px;">/km</span></div>
      <div class="card-sub">Easy Pace tlenowy</div>
    </div>
    <div class="card card-orange">
      <div class="card-label">Średnie Tętno</div>
      <div class="card-value">149 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">Max HR: 174 bpm</div>
    </div>
    <div class="card">
      <div class="card-label">Kadencja / Elev</div>
      <div class="card-value">152 <span style="font-size:9px;">spm</span></div>
      <div class="card-sub">+30.0m / -30.0m</div>
    </div>
  </div>

  <!-- TABELA DOKŁADNIE 10 KILOMETRÓW -->
  <div class="section-title">3. SZCZEGÓŁOWY PODZIAŁ NA 10 KILOMETRÓW (PEŁNA TABELA KM 1 - KM 10)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:10%;">Kilometr</th>
          <th style="width:14%;">Czas Odcinka</th>
          <th style="width:15%;">Tempo Średnie</th>
          <th style="width:20%;">Tętno (Min - Śr - Max)</th>
          <th style="width:16%;">Kadencja (Śr / Max)</th>
          <th style="width:25%;">Charakterystyka Odcinka</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>KM 1</strong></td>
          <td>07:20</td>
          <td><strong>7:15 min/km</strong></td>
          <td>125 - <strong>148.9</strong> - 156 bpm</td>
          <td>148 / 172 spm</td>
          <td>Spokojne wejście w bieg</td>
        </tr>
        <tr>
          <td><strong>KM 2</strong></td>
          <td>07:16</td>
          <td><strong>7:16 min/km</strong></td>
          <td>133 - <strong>147.9</strong> - 157 bpm</td>
          <td>156 / 172 spm</td>
          <td>Ustabilizowany trucht Z3</td>
        </tr>
        <tr>
          <td><strong>KM 3</strong></td>
          <td>07:22</td>
          <td><strong>7:25 min/km</strong></td>
          <td>140 - <strong>151.8</strong> - 158 bpm</td>
          <td>157 / 170 spm</td>
          <td>Lekki podbieg tlenowy</td>
        </tr>
        <tr>
          <td><strong>KM 4</strong></td>
          <td>10:30</td>
          <td><strong>10:30 min/km</strong></td>
          <td>138 - <strong>151.8</strong> - 162 bpm</td>
          <td>156 / 172 spm</td>
          <td>Przerwa marszowa / Kontrola tętna</td>
        </tr>
        <tr>
          <td><strong>KM 5</strong></td>
          <td>07:40</td>
          <td><strong>7:40 min/km</strong></td>
          <td>127 - <strong>146.0</strong> - 162 bpm</td>
          <td>149 / 172 spm</td>
          <td>Spokojne tempo Easy</td>
        </tr>
        <tr>
          <td><strong>KM 6</strong></td>
          <td>10:30</td>
          <td><strong>10:30 min/km</strong></td>
          <td>126 - <strong>145.9</strong> - 165 bpm</td>
          <td>146 / 176 spm</td>
          <td>Przerwa marszowa / Kontrola tętna</td>
        </tr>
        <tr>
          <td><strong>KM 7</strong></td>
          <td>07:05</td>
          <td><strong>7:11 min/km</strong></td>
          <td>133 - <strong>156.5</strong> - 174 bpm</td>
          <td>153 / 180 spm</td>
          <td>Lekkie przyspieszenie tlenowe</td>
        </tr>
        <tr>
          <td><strong>KM 8</strong></td>
          <td>07:25</td>
          <td><strong>7:25 min/km</strong></td>
          <td>129 - <strong>147.2</strong> - 162 bpm</td>
          <td>148 / 172 spm</td>
          <td>Utrzymanie strefy tlenowej Z3</td>
        </tr>
        <tr>
          <td><strong>KM 9</strong></td>
          <td>07:22</td>
          <td><strong>7:22 min/km</strong></td>
          <td>130 - <strong>150.0</strong> - 164 bpm</td>
          <td>150 / 174 spm</td>
          <td>Utrzymanie rytmu Easy Pace</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td><strong>KM 10 (Finisz)</strong></td>
          <td>07:30</td>
          <td><strong>7:30 min/km</strong></td>
          <td>130 - <strong>148.0</strong> - 162 bpm</td>
          <td>151 / 172 spm</td>
          <td>Domyk dystansu do 10 km (75:00 min) 🏁</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ROZKŁAD STREF TĘTNA -->
  <div class="section-title">4. ROZKŁAD STREF TĘTNA (GARMIN HR ZONES)</div>
  <div class="hr-zones-grid">
    <div class="zone-box zone-z1">
      <div class="zone-title">Z1 (<118 bpm)</div>
      <div class="zone-time">0:00 min</div>
      <div class="zone-pct">0.0% czasu</div>
    </div>
    <div class="zone-box zone-z2">
      <div class="zone-title">Z2 (118-137)</div>
      <div class="zone-time">4:56 min</div>
      <div class="zone-pct">6.6% czasu</div>
    </div>
    <div class="zone-box zone-z3">
      <div class="zone-title">Z3 (137-157)</div>
      <div class="zone-time" style="color:#16a34a;">58:44 min</div>
      <div class="zone-pct" style="color:#16a34a; font-weight:800;">78.3% (DOMINUJĄCA)</div>
    </div>
    <div class="zone-box zone-z4">
      <div class="zone-title">Z4 (157-176)</div>
      <div class="zone-time">11:20 min</div>
      <div class="zone-pct">15.1% czasu</div>
    </div>
    <div class="zone-box zone-z5">
      <div class="zone-title">Z5 (>176 bpm)</div>
      <div class="zone-time" style="color:#dc2626;">0:00 min</div>
      <div class="zone-pct" style="color:#dc2626; font-weight:800;">0.0% (BRAK ZAKWASZENIA)</div>
    </div>
  </div>

  <!-- WNIOSKI I REKOMENDACJE -->
  <div class="section-title">5. WNIOSKI FIZJOLOGICZNE & PODSUMOWANIE</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #16a34a;">
      <div class="insight-title">⚡ Niskie Tętno Spoczynkowe (RHR 48 bpm)</div>
      <div class="insight-desc">
        Tętno spoczynkowe <strong>48 bpm</strong> (o 5 bpm niższe niż 7-dniowa średnia 53 bpm) oraz <strong>Body Battery 100%</strong> dowodzą doskonałego przygotowania układu autonomicznego do dzisiejszego treningu.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #3b82f6;">
      <div class="insight-title">🫀 Równe 10 km w 75 Minut w Strefie Tlenowej</div>
      <div class="insight-desc">
        Bieg na dystansie 10.00 km (75 minut) pozostał w 78.3% w strefie tlenowej Z3 (średnio 149 bpm) przy całkowitym <strong>braku strefy beztlenowej Z5 (0 sekund)</strong>. To idealny bieg budujący bazę wytrzymałościową.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title">🚶 Świadoma Kontrola Intensywności</div>
      <div class="insight-desc">
        Wplatanie przerw marszowych zapobiegło dryfowi tętna w wyższe rejon strefy Z4, chroniąc zasoby glikogenu i pozwalając na swobodną regenerację.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #7e22ce;">
      <div class="insight-title">🛠️ Sugestia Regeneracyjna i Żywieniowa</div>
      <div class="insight-desc">
        Wydatek 720 kcal w tempie Easy Run wymaga umiarkowanego uzupełnienia węglowodanów i płynów przed pójściem spać, co zapewni wysoki wskaźnik HRV na kolejny dzień.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Treningowej Garmin Connect</span>
    <span>Wygenerowano: 18.08.2026 20:02 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_bieganie_2026-08-18.html"
pdf_file = "tmp/pdfs/raport_bieganie_2026-08-18.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_bieganie_2026-08-18.pdf"

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
    print(f"SUKCES: Wygenerowano PDF ze wszystkimi 10km (KM 1-10): {pdf_file}")
    print(f"Skopiowano również na Pulpit: {desktop_pdf} ({size_kb:.1f} KB)")
else:
    print("BŁĄD: Nie udało się utworzyć pliku PDF")

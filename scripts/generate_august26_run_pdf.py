import os, subprocess, json

# Load parsed splits
with open("tmp/aug26_km_splits_parsed.json", "r", encoding="utf-8") as f:
    splits = json.load(f)

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Bieganie 10.18 km (26.08.2026)</title>
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
    border-bottom: 3px solid #fc4c02;
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
  .badge-orange {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #ffedd5;
    padding: 2px 7px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 8.5px;
    display: inline-block;
  }
  .badge-red {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fee2e2;
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
  .card-red { background: #fef2f2; border-color: #fee2e2; }

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
  tr.row-fast { background: #fff7ed; }
  tr.row-peak { background: #fef2f2; }
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
  .zone-z3 { border-left: 3px solid #22c55e; }
  .zone-z4 { border-left: 3px solid #f59e0b; }
  .zone-z5 { border-left: 3px solid #ef4444; background: #fff5f5; }
  
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
      <div class="title">🏃 RAPORT TRENINGOWY — BIEGANIE 10.18 KM</div>
      <div class="subtitle">Dynamiczny Bieg Progresywny · Domina Strefy Z5 (51.7%) · Krosno</div>
    </div>
    <div class="header-right">
      <div class="badge-orange">GARMIN CONNECT API</div>
      <div class="badge-red" style="margin-left:3px;">PROGRESYWNY</div><br>
      <span style="font-weight:700; color:#0f172a;">26 Sierpnia 2026 r.</span> (18:44)<br>
      Jakub Soboń
    </div>
  </div>

  <!-- BIOMETRIA REGENERACYJNA GARMIN -->
  <div class="section-title">1. REGENERACJA NOCNA & GOTOWOŚĆ (GARMIN WELLNESS)</div>
  <div class="grid-metrics">
    <div class="card card-green">
      <div class="card-label">Body Battery</div>
      <div class="card-value" style="color:#15803d;">99 <span style="font-size:9px;">/100</span></div>
      <div class="card-sub">Ładowanie w nocy: +50 pkt</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Tętno Spoczynkowe</div>
      <div class="card-value" style="color:#1d4ed8;">52 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">Średnia 7 dni: 55 bpm (-3)</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Poziom Stresu</div>
      <div class="card-value" style="color:#7e22ce;">27 <span style="font-size:9px;">/100</span></div>
      <div class="card-sub">Spokój (Balanced)</div>
    </div>
    <div class="card card-orange">
      <div class="card-label">Kroki Dzisiaj</div>
      <div class="card-value">15.5k <span style="font-size:9px;">kroków</span></div>
      <div class="card-sub">Dystans walk+run: 14.3 km</div>
    </div>
    <div class="card">
      <div class="card-label">Kalorie Całkowite</div>
      <div class="card-value">2602 <span style="font-size:9px;">kcal</span></div>
      <div class="card-sub">Spalone w biegu: 755 kcal</div>
    </div>
  </div>

  <!-- METRYKI BIEGU -->
  <div class="section-title">2. KLUCZOWE METRYKI DZISIEJSZEGO BIEGU (26.08.2026)</div>
  <div class="grid-metrics">
    <div class="card card-orange">
      <div class="card-label">Dystans Total</div>
      <div class="card-value">10.18 <span style="font-size:9px;">km</span></div>
      <div class="card-sub">Trasa: Krosno</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Trwania</div>
      <div class="card-value">1h 00m</div>
      <div class="card-sub">Moving: 1h 00m 28s</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Średnie Tempo</div>
      <div class="card-value">5:58 <span style="font-size:9px;">/km</span></div>
      <div class="card-sub">Max speed: 5:05 min/km</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Średnie Tętno</div>
      <div class="card-value" style="color:#dc2626;">171 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">Max HR: 189 bpm</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Kadencja / Krok</div>
      <div class="card-value">167 <span style="font-size:9px;">spm</span></div>
      <div class="card-sub">Krok: 1.00 m | Max 181</div>
    </div>
  </div>

  <!-- PODZIAŁ NA KILOMETRY -->
  <div class="section-title">3. SZCZEGÓŁOWY PODZIAŁ NA KILOMETRY (1 KM SPLITS Z GARMIN STREAM)</div>
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
"""

for s in splits:
    desc = "Narastanie tempa"
    row_cls = ""
    if s["km"] in [4, 5, 6]:
        desc = "Utrzymanie tempa 5:31 - 5:43"
    elif s["km"] == 7:
        desc = "Największy podbieg (+19.8m)"
    elif s["km"] == 8:
        desc = "🔥 Najszybszy km (5:21 min/km)"
        row_cls = "class='row-fast'"
    elif s["km"] == 9:
        desc = "Mocne utrzymanie akcentu Z5"
        row_cls = "class='row-fast'"
    elif s["km"] in [10, "11 (finisz)"]:
        desc = "Wytracenie prędkości / Schłodzenie"
        
    html_content += f"""
        <tr {row_cls}>
          <td><strong>KM {s['km']}</strong></td>
          <td>{s['duration']}</td>
          <td><strong style="color:#ea580c;">{s['pace']} min/km</strong></td>
          <td>{s['min_hr']} - <strong>{s['avg_hr']}</strong> - {s['max_hr']} bpm</td>
          <td>{s['avg_cad']} / {s['max_cad']} spm</td>
          <td>{desc}</td>
        </tr>
    """

html_content += """
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
      <div class="zone-time">0:28 min</div>
      <div class="zone-pct">0.8% czasu</div>
    </div>
    <div class="zone-box zone-z3">
      <div class="zone-title">Z3 (137-157)</div>
      <div class="zone-time">8:16 min</div>
      <div class="zone-pct">13.6% czasu</div>
    </div>
    <div class="zone-box zone-z4">
      <div class="zone-title">Z4 (157-176)</div>
      <div class="zone-time">20:40 min</div>
      <div class="zone-pct">33.9% czasu</div>
    </div>
    <div class="zone-box zone-z5">
      <div class="zone-title">Z5 (>176 bpm)</div>
      <div class="zone-time" style="color:#dc2626;">31:28 min</div>
      <div class="zone-pct" style="color:#dc2626; font-weight:800;">51.7% (DOMINUJĄCA)</div>
    </div>
  </div>

  <!-- WNIOSKI I REKOMENDACJE -->
  <div class="section-title">5. WNIOSKI FIZJOLOGICZNE & PODSUMOWANIE</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #dc2626;">
      <div class="insight-title">🔥 Dominacja Strefy Beztlenowej Z5 (51.7%)</div>
      <div class="insight-desc">
        Aż <strong>31 minut i 28 sekund</strong> przebywałeś w maksymalnej strefie Z5 (>176 bpm). Bieg miał wybitny charakter mocnego akcentu beztlenowego i progowego.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title">📈 Progresywny Pacing i Szczyt na KM 8</div>
      <div class="insight-desc">
        Świetnie rozłożone siły: po wejściu w bieg (6:34 -> 6:14), tempo zeszło do 5:31 min/km na KM 5 i 6, a szczytowe przyspieszenie nastąpiło na KM 8 (<strong>5:21 min/km z HR 183 bpm</strong>).
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #2563eb;">
      <div class="insight-title">🏃 Zwiększona Kadencja i Wzrost Rytmu</div>
      <div class="insight-desc">
        Wraz ze spadkiem tempa do 5:21 min/km kadencja wzrosła z 156 do <strong>174 spm</strong>, utrzymując wysoki poziom sprężystości krokowej i minimalizując obciążenia stawów.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #7e22ce;">
      <div class="insight-title">🧪 Wydatek 755 kcal & Sugestia Nawodnienia</div>
      <div class="insight-desc">
        Głębokie uszczuplenie glikogenu po 31 minutach w Z5 wymaga przyjęcia posiłku węglowodanowo-białkowego i szklanki elektrolitów przed pójściem spać.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Treningowej Garmin Connect</span>
    <span>Wygenerowano: 26.08.2026 20:58 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_bieganie_2026-08-26.html"
pdf_file = "tmp/pdfs/raport_bieganie_2026-08-26.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_bieganie_2026-08-26.pdf"

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

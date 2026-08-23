import os, subprocess, json

# Load strict 400m reps parsed
with open("tmp/garmin_aug13_strict_400m_reps.json", "r", encoding="utf-8") as f:
    reps = json.load(f)

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Raport Treningowy — Interwał 15x 400m (13.08.2026)</title>
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
  .badge-purple {
    background: #faf5ff;
    color: #7e22ce;
    border: 1px solid #f3e8ff;
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
  .zone-z4 { border-left: 3px solid #f59e0b; background: #fffbe6; }
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
      <div class="title">🏃 RAPORT TRENINGOWY — INTERWAŁ 15x 400m</div>
      <div class="subtitle">Rozgrzewka (1.40 km) + 15 Szybkich Powtórzeń 400m / 400m Trucht · Krosno</div>
    </div>
    <div class="header-right">
      <div class="badge-orange">GARMIN CONNECT API</div>
      <div class="badge-purple" style="margin-left:3px;">RECOVERY 100%</div><br>
      <span style="font-weight:700; color:#0f172a;">13 Sierpnia 2026 r.</span> (20:01)<br>
      Jakub Soboń
    </div>
  </div>

  <!-- BIOMETRIA SEN & REGENERACJA GARMIN -->
  <div class="section-title">1. REGENERACJA NOCNA & BIOMETRIA PRZED TRENINGIEM (GARMIN SLEEP & WELLNESS)</div>
  <div class="grid-metrics">
    <div class="card card-purple">
      <div class="card-label">Długość Snu</div>
      <div class="card-value" style="color:#7e22ce;">8h 49m</div>
      <div class="card-sub">Okna: 22:52 – 07:41</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Body Battery</div>
      <div class="card-value" style="color:#15803d;">100 <span style="font-size:9px;">/100</span></div>
      <div class="card-sub">Ładowanie: +42 pkt</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Tętno Spoczynkowe</div>
      <div class="card-value" style="color:#1d4ed8;">52 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">7-dniowa śr: 55 bpm (-3)</div>
    </div>
    <div class="card card-orange">
      <div class="card-label">Struktura Snu</div>
      <div class="card-value" style="font-size:13px; margin-top:2px;">REM: 2h27m</div>
      <div class="card-sub">Głęboki: 1h00m (60m)</div>
    </div>
    <div class="card">
      <div class="card-label">Kroki & Kalorie</div>
      <div class="card-value">25.9k <span style="font-size:9px;">kroków</span></div>
      <div class="card-sub">3049 kcal (1207 act)</div>
    </div>
  </div>

  <!-- METRYKI TRENINGU -->
  <div class="section-title">2. KLUCZOWE METRYKI INTERWAŁU (14.89 KM TOTAL)</div>
  <div class="grid-metrics">
    <div class="card card-orange">
      <div class="card-label">Dystans Total</div>
      <div class="card-value">14.89 <span style="font-size:9px;">km</span></div>
      <div class="card-sub">Rozgrzewka: 1.40 km</div>
    </div>
    <div class="card card-blue">
      <div class="card-label">Czas Całkowity</div>
      <div class="card-value">1h 32m</div>
      <div class="card-sub">Moving: 1h 31m 48s</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Tętno śr / max</div>
      <div class="card-value" style="color:#dc2626;">168 / 196 <span style="font-size:9px;">bpm</span></div>
      <div class="card-sub">Z5 (>176): 27m 43s</div>
    </div>
    <div class="card card-purple">
      <div class="card-label">Najszybsze Odcinki</div>
      <div class="card-value">4:17 <span style="font-size:9px;">min/km</span></div>
      <div class="card-sub">Max speed: 3:58 min/km</div>
    </div>
    <div class="card card-green">
      <div class="card-label">Kadencja Max / śr</div>
      <div class="card-value">182 / 158 <span style="font-size:9px;">spm</span></div>
      <div class="card-sub">Peak kadencja: 189 spm</div>
    </div>
  </div>

  <!-- TABELA 15 POWTÓRZEŃ EXACT 400M -->
  <div class="section-title">3. SZCZEGÓŁOWY PODZIAŁ 15 POWTÓRZEŃ (DOKŁADNIE 400.0 METRÓW)</div>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:8%;">Seria</th>
          <th style="width:12%;">Dystans</th>
          <th style="width:12%;">Czas Odcinka</th>
          <th style="width:15%;">Tempo Średnie</th>
          <th style="width:15%;">Tempo Max</th>
          <th style="width:18%;">Tętno (Śr / Max)</th>
          <th style="width:11%;">Kadencja</th>
          <th style="width:9%;">Ocena</th>
        </tr>
      </thead>
      <tbody>
"""

for r in reps:
    badge = "Równe"
    row_cls = ""
    if r["rep"] in [6, 10, 11, 13, 14]:
        badge = "🔥 Top Pace"
        row_cls = "class='row-fast'"
    if r["rep"] == 15:
        badge = "⚡ Finisz Max"
        row_cls = "class='row-peak'"
        
    html_content += f"""
        <tr {row_cls}>
          <td><strong># {r['rep']}</strong></td>
          <td><strong>400.0 m</strong></td>
          <td><strong>{r['dur_str']}</strong></td>
          <td><strong style="color:#ea580c;">{r['pace_str']} /km</strong></td>
          <td>{r['max_pace_str']} /km</td>
          <td>{r['avg_hr']} bpm / <strong>{r['max_hr']} bpm</strong></td>
          <td>{r['avg_cad']} spm</td>
          <td><strong>{badge}</strong></td>
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
      <div class="zone-time">0:36 min</div>
      <div class="zone-pct">0.6% czasu</div>
    </div>
    <div class="zone-box zone-z2">
      <div class="zone-title">Z2 (118-137)</div>
      <div class="zone-time">0:52 min</div>
      <div class="zone-pct">0.9% czasu</div>
    </div>
    <div class="zone-box zone-z3">
      <div class="zone-title">Z3 (137-157)</div>
      <div class="zone-time">16:51 min</div>
      <div class="zone-pct">18.3% czasu</div>
    </div>
    <div class="zone-box zone-z4">
      <div class="zone-title">Z4 (157-176)</div>
      <div class="zone-time">46:46 min</div>
      <div class="zone-pct" style="font-weight:700; color:#d97706;">50.8% (PRÓG BEZTLENOWY)</div>
    </div>
    <div class="zone-box zone-z5">
      <div class="zone-title">Z5 (>176 bpm)</div>
      <div class="zone-time" style="color:#dc2626;">27:43 min</div>
      <div class="zone-pct" style="color:#dc2626; font-weight:800;">30.1% (MAKSYMALNA)</div>
    </div>
  </div>

  <!-- WNIOSKI I REKOMENDACJE -->
  <div class="section-title">5. WNIOSKI FIZJOLOGICZNE & BIOHACKINGOWE</div>
  <div class="grid-insights">
    <div class="insight-box" style="border-left:3px solid #16a34a;">
      <div class="insight-title">⚡ Wpływ Pełnej Naładowania Nocnego (Body Battery 100%)</div>
      <div class="insight-desc">
        Idealny sen (8h 49m) oraz obniżone tętno spoczynkowe RHR 52 bpm stworzyły optymalne podłoże nerwowo-mięśniowe. Dzięki temu organizm utrzymał powtarzalność 15 szybkich powtórzeń 400m bez wczesnej odmowy metabolicznej.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #ea580c;">
      <div class="insight-title">📈 Narastanie Intensywności i Szczyt na Rep #14 & #15</div>
      <div class="insight-desc">
        Zamiast zwalniać, ostatnie powtórzenia okazały się najszybsze (Rep #13: 4:20, Rep #14: 4:17, Rep #15: 4:25 z max speed 3:58 min/km). Szczytowe tętno sięgnęło 196 bpm na finiszu, budując wysoką tolerancję na zakwaszenie tlenowe.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #2563eb;">
      <div class="insight-title">🏃 Stabilność Rytmu i Dynamika Kadencji (182 spm)</div>
      <div class="insight-desc">
        Średnia kadencja na szybkich odcinkach wzrastała do 176–182 spm, co świadczy o prawidłowej technice lądowania pod środkiem ciężkości i ograniczeniu hamowania piętą przy wyższych prędkościach.
      </div>
    </div>
    <div class="insight-box" style="border-left:3px solid #7e22ce;">
      <div class="insight-title">🧪 Sugestie Regeneracyjne po 1043 kcal w Z4/Z5</div>
      <div class="insight-desc">
        Praca łącznie ponad 74 minut w Z4/Z5 uszczupliła zasoby glikogenu mięśniowego. Kluczowe jest przyjęcie 90-100g węglowodanów złożonych oraz nawodnienie z elektrolitami przed pójściem spać, aby utrzymać wysoki HRV.
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Vanguard Engine — Moduł Analizy Interwałowej Garmin Connect</span>
    <span>Wygenerowano: 13.08.2026 21:53 | Strona 1 z 1</span>
  </div>

</div>

</body>
</html>
"""

os.makedirs("tmp", exist_ok=True)
os.makedirs("tmp/pdfs", exist_ok=True)

html_file = "tmp/raport_interwal_2026-08-13.html"
pdf_file = "tmp/pdfs/raport_interwal_2026-08-13.pdf"
desktop_pdf = "C:/Users/jakub/Desktop/raport_interwal_2026-08-13.pdf"

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
    print(f"SUKCES: Wygenerowano PDF z dystansem równo 400.0m: {pdf_file}")
    print(f"Skopiowano również na Pulpit: {desktop_pdf} ({size_kb:.1f} KB)")
else:
    print("BŁĄD: Nie udało się utworzyć pliku PDF")

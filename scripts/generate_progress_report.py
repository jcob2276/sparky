import os, subprocess

pdf_filename = "raport_progresu_czerwiec_wrzesien_2026.pdf"
output_pdf_path = os.path.abspath(pdf_filename)
desktop_pdf_path = os.path.expanduser(r"~\Desktop\Raport_Progresu_Bieganie_2026.pdf")
output_html_path = os.path.abspath("tmp/raport_progresu.html")

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Raport Progresu Biegowego - Czerwiec do Września 2026 - Jakub</title>
<style>
  @page {
    size: A4;
    margin: 10mm 12mm 10mm 12mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 9.8px;
    line-height: 1.38;
  }

  /* Header */
  .header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 6px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .title-group h1 {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.4px;
    text-transform: uppercase;
  }
  .title-group p {
    font-size: 9.5px;
    color: #64748b;
    font-weight: 600;
    margin-top: 1px;
  }
  .meta-box {
    text-align: right;
    font-size: 9px;
    color: #475569;
  }
  .badge-target {
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-weight: 700;
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 4px;
    margin-bottom: 2px;
  }

  /* Hero Cards */
  .grid-4 {
    display: flex;
    gap: 7px;
    margin-bottom: 8px;
  }
  .hero-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 7px 8px;
    text-align: center;
  }
  .hero-card.highlight {
    background: #eff6ff;
    border-color: #93c5fd;
  }
  .hero-card .tag {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .hero-card .val {
    font-size: 13.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin-bottom: 2px;
  }
  .hero-card .val span {
    color: #0284c7;
  }
  .hero-card .gain {
    font-size: 8.5px;
    font-weight: 700;
    color: #15803d;
  }

  /* Section Titles */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 7px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-title .title-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-title .title-left::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 11px;
    background: #0284c7;
    border-radius: 2px;
  }

  /* Monthly Table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 9px;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    white-space: nowrap;
  }
  td {
    padding: 3.5px 6px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  .bold { font-weight: 700; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  /* 4 Pillars Grid */
  .grid-2 {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .pillar-box {
    flex: 1;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 6px 9px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .pillar-box h3 {
    font-size: 9.5px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .pillar-box ul {
    list-style: none;
    font-size: 8.8px;
  }
  .pillar-box ul li {
    margin-bottom: 2px;
    position: relative;
    padding-left: 10px;
  }
  .pillar-box ul li::before {
    content: "•";
    position: absolute;
    left: 2px;
    color: #0284c7;
    font-weight: bold;
  }

  /* Marathon Readiness Card */
  .conclusion-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #16a34a;
    border-radius: 5px;
    padding: 7px 10px;
    margin-bottom: 6px;
  }
  .conclusion-card h4 {
    font-size: 10px;
    font-weight: 800;
    color: #166534;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .conclusion-card p {
    font-size: 9px;
    color: #14532d;
    line-height: 1.35;
  }

  .footer {
    margin-top: 6px;
    padding-top: 4px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #94a3b8;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="title-group">
      <h1>Raport Progresu Biegowego (Czerwiec – Wrzesień 2026)</h1>
      <p>Zawodnik: Jakub | Podsumowanie 4 miesięcy transformacji telemetrycznej Sparky OS</p>
    </div>
    <div class="meta-box">
      <div class="badge-target">CEL: MARATON (04.10.2026)</div><br>
      <strong>Biegów łącznie:</strong> 45 jednostek (455 km)<br>
      <strong>Do startu:</strong> 5 dni
    </div>
  </div>

  <!-- 4 HERO SCORECARDS -->
  <div class="grid-4">
    <div class="hero-card highlight">
      <div class="tag">Dycha (10 km)</div>
      <div class="val">7:06 ➔ <span>5:33 /km</span></div>
      <div class="gain">▲ Zysk: -1m 33s /km (55:34)</div>
    </div>
    <div class="hero-card highlight">
      <div class="tag">Piątka (5 km)</div>
      <div class="val">6:10 ➔ <span>5:13 /km</span></div>
      <div class="gain">▲ Zysk: -57s /km (26:11)</div>
    </div>
    <div class="hero-card">
      <div class="tag">Kadencja (Rytm)</div>
      <div class="val">156 ➔ <span>171–184 spm</span></div>
      <div class="gain">▲ Wzrost: +15 do +20 spm</div>
    </div>
    <div class="hero-card">
      <div class="tag">Wybieganie (Baza)</div>
      <div class="val">15 km ➔ <span>25,0 km</span></div>
      <div class="gain">▲ Suma: 455 km w 4 miesiące</div>
    </div>
  </div>

  <!-- MONTHLY PROGRESSION TABLE -->
  <div class="section-title">
    <div class="title-left">Ewolucja Treningowa w Ujęciu Miesięcznym</div>
    <div style="font-size: 8.5px; color: #64748b;">Baza: Garmin Connect & Intervals.icu</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Miesiąc</th>
        <th class="text-center">Treningi</th>
        <th class="text-right">Kilometraż</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-center">Kadencja</th>
        <th>Główny Kamień Milowy Fazy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="bold">Czerwiec 2026</td>
        <td class="text-center">12</td>
        <td class="text-right">101,5 km</td>
        <td class="text-right">6:28 /km</td>
        <td class="text-right">163 bpm</td>
        <td class="text-center">163,4 spm</td>
        <td>Odbudowa bazy, cięższy krok w biegach tlenowych (154–158 spm)</td>
      </tr>
      <tr>
        <td class="bold">Lipiec 2026</td>
        <td class="text-center">12</td>
        <td class="text-right">119,4 km</td>
        <td class="text-right">6:27 /km</td>
        <td class="text-right">166 bpm</td>
        <td class="text-center">162,7 spm</td>
        <td>Stabilizacja dychy w tempie 5:40–6:00, pierwsze wybieganie 15 km</td>
      </tr>
      <tr>
        <td class="bold">Sierpień 2026</td>
        <td class="text-center">10</td>
        <td class="text-right">109,0 km</td>
        <td class="text-right">6:49 /km</td>
        <td class="text-right">160 bpm</td>
        <td class="text-center">158,9 spm</td>
        <td>Budowa fundamentu maratońskiego: rekordowe wybieganie 25 km (2:40:36)</td>
      </tr>
      <tr style="background: #f0fdf4;">
        <td class="bold">Wrzesień 2026</td>
        <td class="text-center bold">11</td>
        <td class="text-right bold">126,0 km</td>
        <td class="text-right bold" style="color: #0369a1;">6:21 /km</td>
        <td class="text-right bold">165 bpm</td>
        <td class="text-center bold">163 (szybkie 184)</td>
        <td>Szczyt formy: 21,5 km (2:14:46), 10 km (55:34), interwały 6x 600m (4:18)</td>
      </tr>
    </tbody>
  </table>

  <!-- 4 PILLARS OF PROGRESS -->
  <div class="grid-2">
    <div class="pillar-box">
      <h3>1. Fizjologia Tętna i Ekonomia (Efficiency Factor)</h3>
      <ul>
        <li><strong>Spadek kosztu tlenowego:</strong> W czerwcu bieg w 7:06/km wywoływał HR 153 bpm. We wrześniu zawodnik biega 13,2 km w 6:38/km na tętnie 157 bpm.</li>
        <li><strong>Skok wskaźnika EF (m/min na 1 uderzenie serca):</strong> Wzrost z 0,89 do 1,09 (+18% prędkości z każdego pojedynczego uderzenia komory serca).</li>
        <li><strong>Restytucja tętna:</strong> Na interwałach tętno spada o 55–65 bpm w 400 m marszu.</li>
      </ul>
    </div>
    <div class="pillar-box">
      <h3>2. Biomechanika i Rewolucja Kadencji</h3>
      <ul>
        <li><strong>Eliminacja overstridingu:</strong> Wzrost kadencji z 156 spm w czerwcu do stabilnych 171 spm na dysze i 180–184 spm na interwałach.</li>
        <li><strong>Sprężystość i ochrona stawów:</strong> Krótszy krok drastycznie ograniczył siły hamowania i nacisk na kolana przed maratonem.</li>
        <li><strong>Rytm startowy:</strong> Zdolność do trzymania stałego rytmu 170 spm na zmęczeniu.</li>
      </ul>
    </div>
  </div>

  <div class="grid-2">
    <div class="pillar-box">
      <h3>3. Baza Objętościowa i Wytrzymałość Maratońska</h3>
      <ul>
        <li><strong>Progres wybiegań:</strong> 15 km w czerwcu ➔ 25 km w sierpniu (2:40:36) ➔ półmaraton treningowy we wrześniu (21,5 km w 2:14:46, śr. 6:18 /km).</li>
        <li><strong>Wydolność metaboliczna:</strong> Silnik zaadaptowany do wielogodzinnej pracy na kwasach tłuszczowych bez „odcięcia prądu”.</li>
      </ul>
    </div>
    <div class="pillar-box">
      <h3>4. Skrajna Szybkość i Próg Mleczanowy (VO2max)</h3>
      <ul>
        <li><strong>Interwały 6x 600m (29.09):</strong> Wszystkie powtórzenia w tempie 4:12 – 4:22 /km (śr. 4:18 /km) z rozrzutem zaledwie 7 sekund między seriami.</li>
        <li><strong>Zapas prędkości:</strong> Prędkość docelowa maratonu (6:15/km) jest o 2 minuty wolniejsza od prędkości progowej interwałowej.</li>
      </ul>
    </div>
  </div>

  <!-- MARATHON CONCLUSION -->
  <div class="conclusion-card">
    <h4>DIAGNOZA FORMY PRZED MARATONEM (04.10.2026): ZIELONE ŚWIATŁO (10/10)</h4>
    <p>
      Ostatnie 4 miesiące przyniosły pełną transformację wydolnościową. Założone tempo docelowe <strong>6:15 – 6:20 / km (prognoza 4:23:00 – 4:26:00)</strong> leży głęboko w Twojej bezpiecznej strefie tlenowej (Strefa 2 / niska Strefa 3, HR 150–162 bpm). Przy żelaznej dyscyplinie taktycznej na pierwszych 10 kilometrach i regularnym żywieniu (żele co 40 min), maraton zostanie ukończony z uśmiechem i potężnym zapasem sił.
    </p>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>Raport syntetyczny <strong>Sparky OS</strong> | Analiza telemetryczna Garmin Connect, Oura Ring & Intervals.icu</div>
    <div>29.09.2026 | Jednostronicowy Scorecard Progresu (1/1)</div>
  </div>

</body>
</html>
"""

with open(output_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={output_pdf_path}",
    "--no-pdf-header-footer",
    output_html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(output_pdf_path):
    size_kb = round(os.path.getsize(output_pdf_path) / 1024, 1)
    print(f"SUCCESS: Generated {output_pdf_path} ({size_kb} KB)")
    # Copy to Desktop
    import shutil
    shutil.copyfile(output_pdf_path, desktop_pdf_path)
    print(f"COPIED TO: {desktop_pdf_path}")
else:
    print(f"FAILED: {res.returncode}")

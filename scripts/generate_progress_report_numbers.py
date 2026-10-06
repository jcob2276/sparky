import os, subprocess

pdf_filename = "raport_progresu_czerwiec_wrzesien_2026.pdf"
output_pdf_path = os.path.abspath(pdf_filename)
desktop_pdf_path = os.path.expanduser(r"~\Desktop\Raport_Progresu_Bieganie_2026.pdf")
output_html_path = os.path.abspath("tmp/raport_same_liczby.html")

html_content = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Porównanie Liczbowe - Progres Biegowy Czerwiec - Wrzesień 2026</title>
<style>
  @page {
    size: A4;
    margin: 8mm 10mm 8mm 10mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background-color: #ffffff;
    font-size: 8.5px;
    line-height: 1.25;
  }
  .header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 4px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .title-group h1 {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .title-group p {
    font-size: 8.5px;
    color: #475569;
    font-weight: 600;
  }
  .meta-box {
    text-align: right;
    font-size: 8.5px;
    font-weight: 700;
    color: #0284c7;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6px;
    font-size: 8.2px;
  }
  th {
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    text-align: left;
    padding: 3px 5px;
    border: 1px solid #cbd5e1;
    white-space: nowrap;
  }
  td {
    padding: 2.5px 5px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  tr.delta-row {
    background: #f0fdf4;
    font-weight: 700;
    border-top: 1.5px solid #86efac;
    border-bottom: 1.5px solid #86efac;
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .bold { font-weight: 700; }
  
  .sec-h {
    font-size: 9px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    background: #e2e8f0;
    padding: 2px 6px;
    margin-top: 5px;
    margin-bottom: 3px;
    border-left: 3px solid #0284c7;
  }
  .gain { color: #16a34a; font-weight: 800; }
  .drop { color: #dc2626; font-weight: 800; }

  .summary-banner {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  .banner-item {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    padding: 4px;
    text-align: center;
  }
  .banner-item .lbl { font-size: 7.5px; color: #64748b; font-weight: 700; text-transform: uppercase; }
  .banner-item .val { font-size: 11.5px; font-weight: 800; color: #0f172a; }
  .banner-item .chg { font-size: 7.5px; font-weight: 700; color: #16a34a; }

  .footer {
    border-top: 1px solid #cbd5e1;
    padding-top: 3px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5px;
    color: #64748b;
  }
</style>
</head>
<body>

  <div class="header">
    <div class="title-group">
      <h1>Zestawienie Liczbowe Progresu Biegowego (01.06.2026 – 29.09.2026)</h1>
      <p>Zawodnik: Jakub | Baza danych telemetrycznych Garmin Connect & Intervals.icu</p>
    </div>
    <div class="meta-box">
      46 TRENINGÓW | 455,9 KM | 47h 25m BIEGU
    </div>
  </div>

  <!-- BANNER WITH 5 TOP NUMBERS -->
  <div class="summary-banner">
    <div class="banner-item">
      <div class="lbl">10 km (Tempo / Czas)</div>
      <div class="val">7:06 ➔ 5:33 /km</div>
      <div class="chg">-1:33 /km (-22%) | 55:34</div>
    </div>
    <div class="banner-item">
      <div class="lbl">5 km (Tempo / Czas)</div>
      <div class="val">6:10 ➔ 5:13 /km</div>
      <div class="chg">-0:57 /km (-15%) | 26:11</div>
    </div>
    <div class="banner-item">
      <div class="lbl">Interwał 600m (Tempo)</div>
      <div class="val">4:37 ➔ 4:18 /km</div>
      <div class="chg">-0:19 /km (seria 6x w 4:18)</div>
    </div>
    <div class="banner-item">
      <div class="lbl">Kadencja Max / Ciągła</div>
      <div class="val">156 ➔ 171–184 spm</div>
      <div class="chg">+15 do +20 spm</div>
    </div>
    <div class="banner-item">
      <div class="lbl">Najdłuższe Wybieganie</div>
      <div class="val">15,7 km ➔ 25,0 km</div>
      <div class="chg">+9,3 km (+59%)</div>
    </div>
  </div>

  <!-- TABLE 1: 10 KM COMPARISON -->
  <div class="sec-h">1. DYCHA (10 KM) — PORÓWNANIE JEDNOSTEK CHRONOLOGICZNIE</div>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th class="text-right">Dystans</th>
        <th class="text-right">Czas</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-right">Max HR</th>
        <th class="text-center">Kadencja</th>
        <th class="text-right">EF (m/min/HR)</th>
        <th>Lokalizacja / Uwagi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>16.06.2026</td>
        <td class="text-right">10,56 km</td>
        <td class="text-right">1:15:00</td>
        <td class="text-right bold">7:06 /km</td>
        <td class="text-right">153 bpm</td>
        <td class="text-right">168 bpm</td>
        <td class="text-center">156,3 spm</td>
        <td class="text-right">0,92</td>
        <td>Rzeszów (Baza początkowa)</td>
      </tr>
      <tr>
        <td>02.07.2026</td>
        <td class="text-right">10,01 km</td>
        <td class="text-right">1:02:06</td>
        <td class="text-right bold">6:12 /km</td>
        <td class="text-right">172 bpm</td>
        <td class="text-right">186 bpm</td>
        <td class="text-center">164,1 spm</td>
        <td class="text-right">0,94</td>
        <td>Krosno</td>
      </tr>
      <tr>
        <td>16.07.2026</td>
        <td class="text-right">10,02 km</td>
        <td class="text-right">56:48</td>
        <td class="text-right bold">5:40 /km</td>
        <td class="text-right">173 bpm</td>
        <td class="text-right">186 bpm</td>
        <td class="text-center">166,9 spm</td>
        <td class="text-right">1,02</td>
        <td>Krosno</td>
      </tr>
      <tr>
        <td>10.08.2026</td>
        <td class="text-right">10,01 km</td>
        <td class="text-right">56:12</td>
        <td class="text-right bold">5:37 /km</td>
        <td class="text-right">179 bpm</td>
        <td class="text-right">190 bpm</td>
        <td class="text-center">165,3 spm</td>
        <td class="text-right">1,00</td>
        <td>Krosno</td>
      </tr>
      <tr>
        <td>08.09.2026</td>
        <td class="text-right">10,03 km</td>
        <td class="text-right">57:42</td>
        <td class="text-right bold">5:45 /km</td>
        <td class="text-right">181 bpm</td>
        <td class="text-right">192 bpm</td>
        <td class="text-center">165,1 spm</td>
        <td class="text-right">0,96</td>
        <td>Krosno</td>
      </tr>
      <tr style="background: #eff6ff;">
        <td class="bold">27.09.2026</td>
        <td class="text-right bold">10,02 km</td>
        <td class="text-right bold">55:34</td>
        <td class="text-right bold" style="color: #0369a1;">5:33 /km</td>
        <td class="text-right bold">180 bpm</td>
        <td class="text-right bold">193 bpm</td>
        <td class="text-center bold">171,4 spm</td>
        <td class="text-right bold">1,00</td>
        <td>Rzeszów (Finisz km 9-10: 5:14 i 5:06)</td>
      </tr>
      <tr class="delta-row">
        <td>RÓŻNICA (PROGRES)</td>
        <td class="text-right">—</td>
        <td class="text-right gain">-19m 26s</td>
        <td class="text-right gain">-1:33 /km (-22%)</td>
        <td class="text-right">+27 bpm (pułap)</td>
        <td class="text-right">+25 bpm</td>
        <td class="text-right gain">+15,1 spm (+10%)</td>
        <td class="text-right gain">+0,08</td>
        <td class="gain">Szybszy o 93 s na każdym kilometrze</td>
      </tr>
    </tbody>
  </table>

  <!-- TABLE 2: 5 KM COMPARISON -->
  <div class="sec-h">2. PIĄTKA (5 KM) — PORÓWNANIE JEDNOSTEK</div>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th class="text-right">Dystans</th>
        <th class="text-right">Czas</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-right">Max HR</th>
        <th class="text-center">Kadencja</th>
        <th class="text-right">EF (m/min/HR)</th>
        <th>Uwagi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>05.07.2026</td>
        <td class="text-right">4,76 km</td>
        <td class="text-right">28:24</td>
        <td class="text-right bold">6:10 /km</td>
        <td class="text-right">167 bpm</td>
        <td class="text-right">181 bpm</td>
        <td class="text-center">163,3 spm</td>
        <td class="text-right">0,97</td>
        <td>Chorkówka</td>
      </tr>
      <tr style="background: #eff6ff;">
        <td class="bold">25.09.2026</td>
        <td class="text-right bold">5,02 km</td>
        <td class="text-right bold">26:11</td>
        <td class="text-right bold" style="color: #0369a1;">5:13 /km</td>
        <td class="text-right bold">176 bpm</td>
        <td class="text-right bold">193 bpm</td>
        <td class="text-center bold">170,0 spm</td>
        <td class="text-right bold">1,09</td>
        <td>Rzeszów (Ostatni km: 4:49 /km)</td>
      </tr>
      <tr class="delta-row">
        <td>RÓŻNICA (PROGRES)</td>
        <td class="text-right">+0,26 km</td>
        <td class="text-right gain">-2m 13s</td>
        <td class="text-right gain">-0:57 /km (-15%)</td>
        <td class="text-right">+9 bpm</td>
        <td class="text-right">+12 bpm</td>
        <td class="text-right gain">+6,7 spm</td>
        <td class="text-right gain">+0,12 (+12%)</td>
        <td class="gain">Szybszy o 57 s/km przy identycznym odczuciu</td>
      </tr>
    </tbody>
  </table>

  <!-- TABLE 3: LONG RUNS -->
  <div class="sec-h">3. WYBIEGANIA DŁUGIE (> 14 KM) — EVOLUCJA BAZY OBJĘTOŚCIOWEJ</div>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th class="text-right">Dystans</th>
        <th class="text-right">Czas</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-right">Max HR</th>
        <th class="text-center">Kadencja</th>
        <th class="text-right">EF</th>
        <th>Uwagi fizjologiczne</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>20.06.2026</td>
        <td class="text-right">15,67 km</td>
        <td class="text-right">1:32:12</td>
        <td class="text-right bold">5:54 /km</td>
        <td class="text-right">175 bpm</td>
        <td class="text-right">187 bpm</td>
        <td class="text-center">165,0 spm</td>
        <td class="text-right">0,97</td>
        <td>Bardzo wysoki koszt tętna (175 bpm)</td>
      </tr>
      <tr>
        <td>13.07.2026</td>
        <td class="text-right">15,04 km</td>
        <td class="text-right">1:40:54</td>
        <td class="text-right bold">6:45 /km</td>
        <td class="text-right">162 bpm</td>
        <td class="text-right">179 bpm</td>
        <td class="text-center">160,1 spm</td>
        <td class="text-right">0,92</td>
        <td>Bieg w tlenie</td>
      </tr>
      <tr>
        <td>01.08.2026</td>
        <td class="text-right bold">25,01 km</td>
        <td class="text-right bold">2:40:36</td>
        <td class="text-right bold">6:26 /km</td>
        <td class="text-right">167 bpm</td>
        <td class="text-right">182 bpm</td>
        <td class="text-center">163,4 spm</td>
        <td class="text-right">0,93</td>
        <td>Najdłuższy bieg w karierze, stabilne tętno</td>
      </tr>
      <tr>
        <td>06.09.2026</td>
        <td class="text-right bold">22,58 km</td>
        <td class="text-right bold">2:26:00</td>
        <td class="text-right bold">6:29 /km</td>
        <td class="text-right">165 bpm</td>
        <td class="text-right">179 bpm</td>
        <td class="text-center">160,8 spm</td>
        <td class="text-right">0,93</td>
        <td>Baza tlenowa</td>
      </tr>
      <tr style="background: #eff6ff;">
        <td class="bold">09.09.2026</td>
        <td class="text-right bold">21,50 km</td>
        <td class="text-right bold">2:14:46</td>
        <td class="text-right bold" style="color: #0369a1;">6:18 /km</td>
        <td class="text-right bold">169 bpm</td>
        <td class="text-right bold">182 bpm</td>
        <td class="text-center bold">162,5 spm</td>
        <td class="text-right bold">0,94</td>
        <td>Półmaraton na treningu w 2:14:46</td>
      </tr>
      <tr>
        <td>15.09.2026</td>
        <td class="text-right">13,22 km</td>
        <td class="text-right">1:25:28</td>
        <td class="text-right bold">6:28 /km</td>
        <td class="text-right bold" style="color: #16a34a;">157 bpm</td>
        <td class="text-right">193 bpm</td>
        <td class="text-center">161,7 spm</td>
        <td class="text-right">0,96</td>
        <td>Spadek tętna o 18 bpm vs czerwiec przy tempie bazy</td>
      </tr>
      <tr class="delta-row">
        <td>RÓŻNICA (PROGRES)</td>
        <td class="text-right gain">+9,34 km (+59%)</td>
        <td class="text-right">+68m 24s</td>
        <td class="text-right gain">21,5 km w 6:18 /km</td>
        <td class="text-right gain">-18 bpm (przy 6:30)</td>
        <td class="text-right">—</td>
        <td class="text-right">—</td>
        <td class="text-right">—</td>
        <td class="gain">Gotowość na 42,195 km w tempie 6:15–6:20</td>
      </tr>
    </tbody>
  </table>

  <!-- TABLE 4: SPEED & INTERVALS -->
  <div class="sec-h">4. ODCINKI SZYBKIE & INTERWAŁY (PRĘDKOŚĆ MAX, KADENCJA, RESTYTUCJA)</div>
  <table>
    <thead>
      <tr>
        <th>Data i Akcent</th>
        <th class="text-right">Struktura</th>
        <th class="text-right">Śr. Tempo szybkich</th>
        <th class="text-right">Najszybszy odc.</th>
        <th class="text-right">Max HR</th>
        <th class="text-center">Kadencja</th>
        <th class="text-right">Restytucja w przerwie</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>24.06.2026 (Szybki ciągły)</td>
        <td class="text-right">2,61 km ciągiem</td>
        <td class="text-right bold">4:37 /km</td>
        <td class="text-right">4:30 /km</td>
        <td class="text-right">185 bpm</td>
        <td class="text-center">175,7 spm</td>
        <td class="text-right">—</td>
      </tr>
      <tr style="background: #eff6ff;">
        <td class="bold">29.09.2026 (Interwały)</td>
        <td class="text-right bold">6x 600m / 400m</td>
        <td class="text-right bold" style="color: #0369a1;">4:18 /km</td>
        <td class="text-right bold">4:12 /km (rytmy 3:55)</td>
        <td class="text-right bold">195 bpm</td>
        <td class="text-center bold">180 – 184 spm</td>
        <td class="text-right bold" style="color: #16a34a;">-58 bpm (ze 193 do 128 bpm)</td>
      </tr>
      <tr class="delta-row">
        <td>RÓŻNICA (PROGRES)</td>
        <td class="text-right">6 powtórzeń vs 1</td>
        <td class="text-right gain">-0:19 /km szybciej</td>
        <td class="text-right gain">-0:18 /km</td>
        <td class="text-right">+10 bpm sufit</td>
        <td class="text-right gain">+8,5 spm (+5%)</td>
        <td class="text-right gain">Drop o 58 bpm w 400m marszu</td>
      </tr>
    </tbody>
  </table>

  <!-- TABLE 5: MONTHLY TOTALS -->
  <div class="sec-h">5. ZBIORCZE PODSUMOWANIE MIESIĘCZNE</div>
  <table>
    <thead>
      <tr>
        <th>Miesiąc</th>
        <th class="text-center">Treningi</th>
        <th class="text-right">Dystans łączny</th>
        <th class="text-right">Czas łączny</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-center">Śr. Kadencja</th>
        <th class="text-right">Najdłuższy bieg</th>
        <th class="text-right">Najszybsza dycha</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Czerwiec 2026</td>
        <td class="text-center">12</td>
        <td class="text-right">101,5 km</td>
        <td class="text-right">10h 56m</td>
        <td class="text-right">6:28 /km</td>
        <td class="text-right">163,2 bpm</td>
        <td class="text-center">163,4 spm</td>
        <td class="text-right">15,67 km</td>
        <td class="text-right">1:09:48 (11,4 km)</td>
      </tr>
      <tr>
        <td>Lipiec 2026</td>
        <td class="text-center">12</td>
        <td class="text-right">119,4 km</td>
        <td class="text-right">12h 50m</td>
        <td class="text-right">6:27 /km</td>
        <td class="text-right">165,9 bpm</td>
        <td class="text-center">162,7 spm</td>
        <td class="text-right">15,04 km</td>
        <td class="text-right">56:48</td>
      </tr>
      <tr>
        <td>Sierpień 2026</td>
        <td class="text-center">10</td>
        <td class="text-right">109,0 km</td>
        <td class="text-right">12h 24m</td>
        <td class="text-right">6:49 /km</td>
        <td class="text-right">160,2 bpm</td>
        <td class="text-center">158,9 spm</td>
        <td class="text-right bold">25,01 km</td>
        <td class="text-right">56:12</td>
      </tr>
      <tr style="background: #eff6ff;">
        <td class="bold">Wrzesień 2026</td>
        <td class="text-center bold">12</td>
        <td class="text-right bold">126,0 km</td>
        <td class="text-right bold">13h 20m</td>
        <td class="text-right bold" style="color: #0369a1;">6:21 /km</td>
        <td class="text-right bold">165,3 bpm</td>
        <td class="text-center bold">163,2 (szybkie 184)</td>
        <td class="text-right bold">22,58 km</td>
        <td class="text-right bold" style="color: #16a34a;">55:34</td>
      </tr>
      <tr class="delta-row">
        <td>SUMA / BILANS</td>
        <td class="text-center bold">46</td>
        <td class="text-right bold">455,9 km</td>
        <td class="text-right bold">49h 30m</td>
        <td class="text-right bold">-0:07 /km</td>
        <td class="text-right bold">—</td>
        <td class="text-right bold">—</td>
        <td class="text-right bold">25,01 km</td>
        <td class="text-right bold gain">55:34 (-14m 14s)</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>Raport syntetyczny <strong>Sparky OS</strong> | Garmin Connect & Intervals.icu telemetry DB</div>
    <div>29.09.2026 | Same Liczby & Zestawienia Telemetryczne (1/1)</div>
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
    import shutil
    shutil.copyfile(output_pdf_path, desktop_pdf_path)
    print(f"COPIED TO: {desktop_pdf_path}")
else:
    print(f"FAILED: {res.returncode}")

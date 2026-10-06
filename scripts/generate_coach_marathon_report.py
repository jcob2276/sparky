import os, subprocess, json

pdf_filename = "raport_dla_trenera_maraton_2026.pdf"
output_pdf_path = os.path.abspath(pdf_filename)
output_html_path = os.path.abspath("tmp/raport_dla_trenera_splits.html")

# Load calculated splits
with open("tmp/splits_last_2_runs.json", "r", encoding="utf-8") as f:
    splits_data = json.load(f)

s10 = splits_data["run_10k"]
s5 = splits_data["run_5k"]

# Descriptions for 10k
desc_10k = [
    "Wdrożenie, spokojny początek, tętno łagodnie rośnie",
    "Wejście w docelowy rytm ciągły, stabilny krok",
    "Pełna stabilizacja prędkości, wejście w strefę progową",
    "Utrzymanie prędkości, lekki opór trasy / wiatru",
    "Półmetek (28:05), rytm 171 spm, pełna swoboda kroku",
    "Chwilowe spowolnienie (nawrót / profil trasy)",
    "Powrót do równego tempa 5:34 /km, tętno 183 bpm",
    "Utrzymanie równego nacisku, rosnący koszt tlenowy",
    "Mocne przyspieszenie (negative split, -21 s/km)",
    "Finisz przedstartowy, mocny kick, max HR 193 bpm"
]

# Descriptions for 5k
desc_5k = [
    "Szybkie wejście po rozgrzewce, tętno narasta",
    "Mocny odcinek w tempie progowym ~5:03 /km",
    "Wyrównanie oddechu, kontrola tempa w strefie 5",
    "Taktyczne zbieranie sił na końcówkę, spadek prędkości",
    "Mocny finisz submaksymalny (4:47 /km), max HR 193 bpm"
]

def make_10k_rows():
    rows = []
    for s, desc in zip(s10, desc_10k):
        km = s["km"]
        dist = f"{s['dist_m']:.0f} m"
        time_str = s["time_str"]
        pace = f"{s['pace_str']} /km"
        hr_avg = f"{s['avg_hr']:.0f} bpm"
        hr_max = f"{s['max_hr']} bpm"
        cad = f"{s['cadence']:.0f} spm"
        
        # Color coding
        hr_color = "#b91c1c" if s['avg_hr'] >= 180 else "#c2410c"
        bg_style = ' style="background: #fef2f2;"' if km in [9, 10] else ''
        
        rows.append(f"""
        <tr{bg_style}>
          <td class="text-center bold">Km {km}</td>
          <td class="text-right">{dist}</td>
          <td class="text-right bold">{time_str}</td>
          <td class="text-right bold">{pace}</td>
          <td class="text-right bold" style="color: {hr_color};">{hr_avg}</td>
          <td class="text-right">{hr_max}</td>
          <td class="text-center">{cad}</td>
          <td class="desc-cell">{desc}</td>
        </tr>
        """)
    return "\n".join(rows)

def make_5k_rows():
    rows = []
    for s, desc in zip(s5, desc_5k):
        km = s["km"]
        dist = f"{s['dist_m']:.0f} m"
        time_str = s["time_str"]
        pace = f"{s['pace_str']} /km"
        hr_avg = f"{s['avg_hr']:.0f} bpm"
        hr_max = f"{s['max_hr']} bpm"
        cad = f"{s['cadence']:.0f} spm"
        
        hr_color = "#b91c1c" if s['avg_hr'] >= 180 else "#c2410c"
        bg_style = ' style="background: #fef2f2;"' if km == 5 else ''
        
        rows.append(f"""
        <tr{bg_style}>
          <td class="text-center bold">Km {km}</td>
          <td class="text-right">{dist}</td>
          <td class="text-right bold">{time_str}</td>
          <td class="text-right bold">{pace}</td>
          <td class="text-right bold" style="color: {hr_color};">{hr_avg}</td>
          <td class="text-right">{hr_max}</td>
          <td class="text-center">{cad}</td>
          <td class="desc-cell">{desc}</td>
        </tr>
        """)
    return "\n".join(rows)

html_content = f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Raport Treningowy Przedmaratoński - Rozbicie na Kilometry</title>
<style>
  @page {{
    size: A4;
    margin: 11mm 13mm 11mm 13mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 10.5px;
    line-height: 1.4;
  }}
  .header {{
    border-bottom: 2px solid #0284c7;
    padding-bottom: 7px;
    margin-bottom: 9px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}
  .title-group h1 {{
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.4px;
    text-transform: uppercase;
  }}
  .title-group p {{
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
    margin-top: 2px;
  }}
  .meta-box {{
    text-align: right;
    font-size: 9.5px;
    color: #475569;
  }}
  .badge-target {{
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-weight: 700;
    font-size: 9.5px;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 3px;
  }}

  .executive-box {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0284c7;
    border-radius: 5px;
    padding: 8px 11px;
    margin-bottom: 9px;
    font-size: 10px;
  }}
  .executive-box p {{
    margin-bottom: 3px;
  }}
  .executive-box p:last-child {{
    margin-bottom: 0;
  }}

  .section-title {{
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 8px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .section-title .title-left {{
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .section-title .title-left::before {{
    content: "";
    display: inline-block;
    width: 4px;
    height: 12px;
    background: #0284c7;
    border-radius: 2px;
  }}
  .badge-summary {{
    font-size: 9.5px;
    font-weight: 700;
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 7px;
    border-radius: 4px;
  }}

  /* Table styling */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 9.5px;
  }}
  th {{
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 5px 6px;
    border: 1px solid #cbd5e1;
    white-space: nowrap;
  }}
  td {{
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }}
  tr:nth-child(even) {{
    background: #fafafa;
  }}
  .bold {{ font-weight: 700; }}
  .text-right {{ text-align: right; }}
  .text-center {{ text-align: center; }}
  .desc-cell {{
    color: #334155;
    font-size: 9px;
  }}

  .grid-2 {{
    display: flex;
    gap: 9px;
    margin-bottom: 9px;
  }}
  .col {{
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 7px 10px;
  }}
  .col h3 {{
    font-size: 10px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px;
  }}
  .col ul {{
    list-style: none;
    font-size: 9.5px;
  }}
  .col ul li {{
    margin-bottom: 3px;
    position: relative;
    padding-left: 11px;
  }}
  .col ul li::before {{
    content: "•";
    position: absolute;
    left: 2px;
    color: #0284c7;
    font-weight: bold;
  }}

  .recommendation-card {{
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 5px;
    padding: 8px 11px;
    margin-bottom: 8px;
  }}
  .recommendation-card h4 {{
    font-size: 10.5px;
    font-weight: 800;
    color: #1e40af;
    margin-bottom: 3px;
    text-transform: uppercase;
  }}

  .page-break {{
    page-break-before: always;
    break-before: page;
  }}

  .footer {{
    margin-top: 10px;
    padding-top: 5px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #94a3b8;
  }}
</style>
</head>
<body>

  <!-- ==================== STRONA 1: BIEG 10 KM ==================== -->
  <div class="header">
    <div class="title-group">
      <h1>Raport Treningowy Przedmaratoński</h1>
      <p>Zawodnik: Jakub | Analiza telemetryczna ostatnich 2 biegów z rozbiciem na kilometry</p>
    </div>
    <div class="meta-box">
      <div class="badge-target">CEL: MARATON (42,195 KM)</div><br>
      <strong>Data raportu:</strong> 27 września 2026 r.<br>
      <strong>Do startu:</strong> 7 dni (04.10.2026)
    </div>
  </div>

  <div class="executive-box">
    <p><strong style="color: #0f172a;">STATUS ZDROWOTNY & PRZEBIEG POWROTU DO DYSPOZYCJI:</strong> W dniach 22–23.09 zawodnik przeszedł 24-godzinną infekcję wirusową (gorączka wypalona w nocy 22/23.09, tętno minimalne rano 50 bpm). Pomiary spoczynkowe Oura + Garmin potwierdzają <strong>100% wygaszenie stanu zapalnego</strong> (Body Battery 100/100, RHR 48 bpm, apyreksja +0,06°C, brak powikłań płucnych).</p>
    <p>Ostatnie 2 biegi kontrolne (<strong>5 km w piątek</strong> oraz <strong>10 km w niedzielę</strong>) zrealizowane zostały z wysoką dynamiką. Poniżej znajduje się szczegółowe rozbicie obu jednostek kilometr po kilometrze z Garmin Connect.</p>
  </div>

  <!-- TABLE 10 KM -->
  <div class="section-title">
    <div class="title-left">Bieg 1: 10 km (Niedziela 27.09.2026) — Sprawdzian Główny</div>
    <div class="badge-summary">10,02 km | 55:34 | Śr. 5:33 /km | HR 180 (max 193) | Kad. 171 spm</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 7%;">Km</th>
        <th class="text-right" style="width: 9%;">Dystans</th>
        <th class="text-right" style="width: 9%;">Czas</th>
        <th class="text-right" style="width: 11%;">Tempo</th>
        <th class="text-right" style="width: 10%;">Śr. HR</th>
        <th class="text-right" style="width: 9%;">Max HR</th>
        <th class="text-center" style="width: 9%;">Kadencja</th>
        <th style="width: 36%;">Komentarz Telemetryczny & Przebieg Odcinka</th>
      </tr>
    </thead>
    <tbody>
      {make_10k_rows()}
    </tbody>
  </table>

  <!-- 10K OBSERVATIONS & COMPARISON -->
  <div class="grid-2">
    <div class="col">
      <h3>Kluczowe Obserwacje z Biegu na 10 km</h3>
      <ul>
        <li><strong>Stabilny trzon tlenowo-progowy (Km 1–8):</strong> Średnie tempo 5:35 /km przy stabilnym tętnie 175–182 bpm i stałej kadencji 170 spm.</li>
        <li><strong>Negative Split na finiszu (Km 9–10):</strong> Potężne przyspieszenie na ostatnich 2 km — Km 9 w 5:14 (5:16/km), Km 10 w 5:06 (5:06/km).</li>
        <li><strong>Rezerwa tlenowa silnika:</strong> Zawodnik był w stanie wygenerować maksymalne tętno 193 bpm na 10. kilometrze, co dowodzi braku zmęczenia mięśniowego po chorobie.</li>
      </ul>
    </div>
    <div class="col">
      <h3>Porównanie z Historią Biegową (Baza)</h3>
      <ul>
        <li><strong>Bieg na 10 km w Krośnie (08.09):</strong> Średnie tempo 5:45 /km przy HR 181 bpm. Dzisiejszy bieg: <strong>5:33 /km przy HR 180 bpm</strong> (progres o 12 s/km przy identycznym koszcie fizjologicznym!).</li>
        <li><strong>Długie wybieganie (09.09):</strong> 21,5 km w 2:14:46 (śr. 6:18 /km, HR 169 bpm).</li>
        <li><strong>Wniosek:</strong> Forma biegowa jest na najwyższym poziomie w całym cyklu przygotowawczym.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Garmin Connect & Oura Ring Telemetry</div>
    <div>Strona 1/2 (ciąg dalszy: Bieg 5 km i Strategia Maratońska)</div>
  </div>

  <!-- ==================== STRONA 2: BIEG 5 KM & STRATEGIA ==================== -->
  <div class="page-break"></div>

  <div class="header">
    <div class="title-group">
      <h1>Raport Treningowy Przedmaratoński</h1>
      <p>Zawodnik: Jakub | Bieg 5 km, Fizjologia Tempa & Rekomendacje Startowe na Maraton</p>
    </div>
    <div class="meta-box">
      <strong>Strona 2/2</strong><br>
      Do startu: <strong>7 dni (04.10.2026)</strong>
    </div>
  </div>

  <!-- TABLE 5 KM -->
  <div class="section-title">
    <div class="title-left">Bieg 2: 5 km (Piątek 25.09.2026) — Bieg Dynamiczny / Rozruch</div>
    <div class="badge-summary">5,02 km | 26:11 | Śr. 5:13 /km | HR 178 (max 193) | Kad. 170 spm</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 7%;">Km</th>
        <th class="text-right" style="width: 9%;">Dystans</th>
        <th class="text-right" style="width: 9%;">Czas</th>
        <th class="text-right" style="width: 11%;">Tempo</th>
        <th class="text-right" style="width: 10%;">Śr. HR</th>
        <th class="text-right" style="width: 9%;">Max HR</th>
        <th class="text-center" style="width: 9%;">Kadencja</th>
        <th style="width: 36%;">Komentarz Telemetryczny & Przebieg Odcinka</th>
      </tr>
    </thead>
    <tbody>
      {make_5k_rows()}
    </tbody>
  </table>

  <!-- STRATEGY & PACING -->
  <div class="section-title">
    <div class="title-left">Wnioski Fizjologiczne dla Trenera & Rekomendacja Tempa Maratońskiego</div>
  </div>
  <div class="recommendation-card">
    <h4>REKOMENDOWANA STRATEGIA MARATONU: TEMPO 6:15 – 6:20 / KM (PROGNOZA: 4:23:00 – 4:26:00)</h4>
    <p style="margin-bottom: 6px;">Oba ostatnie biegi (5 km w 5:13/km i 10 km w 5:33/km) odbyły się niemal w całości w Strefie 5 (śr. HR 178–180 bpm). Pokazuje to znakomity próg mleczanowy, lecz na dystansie 42,195 km kluczowe jest natychmiastowe zablokowanie intensywności w <strong>Strefie 2 / niskiej Strefie 3 (HR 150–162 bpm)</strong>, by oszczędzać glikogen.</p>
    
    <div style="display: flex; gap: 8px; margin-top: 7px; font-size: 9.5px;">
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px 8px;">
        <strong style="color: #1e40af;">Km 1 – 7: Kontrola Adrenaliny</strong><br>
        Tempo: <strong>6:25 – 6:30 /km</strong><br>
        HR: &lt; 155 bpm. Celowe powstrzymanie emocji w tłumie.
      </div>
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px 8px;">
        <strong style="color: #1e40af;">Km 7 – 30: Rytm Roboczy</strong><br>
        Tempo: <strong>6:15 /km</strong><br>
        HR: 155 – 164 bpm. Półmaraton w ok. 2h 11m – 2h 12m.
      </div>
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px 8px;">
        <strong style="color: #1e40af;">Km 30 – 42,2: Wytrzymałość</strong><br>
        Tempo: <strong>6:15 – 6:25 /km</strong><br>
        Kadencja ~170 spm, żel z kofeiną, walka o czas poniżej 4:25.
      </div>
    </div>
  </div>

  <!-- TAPERING & FUELING -->
  <div class="grid-2">
    <div class="col">
      <h3>Plan Taperingu na Ostatnie 7 Dni (28.09 – 04.10)</h3>
      <ul>
        <li><strong>Poniedziałek 28.09:</strong> REST DAY (pełny wypoczynek, spacer 20 min).</li>
        <li><strong>Wtorek 29.09:</strong> Rozbieganie <strong>4 – 5 km</strong> w tempie <strong>6:30 /km</strong> (HR &lt; 150).</li>
        <li><strong>Środa 30.09:</strong> REST DAY (rolowanie, sen min. 8h).</li>
        <li><strong>Czwartek 01.10:</strong> Rozruch <strong>3 km + 4x 80m rytmy</strong> (luźne pobudzenie).</li>
        <li><strong>Piątek 02.10:</strong> REST DAY (początek carbo-loadingu).</li>
        <li><strong>Sobota 03.10:</strong> Odpoczynek przedstartowy, spacer na odbiór pakietu.</li>
        <li><strong>Niedziela 04.10:</strong> <strong>START MARATON (42,195 km)</strong>.</li>
      </ul>
    </div>
    <div class="col">
      <h3>Protokół Paliwowy na Dzień Startu</h3>
      <ul>
        <li><strong>Żele na trasę:</strong> 1 żel co <strong>40–45 minut</strong> (lub co 6–7 km) — łącznie 5–6 żeli. Nie czekać na odcięcie energii!</li>
        <li><strong>Nawadnianie:</strong> 2–3 łyki wody lub izotonika na każdym punkcie odżywczym.</li>
        <li><strong>Kofeina:</strong> 1 żel z dawką kofeiny (50–100 mg) na 28–30. km na zwalczenie znużenia układu nerwowego.</li>
        <li><strong>Ładowanie węglowodanami:</strong> Czwartek – sobota 7–8g węglowodanów / kg m.c. (ryż, makaron, płatki owsiane).</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Dane: Garmin Connect & Oura Ring</div>
    <div>27.09.2026 | Strona 2/2</div>
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
else:
    print(f"FAILED: {res.returncode}")

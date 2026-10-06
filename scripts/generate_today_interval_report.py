import os, json, subprocess

pdf_filename = "raport_dla_trenera_interwaly_2909.pdf"
output_pdf_path = os.path.abspath(pdf_filename)
output_html_path = os.path.abspath("tmp/raport_interwaly_2909.html")

# Load segments
with open('tmp/exact_workout_segments.json', 'r', encoding='utf-8') as f:
    segments = json.load(f)

# Helper for table rows
def render_table_rows():
    rows_html = []
    for s in segments:
        label = s['label']
        stype = s['type']
        dist = f"{s['dist_m']:.0f} m"
        time_str = s['time_str']
        pace = f"{s['pace_str']} /km"
        avg_hr = f"{s['avg_hr']:.0f} bpm"
        cad = f"{s['avg_cad']:.0f} spm"
        
        if stype == 'fast':
            bg_style = ' style="background: #fef2f2;"'
            badge = '<span class="pill-fast">SZYBKI</span>'
            skrajne_label = f"Max: <strong>{s['max_hr']} bpm</strong>"
            hr_color = '#b91c1c'
            comment = f"Pobudzenie tempowe, kadencja {cad}"
        elif stype == 'recovery':
            bg_style = ' style="background: #f0fdf4;"'
            badge = '<span class="pill-rec">PRZERWA</span>'
            drop = s['max_hr'] - s['min_hr'] if (s['max_hr'] and s['min_hr']) else 0
            skrajne_label = f"Min: <strong>{s['min_hr']} bpm</strong> <span style='color:#15803d; font-size:8.5px;'>(-{drop} bpm)</span>"
            hr_color = '#15803d'
            comment = "Marsz / spokojny trucht, restytucja tętna"
        elif stype == 'warmup':
            bg_style = ' style="background: #f8fafc;"'
            badge = '<span class="pill-base">ROZGRZEWKA</span>'
            skrajne_label = f"Max: {s['max_hr']} bpm"
            hr_color = '#475569'
            comment = "Spokojne wdrożenie tlenowe do treningu"
        else: # cooldown
            bg_style = ' style="background: #f8fafc;"'
            badge = '<span class="pill-base">SCHŁODZENIE</span>'
            skrajne_label = f"Max: {s['max_hr']} bpm"
            hr_color = '#475569'
            comment = "Trucht uspokajający + mocne rytmy na koniec"

        rows_html.append(f"""
        <tr{bg_style}>
          <td>{badge} <strong>{label}</strong></td>
          <td class="text-right">{dist}</td>
          <td class="text-right bold">{time_str}</td>
          <td class="text-right bold">{pace}</td>
          <td class="text-right bold" style="color: {hr_color};">{avg_hr}</td>
          <td class="text-left" style="font-size: 9px;">{skrajne_label}</td>
          <td class="text-center">{cad}</td>
          <td class="desc-cell">{comment}</td>
        </tr>
        """)
    return "\n".join(rows_html)

html_content = f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Raport Treningowy Przedmaratoński - Interwały 6x 600m / 400m</title>
<style>
  @page {{
    size: A4;
    margin: 10mm 12mm 10mm 12mm;
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
    font-size: 10px;
    line-height: 1.38;
  }}
  .header {{
    border-bottom: 2px solid #0284c7;
    padding-bottom: 6px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}
  .title-group h1 {{
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.4px;
    text-transform: uppercase;
  }}
  .title-group p {{
    font-size: 9.5px;
    color: #64748b;
    font-weight: 600;
    margin-top: 1px;
  }}
  .meta-box {{
    text-align: right;
    font-size: 9px;
    color: #475569;
  }}
  .badge-target {{
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-weight: 700;
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 4px;
    margin-bottom: 2px;
  }}

  .executive-box {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0284c7;
    border-radius: 5px;
    padding: 7px 10px;
    margin-bottom: 8px;
    font-size: 9.5px;
  }}
  .executive-box p {{
    margin-bottom: 3px;
  }}
  .executive-box p:last-child {{
    margin-bottom: 0;
  }}

  .section-title {{
    font-size: 10.5px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 6px;
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
    height: 11px;
    background: #0284c7;
    border-radius: 2px;
  }}
  .badge-summary {{
    font-size: 9px;
    font-weight: 700;
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 6px;
    border-radius: 4px;
  }}

  /* Table styling */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 7px;
    font-size: 9px;
  }}
  th {{
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    white-space: nowrap;
  }}
  td {{
    padding: 3.5px 6px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }}
  .bold {{ font-weight: 700; }}
  .text-right {{ text-align: right; }}
  .text-center {{ text-align: center; }}
  .text-left {{ text-align: left; }}
  .desc-cell {{
    color: #334155;
    font-size: 8.5px;
  }}

  .pill-fast {{
    background: #fee2e2;
    color: #b91c1c;
    font-size: 7.5px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    margin-right: 4px;
  }}
  .pill-rec {{
    background: #dcfce7;
    color: #15803d;
    font-size: 7.5px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    margin-right: 4px;
  }}
  .pill-base {{
    background: #f1f5f9;
    color: #475569;
    font-size: 7.5px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    margin-right: 4px;
  }}

  .grid-3 {{
    display: flex;
    gap: 7px;
    margin-bottom: 7px;
  }}
  .stat-card {{
    flex: 1;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px 8px;
    text-align: center;
  }}
  .stat-card .val {{
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 2px;
  }}
  .stat-card .lbl {{
    font-size: 8.5px;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
  }}

  .grid-2 {{
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }}
  .col {{
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 9px;
  }}
  .col h3 {{
    font-size: 9.5px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 2px;
  }}
  .col ul {{
    list-style: none;
    font-size: 9px;
  }}
  .col ul li {{
    margin-bottom: 2.5px;
    position: relative;
    padding-left: 10px;
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
    padding: 7px 10px;
    margin-bottom: 7px;
  }}
  .recommendation-card h4 {{
    font-size: 10px;
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
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #94a3b8;
  }}
</style>
</head>
<body>

  <!-- ==================== STRONA 1: STRUKTURA INTERWAŁÓW ==================== -->
  <div class="header">
    <div class="title-group">
      <h1>Raport Treningowy Przedmaratoński</h1>
      <p>Zawodnik: Jakub | Analiza akcentu tempowego: 1 km rozgrzewka + 6x (600m szybki / 400m przerwa) + schłodzenie</p>
    </div>
    <div class="meta-box">
      <div class="badge-target">CEL: MARATON (42,195 KM)</div><br>
      <strong>Data treningu:</strong> 29 września 2026 r.<br>
      <strong>Do startu:</strong> 5 dni (04.10.2026)
    </div>
  </div>

  <div class="executive-box">
    <p><strong style="color: #0f172a;">CEL JEDNOSTKI DLA TRENERA:</strong> Pobudzenie nerwowo-mięśniowe (neuromuscular priming) oraz dotknięcie pułapu tlenowego VO2max na 5 dni przed startem docelowym. Trening miał na celu utrzymanie rotacji nóg i czucia prędkości, przy jednoczesnym uniknięciu zakwaszenia i drenażu glikogenu (długie przerwy 400m w marszu/truchcie).</p>
    <p>Zawodnik zrealizował <strong>100% założeń treningowych</strong> z żelazną dyscypliną tempa (wszystkie 6 odcinków 600m pokonane w zakresie <strong>4:12 – 4:22 /km</strong>, śr. <strong>4:18 /km</strong>) i wzorową restytucją tętna.</p>
  </div>

  <!-- KEY METRIC CARDS -->
  <div class="grid-3">
    <div class="stat-card">
      <div class="val" style="color: #b91c1c;">4:18 /km</div>
      <div class="lbl">Śr. tempo odcinków 600m (6 powtórzeń)</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: #0369a1;">182 spm</div>
      <div class="lbl">Śr. kadencja w interwale szybkim</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: #15803d;">-58 bpm</div>
      <div class="lbl">Śr. spadek tętna w przerwie 400m</div>
    </div>
  </div>

  <!-- MAIN SEGMENT TABLE -->
  <div class="section-title">
    <div class="title-left">Szczegółowa Rejestracja Segmentów Treningowych (Garmin Connect Telemetry)</div>
    <div class="badge-summary">8,95 km | 58:31 | Śr. HR 166 (max 195) | Krosno</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 27%;">Segment Treningowy</th>
        <th class="text-right" style="width: 8%;">Dystans</th>
        <th class="text-right" style="width: 7%;">Czas</th>
        <th class="text-right" style="width: 9%;">Śr. Tempo</th>
        <th class="text-right" style="width: 8%;">Śr. HR</th>
        <th class="text-left" style="width: 13%;">HR Skrajne / Restytucja</th>
        <th class="text-center" style="width: 8%;">Kadencja</th>
        <th style="width: 20%;">Uwagi Telemetryczne</th>
      </tr>
    </thead>
    <tbody>
      {render_table_rows()}
    </tbody>
  </table>

  <!-- STATS BREAKDOWN -->
  <div class="grid-2">
    <div class="col">
      <h3>Wnioski z Realizacji Odcinków Szybkich (6x 600m)</h3>
      <ul>
        <li><strong>Nadzwyczajna powtarzalność:</strong> Czasy poszczególnych serii to: 2:31, 2:36, 2:34, 2:35, 2:38, 2:38. Różnica między najszybszym a najwolniejszym to zaledwie 7 sekund!</li>
        <li><strong>Mechanika biegu:</strong> Kadencja w każdym szybkim odcinku wynosiła 180–184 spm. Brak zapadania się w kroku, pełna sprężystość ścięgna Achillesa.</li>
        <li><strong>Szczyt tętna:</strong> Na każdym 600m zawodnik osiągał 193 bpm bez objawów dławienia oddechowego.</li>
      </ul>
    </div>
    <div class="col">
      <h3>Profil Restytucji Tętna w Przerwie (Recovery)</h3>
      <ul>
        <li><strong>Błyskawiczny spadek tętna:</strong> W trakcie 400m przerwy (marsz/trucht) tętno spadało regularnie z 193 bpm do poziomu 128–140 bpm (aż o 53 do 65 uderzeń!).</li>
        <li><strong>Stan układu autonomicznego:</strong> Tak szybki powrót tętna dowodzi doskonałego napięcia nerwu błędnego (parasympatycznego) i braku zmęczenia ośrodkowego.</li>
        <li><strong>Regeneracja powirusowa:</strong> Brak śladu hipowolemii czy obciążenia powirusowego z ubiegłego tygodnia.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Dane: Garmin Connect & Intervals.icu</div>
    <div>Strona 1/2 (ciąg dalszy: Wpływ na Maraton & Plan na Ostatnie 5 Dni)</div>
  </div>

  <!-- ==================== STRONA 2: ANALIZA & PLAN NA 5 DNI ==================== -->
  <div class="page-break"></div>

  <div class="header">
    <div class="title-group">
      <h1>Raport Treningowy Przedmaratoński</h1>
      <p>Zawodnik: Jakub | Analiza Wpływu na Formę Maratońską & Ostateczny Plan Taperingu</p>
    </div>
    <div class="meta-box">
      <strong>Strona 2/2</strong><br>
      Do startu: <strong>5 dni (04.10.2026)</strong>
    </div>
  </div>

  <!-- COMPARISON TABLE: LAST 3 KEY RUNS -->
  <div class="section-title">
    <div class="title-left">Zestawienie Ostatnich 3 Jednostek Biegowych Przed Maratonem</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Data i Dzień</th>
        <th>Typ Treningu</th>
        <th class="text-right">Dystans</th>
        <th class="text-right">Czas</th>
        <th class="text-right">Śr. Tempo</th>
        <th class="text-right">Śr. HR</th>
        <th class="text-right">Max HR</th>
        <th class="text-center">Kadencja</th>
        <th>Główny Wniosek Treningowy</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #fef2f2;">
        <td class="bold">29.09 (Wt) - DZIŚ</td>
        <td>Interwały 6x 600m / 400m</td>
        <td class="text-right bold">8,95 km</td>
        <td class="text-right bold">58:31</td>
        <td class="text-right bold">4:18 (szybkie)</td>
        <td class="text-right bold" style="color: #b91c1c;">166 bpm</td>
        <td class="text-right">195 bpm</td>
        <td class="text-center">182 spm</td>
        <td>Pobudzenie VO2max, doskonała restytucja (-58 bpm)</td>
      </tr>
      <tr>
        <td class="bold">27.09 (Nd)</td>
        <td>Bieg ciągły sprawdzian</td>
        <td class="text-right bold">10,02 km</td>
        <td class="text-right bold">55:34</td>
        <td class="text-right bold">5:33 /km</td>
        <td class="text-right bold" style="color: #b91c1c;">180 bpm</td>
        <td class="text-right">193 bpm</td>
        <td class="text-center">171 spm</td>
        <td>Mocny negative split (km 9-10 w 5:14 i 5:06 /km)</td>
      </tr>
      <tr>
        <td class="bold">25.09 (Pt)</td>
        <td>Bieg rozruchowy</td>
        <td class="text-right bold">5,02 km</td>
        <td class="text-right bold">26:11</td>
        <td class="text-right bold">5:13 /km</td>
        <td class="text-right bold" style="color: #b91c1c;">178 bpm</td>
        <td class="text-right">193 bpm</td>
        <td class="text-center">170 spm</td>
        <td>Pierwszy bieg po infekcji, pełne otwarcie płuc</td>
      </tr>
    </tbody>
  </table>

  <!-- PHYSIOLOGICAL IMPERATIVE -->
  <div class="section-title">
    <div class="title-left">Strategia Startowa: Dlaczego Dzisiejsze 4:18 /km Wymusza 6:15 – 6:20 /km w Niedzielę</div>
  </div>
  <div class="recommendation-card">
    <h4>ZALECENIE TAKTYCZNE DLA TRENERA: RESTRYKCYJNA KONTROLA TEMPA W STREFIE 2 (6:15 / KM)</h4>
    <p style="margin-bottom: 5px;">Dzisiejszy trening pokazał, że układ mięśniowy i nerwowy zawodnika mają ogromny potencjał szybkościowy (4:12–4:22/km przy kadencji 184 spm). Istnieje jednak <strong>pułapka psychologiczna</strong>: przy tak wysokiej dyspozycji łatwo ulec euforii i rozpocząć maraton w tempie 5:30–5:45/km. Na 42,195 km spowodowałoby to zużycie glikogenu przed 30. kilometrem.</p>
    
    <div style="display: flex; gap: 7px; margin-top: 6px; font-size: 9px;">
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 5px 7px;">
        <strong style="color: #1e40af;">Km 1 – 7: Żelazna Hamulcowa</strong><br>
        Tempo: <strong>6:25 – 6:30 /km</strong> | HR: &lt; 155 bpm.<br>
        Celowe spowolnienie, ignorowanie wyprzedzających biegaczy.
      </div>
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 5px 7px;">
        <strong style="color: #1e40af;">Km 7 – 30: Maszyna Tlenowa</strong><br>
        Tempo: <strong>6:15 /km</strong> | HR: 155 – 163 bpm.<br>
        Półmaraton w ok. 2h 11m – 2h 12m. Regularne żele co 40 min.
      </div>
      <div style="flex: 1; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 5px 7px;">
        <strong style="color: #1e40af;">Km 30 – 42,2: Zbieranie Rywali</strong><br>
        Tempo: <strong>6:15 – 6:20 /km</strong>.<br>
        Żel z kofeiną na 30. km, kadencja ~170 spm, finisz &lt; 4:25:00.
      </div>
    </div>
  </div>

  <!-- REMAINING 5 DAYS PLAN -->
  <div class="grid-2">
    <div class="col">
      <h3>Ostateczny Plan na Ostatnie 5 Dni (30.09 – 04.10)</h3>
      <ul>
        <li><strong>Środa 30.09:</strong> DZIEŃ WOLNY (Rest Day). Nawadnianie, rolowanie powięziowe, sen min. 8,5h.</li>
        <li><strong>Czwartek 01.10:</strong> Rozruch przedstartowy: <strong>3 – 4 km</strong> truchtu (tempo 6:30/km) + <strong>4x 60m luźne rytmy</strong>.</li>
        <li><strong>Piątek 02.10:</strong> DZIEŃ WOLNY. Początek carbo-loadingu (7g węglowodanów / kg m.c.).</li>
        <li><strong>Sobota 03.10:</strong> Odpoczynek przedstartowy, spacer 15 min po pakiet startowy. Kolacja lekkostrawna (ryż z bananem/miodem), sen o 21:30.</li>
        <li><strong>Niedziela 04.10:</strong> <strong>START MARATON (42,195 km)</strong>.</li>
      </ul>
    </div>
    <div class="col">
      <h3>Wytyczne Żywieniowe & Nawodnieniowe</h3>
      <ul>
        <li><strong>Carbo-loading (czw–sob):</strong> Zwiększenie podaży ryżu, makaronu, kasz i bananów. Ograniczenie tłuszczów i surowych warzyw (ochrona żołądka).</li>
        <li><strong>Nawodnienie:</strong> Elektrolity do wody (sód i potas) przez cały piątek i sobotę.</li>
        <li><strong>Paliwo na bieg:</strong> 5–6 żeli energetycznych. Przyjmowanie co <strong>40–45 minut</strong> (nie czekać na głód energetyczny!).</li>
        <li><strong>Kofeina na kryzys:</strong> 1 żel z dawką kofeiny zaplanowany na 28–30. km na zwalczenie zmęczenia ośrodkowego.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Dane: Garmin Connect & Oura Ring</div>
    <div>29.09.2026 | Strona 2/2</div>
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

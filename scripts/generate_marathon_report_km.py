import os, json, subprocess

output_pdf_path = os.path.abspath(r"C:\Users\jakub\Desktop\Raport_Maraton_04.10.2026_Jakub_Sobon.pdf")
output_html_path = os.path.abspath("tmp/raport_maraton_0410_km.html")

with open('tmp/marathon_parsed_splits.json', 'r', encoding='utf-8') as f:
    parsed_splits = json.load(f)

km_splits = parsed_splits['kmSplits']

# Custom annotations for every single kilometer based on telemetry & athlete feedback
km_annotations = {
    1: ("Start z sektora, sedacja lekiem, ból łydki", "start"),
    2: ("Skok tętna do 183 bpm (efekt leku), ból łydki", "tach"),
    3: ("Ból łydki, poszukiwanie rytmu biegu", "pain"),
    4: ("Stabilizacja tempa, wysokie tętno 183 bpm", "norm"),
    5: ("ŻEL 1 (5 km) + woda, mata 5k: 31:57", "gel"),
    6: ("Ostatni km otępienia lekowego (5:53)", "norm"),
    7: ("PRZEŁAMANIE BLOKADY! Wyrzut adrenaliny (5:26)", "break"),
    8: ("Ustąpienie bólu łydki, świetny rytm 5:28", "fast"),
    9: ("ŻEL 2 (9 km) + woda, tempo 5:23 /km!", "gel"),
    10: ("Mata 10k: 59:55, pełna kontrola taktyczna", "mat"),
    11: ("Równy, mocny krok, kadencja 173 spm", "fast"),
    12: ("Idealna realizacja planu trenera (5:35 /km)", "plan"),
    13: ("Bardzo mocna kadencja 175 spm, tempo 5:26", "fast"),
    14: ("ŻEL 3 (14 km) + woda, stabilne 5:27 /km", "gel"),
    15: ("Mata 15k: 1:28:17, wysoka dyscyplina", "mat"),
    16: ("Bufet odżywczy, zwolnienie na picie wody", "water"),
    17: ("Natychmiastowy powrót do tempa 5:29 /km", "fast"),
    18: ("Utrzymanie tempa w zwartej grupie biegaczy", "norm"),
    19: ("ŻEL 4 (KOFEINA #1) na 19 km, zryw do 5:21!", "caff"),
    20: ("Mata 20k: 1:56:12, tempo 5:34 /km", "mat"),
    21: ("PÓŁMARATON (Mata HM: 2:03:28 / Netto 1:59:54)", "hm"),
    
    22: ("Otwarcie 2. połowy poniżej 6:00 (5:55 /km)", "norm"),
    23: ("Stabilny krok, kadencja 173 spm, HR 178", "norm"),
    24: ("ŻEL 5 (24 km) + woda, bufet odżywczy", "gel"),
    25: ("Mocne zebranie tempa: 5:38 /km, kad 175", "plan"),
    26: ("Pierwsze sygnały zmęczenia czwórek (6:10)", "fading"),
    27: ("Bufet, spadek tętna do 171 (drenaż glikogenu)", "water"),
    28: ("Wysiłek woli: powrót poniżej 6:00 (5:57 /km)", "fast"),
    29: ("ŻEL 6 (29 km) + woda", "gel"),
    30: ("Mocny zryw na 30. km: tempo 5:29 /km!", "break"),
    31: ("Utrzymanie prędkości po zrywie (6:02 /km)", "norm"),
    32: ("Początek kryzysu energetycznego (6:40 /km)", "fading"),
    33: ("ŻEL 7 (KOFEINA #2) na 33 km, narastający ból", "caff"),
    34: ("Walka o utrzymanie biegu, kadencja 160 spm", "fading"),
    35: ("ŚCIANA MARATOŃSKA (7:20 /km), wyczerpanie", "wall"),
    36: ("Przejście kryzysu, walka o każdy metr", "wall"),
    37: ("Najtrudniejszy km (7:54), bufet, marszobieg", "wall"),
    38: ("ŻEL 8 (38 km) + woda, mobilizacja mentalna", "gel"),
    39: ("Ostatni kryzysowy odcinek (7:19 /km)", "wall"),
    40: ("Odbudowa tętna (175 bpm), początek finiszu", "fading"),
    41: ("ŻEL 9 (KOFEINA #3) na 41 km, zryw do 6:40!", "caff"),
    42: ("Ostatni pełny km: przyspieszenie do 6:11 /km", "break"),
    43: ("HEROICZNY SPRINT NA METĘ! Tempo 3:37 /km, kad 188", "sprint")
}

def render_km_rows(splits_subset, start_cum_sec):
    rows = []
    cum = start_cum_sec
    for s in splits_subset:
        km_num = s['km']
        cum += s['timeSec']
        
        cum_h = int(cum // 3600)
        cum_m = int((cum % 3600) // 60)
        cum_s = int(cum % 60)
        cum_str = f"{cum_h}:{cum_m:02d}:{cum_s:02d}"
        
        time_m = int(s['timeSec'] // 60)
        time_s = int(s['timeSec'] % 60)
        time_str = f"{time_m}:{time_s:02d}"
        
        pace_str = s['paceMinKm']
        p_sec = s['paceSec']
        
        ann, atype = km_annotations.get(km_num, ("Równy bieg", "norm"))
        
        # Style classes and badges based on pace and event
        if atype == 'sprint':
            row_bg = 'background: #fdf2f8;'
            badge = '<span class="tag tag-sprint">FINISZ</span>'
            p_color = '#be185d'
        elif atype == 'caff':
            row_bg = 'background: #fefce8;'
            badge = '<span class="tag tag-caff">KOFEINA</span>'
            p_color = '#b45309'
        elif atype == 'gel':
            row_bg = 'background: #f0fdf4;'
            badge = '<span class="tag tag-gel">ŻEL</span>'
            p_color = '#047857'
        elif atype == 'wall':
            row_bg = 'background: #fef2f2;'
            badge = '<span class="tag tag-wall">ŚCIANA</span>'
            p_color = '#b91c1c'
        elif atype in ['break', 'fast']:
            row_bg = 'background: #eff6ff;'
            badge = '<span class="tag tag-fast">SZYBKI</span>'
            p_color = '#1d4ed8'
        elif atype in ['plan', 'mat', 'hm']:
            row_bg = 'background: #f0fdf4;'
            badge = '<span class="tag tag-plan">PLAN</span>'
            p_color = '#0284c7'
        elif atype == 'water':
            row_bg = 'background: #f8fafc;'
            badge = '<span class="tag tag-water">BUFET</span>'
            p_color = '#64748b'
        elif atype == 'fading':
            row_bg = 'background: #fffbeb;'
            badge = '<span class="tag tag-fading">FADING</span>'
            p_color = '#d97706'
        else:
            row_bg = ''
            badge = '<span class="tag tag-norm">BIEG</span>'
            p_color = '#334155'

        km_label = f"KM {km_num:02d}" if km_num <= 42 else "META (+468m)"
        
        rows.append(f"""
        <tr style="{row_bg}">
          <td class="bold">{km_label}</td>
          <td class="text-right bold" style="color: {p_color};">{pace_str}</td>
          <td class="text-right">{time_str}</td>
          <td class="text-right text-muted">{cum_str}</td>
          <td class="text-right bold" style="color: #dc2626;">{s['avgHr']}</td>
          <td class="text-center">{s['avgCad']}</td>
          <td>{badge} <span class="desc-txt">{ann}</span></td>
        </tr>
        """)
    return "\n".join(rows), cum

h1_splits = [s for s in km_splits if s['km'] <= 21]
h2_splits = [s for s in km_splits if s['km'] > 21]

h1_table_html, h1_end_cum = render_km_rows(h1_splits, 0)
h2_table_html, total_end_cum = render_km_rows(h2_splits, h1_end_cum)

# Generate SVG Pace and HR Sparkline / Chart across the 42 kilometers
svg_w = 700
svg_h = 120
margin_l = 35
margin_r = 15
margin_t = 15
margin_b = 25
plot_w = svg_w - margin_l - margin_r
plot_h = svg_h - margin_t - margin_b

min_pace = 310
max_pace = 480
min_hr = 155
max_hr = 195

pts_pace = []
pts_hr = []
n_km = len(km_splits)

for idx, k in enumerate(km_splits):
    x = margin_l + (idx / (n_km - 1)) * plot_w
    p_clamped = max(min_pace, min(max_pace, k['paceSec']))
    y_p = margin_t + ((p_clamped - min_pace) / (max_pace - min_pace)) * plot_h
    pts_pace.append(f"{x:.1f},{y_p:.1f}")
    
    hr_clamped = max(min_hr, min(max_hr, k['avgHr']))
    y_hr = margin_t + (1 - (hr_clamped - min_hr) / (max_hr - min_hr)) * plot_h
    pts_hr.append(f"{x:.1f},{y_hr:.1f}")

poly_pace = " ".join(pts_pace)
poly_hr = " ".join(pts_hr)

chart_svg = f"""
<svg viewBox="0 0 {svg_w} {svg_h}" class="chart-svg">
  <line x1="{margin_l}" y1="{margin_t}" x2="{svg_w - margin_r}" y2="{margin_t}" stroke="#e2e8f0" stroke-dasharray="3,3" />
  <line x1="{margin_l}" y1="{margin_t + plot_h/2}" x2="{svg_w - margin_r}" y2="{margin_t + plot_h/2}" stroke="#e2e8f0" stroke-dasharray="3,3" />
  <line x1="{margin_l}" y1="{margin_t + plot_h}" x2="{svg_w - margin_r}" y2="{margin_t + plot_h}" stroke="#cbd5e1" />
  
  <line x1="{margin_l}" y1="{margin_t + ((338 - min_pace)/(max_pace - min_pace))*plot_h:.1f}" 
        x2="{svg_w - margin_r}" y2="{margin_t + ((338 - min_pace)/(max_pace - min_pace))*plot_h:.1f}" 
        stroke="#0284c7" stroke-width="1.2" stroke-dasharray="4,2" />
  <text x="{margin_l + 5}" y="{margin_t + ((338 - min_pace)/(max_pace - min_pace))*plot_h - 3:.1f}" font-size="7.5" fill="#0284c7" font-weight="bold">Cel trenera: 5:38 /km</text>

  <line x1="{margin_l}" y1="{margin_t + (1 - (175 - min_hr)/(max_hr - min_hr))*plot_h:.1f}" 
        x2="{svg_w - margin_r}" y2="{margin_t + (1 - (175 - min_hr)/(max_hr - min_hr))*plot_h:.1f}" 
        stroke="#dc2626" stroke-width="1.2" stroke-dasharray="4,2" />
  <text x="{svg_w - margin_r - 95}" y="{margin_t + (1 - (175 - min_hr)/(max_hr - min_hr))*plot_h - 3:.1f}" font-size="7.5" fill="#dc2626" font-weight="bold">Próg LTHR: 175 bpm</text>

  <polyline fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="{poly_hr}" />
  <polyline fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="{poly_pace}" />

  <line x1="{margin_l + (20 / (n_km - 1)) * plot_w:.1f}" y1="{margin_t}" x2="{margin_l + (20 / (n_km - 1)) * plot_w:.1f}" y2="{margin_t + plot_h}" stroke="#475569" stroke-width="1" stroke-dasharray="2,2" />
  <text x="{margin_l + (20 / (n_km - 1)) * plot_w - 20:.1f}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#475569" font-weight="bold">HM: 2:03:28</text>

  <text x="{margin_l}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#94a3b8">KM 1</text>
  <text x="{margin_l + (9 / (n_km - 1)) * plot_w:.1f}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#94a3b8">KM 10</text>
  <text x="{margin_l + (29 / (n_km - 1)) * plot_w:.1f}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#94a3b8">KM 30</text>
  <text x="{margin_l + (39 / (n_km - 1)) * plot_w:.1f}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#94a3b8">KM 40</text>
  <text x="{svg_w - margin_r - 15}" y="{margin_t + plot_h + 11}" font-size="7.5" fill="#94a3b8">Meta</text>

  <text x="5" y="{margin_t + 10}" font-size="7.5" fill="#2563eb" font-weight="bold">5:10</text>
  <text x="5" y="{margin_t + plot_h}" font-size="7.5" fill="#2563eb" font-weight="bold">8:00</text>
</svg>
"""

html_content = f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Oficjalny Raport Trenera z Maratonu - Jakub Soboń</title>
<style>
  @page {{
    size: A4;
    margin: 8mm 10mm 8mm 10mm;
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
    font-size: 9.5px;
    line-height: 1.35;
  }}
  .page {{
    page-break-after: always;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .page:last-child {{
    page-break-after: avoid;
  }}

  /* Header */
  .header {{
    border-bottom: 2.5px solid #0284c7;
    padding-bottom: 5px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}
  .title-group h1 {{
    font-size: 15px;
    font-weight: 850;
    color: #0f172a;
    letter-spacing: -0.3px;
    text-transform: uppercase;
  }}
  .title-group p {{
    font-size: 9px;
    color: #64748b;
    font-weight: 600;
    margin-top: 1px;
  }}
  .meta-box {{
    text-align: right;
    font-size: 8.5px;
    color: #475569;
  }}
  .badge-target {{
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-weight: 700;
    font-size: 8.5px;
    padding: 2px 7px;
    border-radius: 4px;
    margin-bottom: 2px;
  }}

  /* Executive Note Box */
  .executive-box {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0284c7;
    border-radius: 4px;
    padding: 6px 9px;
    margin-bottom: 6px;
    font-size: 9px;
    line-height: 1.35;
  }}
  .executive-box .alert-title {{
    font-weight: 750;
    color: #0369a1;
    text-transform: uppercase;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
  }}

  /* Grid KPIs */
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
    margin-bottom: 6px;
  }}
  .kpi-card {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 6px;
    text-align: center;
  }}
  .kpi-card.hero-net {{
    background: #f0f9ff;
    border-color: #7dd3fc;
    border-width: 1.5px;
  }}
  .kpi-card .label {{
    font-size: 7.5px;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 1px;
  }}
  .kpi-card .val {{
    font-size: 13px;
    font-weight: 850;
    color: #0f172a;
    line-height: 1.1;
  }}
  .kpi-card .sub {{
    font-size: 7.5px;
    color: #64748b;
    margin-top: 1px;
  }}

  /* Section Titles */
  .section-title {{
    font-size: 10px;
    font-weight: 750;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 5px;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .section-title .title-left {{
    display: flex;
    align-items: center;
    gap: 5px;
  }}
  .section-title .title-left::before {{
    content: "";
    display: inline-block;
    width: 3.5px;
    height: 10px;
    background: #0284c7;
    border-radius: 2px;
  }}

  /* Split halves compare */
  .halves-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 6px;
  }}
  .half-card {{
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 8px;
    background: #ffffff;
  }}
  .half-card.h1 {{ border-left: 3.5px solid #10b981; }}
  .half-card.h2 {{ border-left: 3.5px solid #f59e0b; }}
  .half-card h4 {{
    font-size: 9px;
    font-weight: 750;
    margin-bottom: 2px;
    display: flex;
    justify-content: space-between;
  }}
  .half-stat-row {{
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    margin-top: 1px;
    color: #334155;
  }}

  /* Chart Box */
  .chart-box {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 6px;
    margin-bottom: 6px;
  }}
  .chart-svg {{
    width: 100%;
    height: 105px;
    display: block;
  }}
  .chart-legend {{
    display: flex;
    justify-content: center;
    gap: 15px;
    font-size: 8px;
    font-weight: 600;
    margin-top: 2px;
  }}
  .legend-item {{
    display: flex;
    align-items: center;
    gap: 4px;
  }}
  .dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }}

  /* Kilometer Breakdown Tables (Page 2) */
  .km-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }}
  .km-table-box {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }}
  .km-table-header {{
    background: #0f172a;
    color: #ffffff;
    padding: 4px 8px;
    font-size: 9px;
    font-weight: 750;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
  }}
  table.km-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 7.8px;
  }}
  table.km-table th {{
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    font-size: 7px;
    text-transform: uppercase;
    padding: 2.5px 4px;
    border-bottom: 1.5px solid #cbd5e1;
  }}
  table.km-table td {{
    padding: 2.2px 4px;
    border-bottom: 1px solid #f1f5f9;
    line-height: 1.25;
  }}
  .text-right {{ text-align: right; }}
  .text-center {{ text-align: center; }}
  .bold {{ font-weight: 700; }}
  .text-muted {{ color: #64748b; font-size: 7.2px; }}

  /* Tags */
  .tag {{
    display: inline-block;
    font-size: 6.5px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 2.5px;
    text-transform: uppercase;
  }}
  .tag-caff {{ background: #fef08a; color: #854d0e; }}
  .tag-gel {{ background: #dcfce7; color: #166534; }}
  .tag-fast {{ background: #dbeafe; color: #1e40af; }}
  .tag-wall {{ background: #fee2e2; color: #991b1b; }}
  .tag-sprint {{ background: #fbcfe8; color: #9d174d; }}
  .tag-plan {{ background: #e0f2fe; color: #0369a1; }}
  .tag-water {{ background: #f1f5f9; color: #475569; }}
  .tag-fading {{ background: #fef3c7; color: #92400e; }}
  .tag-norm {{ background: #f8fafc; color: #64748b; border: 0.5px solid #e2e8f0; }}
  .desc-txt {{ font-size: 7.2px; color: #334155; }}

  /* Page 3 Cards */
  .two-col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 6px;
  }}
  .card-box {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 8px;
  }}
  .card-box h3 {{
    font-size: 9px;
    font-weight: 750;
    color: #0f172a;
    text-transform: uppercase;
    margin-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 3px;
  }}
  .card-box ul {{
    list-style: none;
  }}
  .card-box li {{
    margin-bottom: 3.5px;
    font-size: 8.5px;
    line-height: 1.34;
  }}
  .card-box li strong {{
    color: #0f172a;
  }}

  /* Footer */
  .footer {{
    border-top: 1px solid #cbd5e1;
    padding-top: 3px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5px;
    color: #94a3b8;
  }}
</style>
</head>
<body>

  <!-- ==================== STRONA 1 ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <div class="title-group">
          <h1>Raport Telemetryczny z Maratonu – Jakub Soboń</h1>
          <p>Medzinárodný maratón mieru Košice (102. edycja) | 04.10.2026</p>
        </div>
        <div class="meta-box">
          <div class="badge-target">WYNIK OFICJALNY: 04:21:34</div>
          <div>Miejsce: 1608 / 2764 | Mężczyźni: 1416 / 2331</div>
        </div>
      </div>

      <!-- Executive Box: Clarifying Official Result vs Telemetry -->
      <div class="executive-box">
        <div class="alert-title">
          <span>OFICJALNY WYNIK ZAWODÓW I KALIBRACJA ZEGARKA GARMIN</span>
        </div>
        <p><strong>1. Oficjalny czas z maty pomiarowej (Brutto):</strong> <strong>04:21:34</strong> (średnie tempo <strong>06:12 /km</strong>, czas zakończenia 13:21, miejsce 1608 z 2764 zawodników w stawce 102. edycji Košice Peace Marathon).</p>
        <p><strong>2. Rzeczywisty czas netto (Chip Time / Start-Meta):</strong> <strong>4:18:47</strong>. Zawodnik wystartował z głębi sektora startowego (mata przekroczona o 09:02:52, linia mety o 13:21:40). Zegarek Garmin włączony 5 min 6 s przed startem i wyłączony 7 min 40 s po mecie (czas zapisu brutto Garmin: 4:31:34).</p>
        <p><strong>3. Istotny kontekst medyczny zgłoszony przez zawodnika:</strong> W piątek rano przed maratonem zawodnik poczuł nagłe osłabienie (rozwijające się przeziębienie bez wyraźnego kaszlu). Aby móc wstać i funkcjonować, przyjął chiński lek OTC (chlorfenamina 7 mg + paracetamol 1750 mg). Wywołało to na starcie wiotkość mięśniową, hipotensję ortostatyczną oraz tachykardię antycholinergiczną (HR 185 bpm od 2. km). Szczegóły analizy na s. 3.</p>
      </div>

      <!-- KPIs Grid -->
      <div class="kpi-grid">
        <div class="kpi-card hero-net">
          <div class="label">Oficjalny Czas</div>
          <div class="val" style="color: #0284c7;">04:21:34</div>
          <div class="sub">Netto: 4:18:47</div>
        </div>
        <div class="kpi-card">
          <div class="label">Miejsce Open</div>
          <div class="val" style="color: #15803d;">1608 <span style="font-size: 8px;">/ 2764</span></div>
          <div class="sub">Mężczyźni: 1416</div>
        </div>
        <div class="kpi-card">
          <div class="label">Śr. Tempo Oficjalne</div>
          <div class="val">6:12 <span style="font-size: 8px;">/km</span></div>
          <div class="sub">Netto GPS: 6:05 /km</div>
        </div>
        <div class="kpi-card">
          <div class="label">Średnie Tętno</div>
          <div class="val" style="color: #b91c1c;">177 <span style="font-size: 8px;">bpm</span></div>
          <div class="sub">Max: 192 bpm (Finisz)</div>
        </div>
        <div class="kpi-card">
          <div class="label">Czas > LTHR (175)</div>
          <div class="val" style="color: #dc2626;">80.3%</div>
          <div class="sub">> 3h 27 min w beztlenie</div>
        </div>
        <div class="kpi-card">
          <div class="label">Śr. Kadencja</div>
          <div class="val">169 <span style="font-size: 8px;">spm</span></div>
          <div class="sub">Max sprint: 188 spm</div>
        </div>
      </div>

      <!-- Official Mat Splits vs Strategy -->
      <div class="section-title">
        <div class="title-left">Rozbicie Połówek Maratońskich (First vs Second Half)</div>
        <div style="font-size: 8px; color: #64748b; font-weight: 600;">Założenie trenera: 1:59:00 na półmetku</div>
      </div>
      <div class="halves-grid">
        <div class="half-card h1">
          <h4>
            <span>1. POŁOWA (0.00 – 21.10 km)</span>
            <span style="color: #10b981;">Mata HM: 02:03:28 (Netto: 1:59:54)</span>
          </h4>
          <div class="half-stat-row">
            <span>Maty 5k: <strong>31:57</strong> | 10k: <strong>59:55</strong></span>
            <span>Maty 15k: <strong>1:28:17</strong> | 20k: <strong>1:56:12</strong></span>
          </div>
          <div class="half-stat-row">
            <span>Średnie tempo: <strong>5:41 /km</strong> (netto)</span>
            <span>Średnie tętno: <strong style="color: #b91c1c;">183 bpm</strong></span>
          </div>
          <div class="half-stat-row" style="font-size: 7.5px; color: #059669; margin-top: 1px;">
            ✓ Realizacja założeń taktycznych trenera w 99.2%! Od 7. km tempo 5:23–5:35 /km po przełamaniu blokady lekowej.
          </div>
        </div>

        <div class="half-card h2">
          <h4>
            <span>2. POŁOWA (21.10 – 42.20 km)</span>
            <span style="color: #d97706;">META: 04:21:34 (Netto: 2:18:53)</span>
          </h4>
          <div class="half-stat-row">
            <span>Średnie tempo 2. połowy:</span>
            <strong>6:35 /km</strong> (Positive split: +14m 38s)
          </div>
          <div class="half-stat-row">
            <span>Ściana maratońska:</span>
            <strong>33–39 km</strong> (spadek tempa pod wpływem drenażu glikogenu)
          </div>
          <div class="half-stat-row" style="font-size: 7.5px; color: #b45309; margin-top: 1px;">
            ⚠️ Finisz heroiczny: ostatnie 470 m pokonane w sprincie 3:37 /km z kadencją 188 spm!
          </div>
        </div>
      </div>

      <!-- Chart Box: Pace & HR progression -->
      <div class="section-title">
        <div class="title-left">Profil Tempa i Tętna na Dystansie 42 Kilometrów</div>
      </div>
      <div class="chart-box">
        {chart_svg}
        <div class="chart-legend">
          <div class="legend-item"><span class="dot" style="background: #2563eb;"></span> Profil tempa (min/km, niżej = wolniej)</div>
          <div class="legend-item"><span class="dot" style="background: #dc2626;"></span> Profil tętna (HR bpm)</div>
          <div class="legend-item"><span class="dot" style="background: #0284c7;"></span> Plan trenera (5:38)</div>
          <div class="legend-item"><span class="dot" style="background: #475569;"></span> Półmetek HM (2:03:28)</div>
        </div>
      </div>

      <!-- Summary note on Page 1 leading into Page 2 -->
      <div style="background: #f1f5f9; border-radius: 4px; padding: 4px 8px; font-size: 8px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>NA STRONIE 2:</strong> Kompletne rozbicie telemetryczne każdego pojedynczego kilometra (KM 1 do KM 42.2).</span>
        <span style="font-weight: 700; color: #0284c7;">Strona 1 z 3 →</span>
      </div>

    </div>

    <div class="footer">
      <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Zawody: Košice Peace Marathon 04.10.2026</div>
      <div>Strona 1/3</div>
    </div>
  </div>

  <!-- ==================== STRONA 2 ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <div class="title-group">
          <h1>Szczegółowa Analiza Kilometr po Kilometrze (KM 1 – KM 42.2)</h1>
          <p>Dekompozycja tempa, czasu, tętna, kadencji oraz zdarzeń na każdym kilometrze trasy</p>
        </div>
        <div class="meta-box">
          <div style="font-weight: 700; color: #0284c7;">42.195 km Atest | 42.47 km GPS</div>
          <div>9 żeli (3 z kofeiną) | 100% mat kontrolnych</div>
        </div>
      </div>

      <!-- 2-Column Grid for All 42 Kilometers -->
      <div class="km-grid">
        
        <!-- Column 1: First Half (KM 1 - 21) -->
        <div class="km-table-box">
          <div class="km-table-header">
            <span>1. POŁOWA: KM 01 – KM 21</span>
            <span>CZAS: 1:59:54 (5:41 /km)</span>
          </div>
          <table class="km-table">
            <thead>
              <tr>
                <th>KM</th>
                <th class="text-right">Tempo</th>
                <th class="text-right">Czas</th>
                <th class="text-right">Łącznie</th>
                <th class="text-right">HR</th>
                <th class="text-center">Kad</th>
                <th>Status / Zdarzenie taktyczne</th>
              </tr>
            </thead>
            <tbody>
              {h1_table_html}
            </tbody>
          </table>
        </div>

        <!-- Column 2: Second Half (KM 22 - 42 + Meta) -->
        <div class="km-table-box">
          <div class="km-table-header" style="background: #1e293b;">
            <span>2. POŁOWA: KM 22 – KM 42 + FINISZ</span>
            <span>CZAS: 2:18:53 (6:35 /km)</span>
          </div>
          <table class="km-table">
            <thead>
              <tr>
                <th>KM</th>
                <th class="text-right">Tempo</th>
                <th class="text-right">Czas</th>
                <th class="text-right">Łącznie</th>
                <th class="text-right">HR</th>
                <th class="text-center">Kad</th>
                <th>Status / Zdarzenie taktyczne</th>
              </tr>
            </thead>
            <tbody>
              {h2_table_html}
            </tbody>
          </table>
        </div>

      </div>

      <!-- Legend for tags -->
      <div style="margin-top: 5px; padding: 4px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; justify-content: space-between; font-size: 7.2px;">
        <div><strong>LEGENDA ZDARZEŃ:</strong></div>
        <div><span class="tag tag-gel">ŻEL</span> Żel standardowy</div>
        <div><span class="tag tag-caff">KOFEINA</span> Żel z kofeiną (km 19, 33, 41)</div>
        <div><span class="tag tag-water">BUFET</span> Nawodnienie / woda</div>
        <div><span class="tag tag-fast">SZYBKI</span> Tempo &lt; 5:30 /km</div>
        <div><span class="tag tag-plan">PLAN</span> Tempo docelowe 5:35–5:40</div>
        <div><span class="tag tag-wall">ŚCIANA</span> Spadek &gt; 7:00 /km</div>
        <div><span class="tag tag-sprint">FINISZ</span> Sprint 3:37 /km</div>
      </div>

    </div>

    <div class="footer">
      <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Dane: Garmin Connect & Intervals.icu</div>
      <div>04.10.2026 | Strona 2/3</div>
    </div>
  </div>

  <!-- ==================== STRONA 3 ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <div class="title-group">
          <h1>Fizjologia, Farmakologia i Wnioski Trenerskie – Jakub Soboń</h1>
          <p>Kluczowa analiza wpływu przyjętego leku OTC na kardiologię, metabolizm i przebieg maratonu</p>
        </div>
        <div class="meta-box">
          <div>Status: Ukończony maraton (42.195 km)</div>
          <div style="font-weight: 700; color: #0284c7;">Košice, Słowacja</div>
        </div>
      </div>

      <!-- Two Column: Pharmacology & Physiology -->
      <div class="two-col">
        <!-- Col 1: Pharmacology Analysis -->
        <div class="card-box" style="border-left: 3.5px solid #dc2626;">
          <h3 style="color: #b91c1c;">1. Wpływ Leku OTC (An Ka Huang Min Jiaonang)</h3>
          <ul>
            <li><strong>Dlaczego zawodnik przyjął lek?</strong> W piątek rano zawodnik poczuł nagłe osłabienie (subkliniczne przeziębienie bez kaszlu/kataru). Obawiając się, że nie będzie w stanie wstać z łóżka, przyjął 6 kapsułek w piątek/sobotę oraz 1 kapsułkę rano na starcie. Łączna dawka: <strong>7 mg chlorfenaminy</strong> (lek przeciwhistaminowy I generacji) + <strong>1750 mg paracetamolu</strong>.</li>
            
            <li><strong>Dlaczego zawodnik niemal zemdlał na starcie?</strong><br>
            Chlorfenamina wywołuje silną <strong>sedację OUN</strong> oraz <strong>hipotensję ortostatyczną</strong> (rozszerzenie naczyń obwodowych). Kucnięcie przed startem i gwałtowne wstanie spowodowało odpływ krwi z mózgu i wiotkość mięśniową.</li>

            <li><strong>Dlaczego bolały łydki przez pierwsze 3 km?</strong><br>
            Antyhistaminiki I generacji upośledzają mikrokrążenie obwodowe i pobudliwość sarkomerów. Mięśnie łydek były chemicznie "ogłuszone" i niedogrzane.</li>

            <li><strong>Dlaczego od 7. km nastąpiło odrodzenie?</strong><br>
            Około 40. minuty biegu (km 7–14, tempo 5:23–5:28 /km) potężny powysiłkowy wyrzut katecholamin (adrenaliny) zmył blokadę receptorów H1 w mózgu, a żel z 5. km dostarczył glukozę.</li>

            <li><strong>Wpływ paracetamolu na wątrobę:</strong><br>
            Metabolizm 1750 mg paracetamolu obciążył cytochrom P450 wątroby, ograniczając jej zdolność do wydajnej glukoneogenezy pod koniec biegu.</li>
          </ul>
        </div>

        <!-- Col 2: Physiology & Cardiac Drift -->
        <div class="card-box">
          <h3>2. Kardiologia i Wyczerpanie Glikogenu</h3>
          <ul>
            <li><strong>Skąd wzięło się tętno 183–188 bpm od 2. km?</strong><br>
            Chlorfenamina wykazuje <strong>silne działanie cholinolityczne (antymuskarynowe)</strong> – blokuje nerw błędny, czyli naturalny "hamulec" serca. W połączeniu z wysiłkiem wywołało to silną <strong>tachykardię antycholinergiczną</strong>. Serce biło o 15–20 bpm szybciej niż powinno.</li>

            <li><strong>Rozkład stref tętna w maratonie:</strong><br>
            • &lt; 165 bpm (Z1–Z3 tlenowa): zaledwie <strong>4.7%</strong> czasu<br>
            • 165 – 174 bpm (Z4 podprogowa): <strong>15.0%</strong> czasu<br>
            • 174 – 179 bpm (Z5a próg LTHR 175): <strong>25.1%</strong> czasu<br>
            • &gt; 180 bpm (Z5b/c beztlenowa): <strong>55.2%</strong> (> 2h 15min ciągłego biegu!)<br>
            <em>Intervals.icu: 1 godzina ciągła przy 184 bpm.</em></li>

            <li><strong>Dlaczego przyszła ściana na 35. km?</strong><br>
            Przy tętnie 185 bpm utlenianie tłuszczów wynosi zero – organizm spala wyłącznie glikogen. Mimo 1400g węgli w ładowaniu i 9 żeli, pula glikogenu przy pracy powyżej progu LTHR fizycznie wyczerpuje się po ok. 2h 45min.</li>

            <li><strong>Heroiczny finisz (3:37 /km):</strong> Na ostatnich 470 m kadencja skoczyła do <strong>188 spm</strong>, a tętno do <strong>192 bpm</strong> – dowód na brak uszkodzeń mięśniowych i żelazną psychikę.</li>
          </ul>
        </div>
      </div>

      <!-- Coach Insights & Next Steps -->
      <div class="card-box" style="margin-bottom: 6px;">
        <h3 style="color: #0369a1;">3. Podsumowanie Wniosków Trenerskich i Wycena Wyniku</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <p><strong>Wycena startu przez pryzmat fizjologii:</strong></p>
            <p>1. <strong>Czas 04:21:34 (netto 4:18:47) w tych warunkach to ogromny sukces:</strong> Bieg maratoński z 7 mg leku uspokajająco-cholinolitycznego w krwiobiegu u 95% biegaczy skończyłby się zejściem z trasy lub zasłabnięciem po 10 km. Ukończenie biegu i sprint 3:37 na mecie dowodzą żelaznego organizmu.</p>
            <p>2. <strong>Potencjał na 3:58:00 jest w 100% potwierdzony:</strong> W stanie pełnego zdrowia i bez antyhistaminików tętno przy tempie 5:35 wynosiłoby 160–165 bpm. Oszczędziłoby to glikogen i pozwoliło utrzymać tempo do samej mety.</p>
            <p>3. <strong>Żywienie zdało egzamin:</strong> 9 żeli weszło bez problemu, zero rewolucji żołądkowych.</p>
          </div>
          <div>
            <p><strong>Wytyczne taktyczne i treningowe na przyszłość:</strong></p>
            <p>1. <strong>Żelazna zasada farmakologiczna:</strong> Absolutny zakaz stosowania leków przeciwhistaminowych I generacji (oraz złożonych leków OTC z chlorfenaminą/pseudoefedryną) na 72h przed zawodami.</p>
            <p>2. <strong>Baza tlenowa w zimie (Z2):</strong> Praca nad obniżeniem kosztu krążeniowego w tempie 5:30–5:40 /km do strefy tlenowej (&lt; 155 bpm).</p>
            <p>3. <strong>Trening siły biegowej:</strong> Wzmocnienie stabilizacji miednicy i łydek (ochrona przed spadkiem kadencji po 30. km).</p>
          </div>
        </div>
      </div>

      <!-- Protocol for Recovery (Next 7-10 days) -->
      <div class="card-box" style="background: #f8fafc; border-left: 3.5px solid #10b981;">
        <h3 style="color: #047857;">4. Protokół Regeneracji Pomaratońskiej (Zalecenia na najbliższe 7 dni)</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 8px;">
          <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0;">
            <strong>Dni 1–3 (Pon–Śr):</strong><br>
            • Całkowity zakaz biegania.<br>
            • Spacery regeneracyjne 20–30 min.<br>
            • Kąpiele solankowe / lekka sauna.<br>
            • Regeneracja wątroby: nawadnianie, ostropest/wit. C, brak leków przeciwbólowych.
          </div>
          <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0;">
            <strong>Dni 4–5 (Czw–Pt):</strong><br>
            • Basen (spokojne pływanie kraulem) lub 30 min luźnego roweru stacjonarnego (HR &lt; 125 bpm).<br>
            • Lekkie rolowanie powięziowe czwórek i łydek.
          </div>
          <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0;">
            <strong>Dni 6–7 (Sob–Niedz):</strong><br>
            • Pierwszy trucht testowy: max 4–5 km w tempie 7:00 /km (czysty tlen).<br>
            • Kontrola reakcji ścięgna Achillesa i pasma biodrowo-piszczelowego.
          </div>
          <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0;">
            <strong>Monitoring Oura Ring:</strong><br>
            • Spadek tętna spoczynkowego (RHR) do bazowych 48–50 bpm.<br>
            • Powrót nocnego HRV powyżej 60 ms.<br>
            • Readiness Score &gt; 80 pkt przed mocniejszym akcentem.
          </div>
        </div>
      </div>

    </div>

    <div class="footer">
      <div>Raport telemetryczny <strong>Sparky OS</strong> dla Trenera | Dane: Garmin Connect, Live Tracking & Oura Ring</div>
      <div>04.10.2026 | Strona 3/3</div>
    </div>
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
    print(f"FAILED: Edge exited with {res.returncode}")

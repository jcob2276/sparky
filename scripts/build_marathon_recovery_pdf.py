import os
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Register TrueType fonts for Polish character support
pdfmetrics.registerFont(TTFont('SegoeUI', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeUI-Bold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFont(TTFont('SegoeUI-Italic', 'C:/Windows/Fonts/segoeuii.ttf'))

# Load parsed data
with open("tmp/parsed_runs_report_data.json", "r", encoding="utf-8") as f:
    runs_data = json.load(f)

with open("tmp/calculated_km_splits.json", "r", encoding="utf-8") as f:
    splits_data = json.load(f)

# NumberedCanvas for "Strona X z Y" and dark background
class DarkReportCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, total_pages):
        self.saveState()
        self.setFont('SegoeUI', 8)
        self.setFillColor(colors.HexColor('#64748b'))
        page_str = f"Strona {self._pageNumber} z {total_pages}"
        self.drawRightString(A4[0] - 42, 24, page_str)
        self.restoreState()

def draw_background_decorations(canv, doc):
    canv.saveState()
    # Draw background FIRST so flowables render on top!
    canv.setFillColor(colors.HexColor('#0b1120'))
    canv.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    
    # Header accent line
    canv.setStrokeColor(colors.HexColor('#1e293b'))
    canv.setLineWidth(1)
    canv.line(42, A4[1] - 38, A4[0] - 42, A4[1] - 38)
    
    # Header top brand text
    canv.setFont('SegoeUI-Bold', 7.5)
    canv.setFillColor(colors.HexColor('#38bdf8'))
    canv.drawString(42, A4[1] - 30, "GARMIN CONNECT™ ANALYTICS")
    canv.setFont('SegoeUI', 7.5)
    canv.setFillColor(colors.HexColor('#64748b'))
    canv.drawString(185, A4[1] - 30, "•   SPARKY PERSONAL OS   •   POST-MARATHON READAPTATION")
    
    # Footer line
    canv.setStrokeColor(colors.HexColor('#1e293b'))
    canv.line(42, 36, A4[0] - 42, 36)
    
    canv.setFont('SegoeUI', 8)
    canv.setFillColor(colors.HexColor('#64748b'))
    canv.drawString(42, 24, "Raport wygenerowany z API Garmin Connect dla: Jakub  •  Košice Peace Marathon Follow-Up")
    canv.restoreState()


def create_pdf(output_filename="Raport_Biegi_Po_Maratonie_Garmin.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=50,
        bottomMargin=48
    )

    usable_width = A4[0] - 84 # ~511 pt

    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='SegoeUI-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#f8fafc'),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='SegoeUI',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#94a3b8'),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1',
        fontName='SegoeUI-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#38bdf8'),
        spaceBefore=12,
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        'Heading2',
        fontName='SegoeUI-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#e2e8f0'),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='SegoeUI',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#cbd5e1'),
        spaceAfter=6
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        fontName='SegoeUI-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#f8fafc')
    )

    small_muted = ParagraphStyle(
        'SmallMuted',
        fontName='SegoeUI',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748b')
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        fontName='SegoeUI',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#e2e8f0')
    )

    table_header = ParagraphStyle(
        'TableHeader',
        fontName='SegoeUI-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#38bdf8'),
        alignment=1 # center
    )

    table_cell = ParagraphStyle(
        'TableCell',
        fontName='SegoeUI',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#f8fafc'),
        alignment=1 # center
    )

    table_cell_left = ParagraphStyle(
        'TableCellLeft',
        fontName='SegoeUI-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#f8fafc'),
        alignment=0 # left
    )

    story = []

    # =========================================================================
    # PAGE 1: EXECUTIVE DASHBOARD & COMPARISON
    # =========================================================================
    
    # Title & Subtitle
    story.append(Paragraph("RAPORT: POWRÓT DO BIEGANIA PO MARATONIE", title_style))
    story.append(Paragraph(
        "Szczegółowa analiza parametrów biomechanicznych, tętna i stref intensywności dla 3 biegów adaptacyjnych po maratonie w Koszycach.",
        subtitle_style
    ))

    # Executive Highlights Card
    card_html = (
        "<b>Kluczowe Wnioski Trenerskie:</b><br/>"
        "• <b>Wzorowa strategia superkompensacji:</b> Po Maratonie w Koszycach (04.10) nastąpiło pełne 7 dni regeneracji bez biegania, co pozwoliło na odbudowę glikogenu i mikrourazów mięśniowych.<br/>"
        "• <b>Kontrolowana progresja objętości:</b> Bieg 1 (5.27 km) → Bieg 2 (7.00 km, +33%) → Bieg 3 (8.42 km, +20%). Całkowity dystans readaptacyjny: <b>20.69 km</b>.<br/>"
        "• <b>Stabilność kardiologiczna:</b> Średnie tętno ustabilizowało się na poziomie <b>162 bpm</b> w Biegu 2 i 3 pomimo wydłużenia dystansu i przyspieszenia tempa, a tętno spoczynkowe (RHR) spadło z 73 do <b>62 bpm</b>.<br/>"
        "• <b>Odzyskanie rytmu biegu:</b> Kadencja powróciła do poziomu maratońskiego (<b>160 spm</b> w Biegu 2 vs 154 spm w Biegu 1)."
    )
    card_p = Paragraph(card_html, callout_text)
    card_table = Table([[card_p]], colWidths=[usable_width])
    card_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#131d31')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1e3a5f')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(card_table)
    story.append(Spacer(1, 10))

    # Section 1: Comparison Table
    story.append(Paragraph("1. Zestawienie Zbiorcze: Maraton vs 3 Biegi Readaptacyjne", h1_style))
    
    # Table headers and rows
    headers = [
        Paragraph("Aktywność", table_header),
        Paragraph("Data / Godz.", table_header),
        Paragraph("Dystans", table_header),
        Paragraph("Czas (Ruch)", table_header),
        Paragraph("Śr. Tempo", table_header),
        Paragraph("Śr. HR", table_header),
        Paragraph("Max HR", table_header),
        Paragraph("Kadencja", table_header),
        Paragraph("Przewyższ.", table_header),
        Paragraph("Kalorie", table_header),
    ]

    m = runs_data[0] # Marathon
    r1 = runs_data[1]
    r2 = runs_data[2]
    r3 = runs_data[3]

    row_m = [
        Paragraph("<b>Maraton Koszyce</b>", table_cell_left),
        Paragraph("04.10 | 08:57", table_cell),
        Paragraph(f"<b>{m['dist_km']:.2f} km</b>", table_cell),
        Paragraph(f"{m['duration_str']}", table_cell),
        Paragraph(f"{m['avg_pace']}", table_cell),
        Paragraph(f"<b>{int(m['avg_hr'])} bpm</b>", table_cell),
        Paragraph(f"{int(m['max_hr'])} bpm", table_cell),
        Paragraph(f"{m['cadence']:.1f} spm", table_cell),
        Paragraph(f"+{m['elev_gain']:.0f} m", table_cell),
        Paragraph(f"{int(m['calories'])} kcal", table_cell),
    ]

    row_r1 = [
        Paragraph("<b>Bieg 1 (Rozruch)</b>", table_cell_left),
        Paragraph("11.10 | 20:12", table_cell),
        Paragraph(f"<b>{r1['dist_km']:.2f} km</b>", table_cell),
        Paragraph(f"{r1['duration_str']}", table_cell),
        Paragraph(f"{r1['avg_pace']}", table_cell),
        Paragraph(f"<b>{int(r1['avg_hr'])} bpm</b>", table_cell),
        Paragraph(f"{int(r1['max_hr'])} bpm", table_cell),
        Paragraph(f"{r1['cadence']:.1f} spm", table_cell),
        Paragraph(f"+{r1['elev_gain']:.0f} m", table_cell),
        Paragraph(f"{int(r1['calories'])} kcal", table_cell),
    ]

    row_r2 = [
        Paragraph("<b>Bieg 2 (Adaptacja)</b>", table_cell_left),
        Paragraph("13.10 | 19:38", table_cell),
        Paragraph(f"<b>{r2['dist_km']:.2f} km</b>", table_cell),
        Paragraph(f"{r2['duration_str']}", table_cell),
        Paragraph(f"<b>{r2['avg_pace']}</b>", table_cell),
        Paragraph(f"<b>{int(r2['avg_hr'])} bpm</b>", table_cell),
        Paragraph(f"{int(r2['max_hr'])} bpm", table_cell),
        Paragraph(f"<b>{r2['cadence']:.1f} spm</b>", table_cell),
        Paragraph(f"+{r2['elev_gain']:.0f} m", table_cell),
        Paragraph(f"{int(r2['calories'])} kcal", table_cell),
    ]

    row_r3 = [
        Paragraph("<b>Bieg 3 (Wydłużenie)</b>", table_cell_left),
        Paragraph("15.10 | 20:58", table_cell),
        Paragraph(f"<b>{r3['dist_km']:.2f} km</b>", table_cell),
        Paragraph(f"{r3['duration_str']}", table_cell),
        Paragraph(f"{r3['avg_pace']}", table_cell),
        Paragraph(f"<b>{int(r3['avg_hr'])} bpm</b>", table_cell),
        Paragraph(f"{int(r3['max_hr'])} bpm", table_cell),
        Paragraph(f"{r3['cadence']:.1f} spm", table_cell),
        Paragraph(f"+{r3['elev_gain']:.0f} m", table_cell),
        Paragraph(f"{int(r3['calories'])} kcal", table_cell),
    ]

    col_widths = [82, 54, 48, 56, 48, 44, 44, 48, 43, 44]
    t = Table([headers, row_m, row_r1, row_r2, row_r3], colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#0f172a')),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#131e33')),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor('#0f172a')),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor('#131e33')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#334155')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Section 2: Progression Chart Image
    story.append(Paragraph("2. Progresja Objętości, Tempa i Tętna w Kolejnych Biegach", h1_style))
    prog_img = Image("tmp/charts/progression_summary.png", width=usable_width, height=usable_width * (4.2 / 13.0))
    story.append(prog_img)
    
    # Page 1 Break
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: PHYSIOLOGICAL DEEP DIVE & HR ZONES
    # =========================================================================
    story.append(Paragraph("3. Fizjologia Układu Krążenia: Strefy Tętna i Profil Obciążenia", h1_style))
    story.append(Paragraph(
        "Porównanie czasu spędzonego w poszczególnych strefach tętna ukazuje drastyczną różnicę pomiędzy skrajnym przeciążeniem startowym w maratonie (ponad 3h w Strefie 5!), a kontrolowanym, bezpiecznym powrotem do treningu tlenowego (przewaga stref Z3 i Z4).",
        body_style
    ))

    # Zones Comparison Chart Image
    zones_img = Image("tmp/charts/zones_comparison.png", width=usable_width, height=usable_width * (4.8 / 10.0))
    story.append(zones_img)
    story.append(Spacer(1, 8))

    # Continuous HR Profile Image
    story.append(Paragraph("4. Ciągły Profil Tętna w Funkcji Dystansu (3 Biegi)", h1_style))
    hr_img = Image("tmp/charts/hr_profiles_distance.png", width=usable_width, height=usable_width * (4.4 / 10.0))
    story.append(hr_img)
    story.append(Spacer(1, 8))

    # Physiological Takeaways Box
    physio_html = (
        "<b>Wnioski z Analizy Kardiologicznej:</b><br/>"
        "• <b>Koszt kardiologiczny (Cardiac Cost):</b> Liczba uderzeń serca na kilometr spadła z 1049 bpm/km (Bieg 1) do <b>1029 bpm/km</b> (Bieg 2), co dowodzi natychmiastowej poprawy ekonomii biegowej po pierwszym rozruchu.<br/>"
        "• <b>Brak niebezpiecznego dryfu tętna:</b> W Biegu 3 (8.42 km) tętno przez pierwsze 6 km utrzymywało się stabilnie w przedziale 158-164 bpm. Wzrost w końcówce (km 7-8) wynikał z pokonywanego przewyższenia (+36m) i naturalnego finiszu.<br/>"
        "• <b>Powrót homeostazy OUN:</b> Garmin zarejestrował spadek tętna spoczynkowego (RHR) w dniu 13.10 do <b>62 bpm</b> (wobec 73 bpm po maratonie) oraz wskaźnik stresu na poziomie zaledwie <b>9 punktów</b>, co potwierdza pełną regenerację autonomiczną."
    )
    p_box = Table([[Paragraph(physio_html, callout_text)]], colWidths=[usable_width])
    p_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#131d31')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1e3a5f')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(p_box)

    # Page 2 Break
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: SPLITS & DETAILED RUN BREAKDOWN
    # =========================================================================
    story.append(Paragraph("5. Analiza Tempa Kilometr po Kilometrze (Splits)", h1_style))
    story.append(Paragraph(
        "Krzywa tempa na poszczególnych kilometrach odzwierciedla strategię biegacza: ostrożne wejście w bieg, stabilna część główna i kontrolowane schłodzenie w ostatnim kilometrze.",
        body_style
    ))

    # Splits Pace Chart Image
    splits_img = Image("tmp/charts/splits_pace_comparison.png", width=usable_width, height=usable_width * (4.4 / 10.0))
    story.append(splits_img)
    story.append(Spacer(1, 10))

    # Splits Table
    story.append(Paragraph("Szczegółowa Tabela Międzyczasów (Pace & HR per km)", h2_style))
    
    # Let's create a combined splits table
    sp1 = splits_data.get("24689904533", [])
    sp2 = splits_data.get("24712853849", [])
    sp3 = splits_data.get("24738059747", [])

    sp_headers = [
        Paragraph("Km", table_header),
        Paragraph("Bieg 1 (11.10) Tempo", table_header),
        Paragraph("Bieg 1 HR", table_header),
        Paragraph("Bieg 2 (13.10) Tempo", table_header),
        Paragraph("Bieg 2 HR", table_header),
        Paragraph("Bieg 3 (15.10) Tempo", table_header),
        Paragraph("Bieg 3 HR", table_header),
    ]

    max_splits = max(len(sp1), len(sp2), len(sp3))
    sp_rows = []
    for i in range(max_splits):
        s1 = sp1[i] if i < len(sp1) else None
        s2 = sp2[i] if i < len(sp2) else None
        s3 = sp3[i] if i < len(sp3) else None
        
        km_label = f"Km {i+1}"
        row = [
            Paragraph(f"<b>{km_label}</b>", table_cell_left),
            Paragraph(f"{s1['pace_str']} /km" if s1 else "-", table_cell),
            Paragraph(f"{s1['avg_hr']} bpm" if s1 and s1['avg_hr'] else "-", table_cell),
            Paragraph(f"{s2['pace_str']} /km" if s2 else "-", table_cell),
            Paragraph(f"{s2['avg_hr']} bpm" if s2 and s2['avg_hr'] else "-", table_cell),
            Paragraph(f"{s3['pace_str']} /km" if s3 else "-", table_cell),
            Paragraph(f"{s3['avg_hr']} bpm" if s3 and s3['avg_hr'] else "-", table_cell),
        ]
        sp_rows.append(row)

    sp_widths = [45, 78, 65, 78, 65, 78, 65] # total: 474
    t_splits = Table([sp_headers] + sp_rows, colWidths=sp_widths)
    t_splits.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#0f172a')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#0f172a'), colors.HexColor('#131e33')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#334155')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_splits)
    story.append(Spacer(1, 10))

    # Recommendations Card
    rec_html = (
        "<b>Rekomendacje Trenerskie na Kolejne 14 Dni:</b><br/>"
        "• <b>Tydzień 3 po maratonie (18.10 - 25.10):</b> Utrzymaj biegi spokojne (Easy Runs) w strefach Z2/Z3 do 10 km. Unikaj jeszcze ciężkich interwałów beztlenowych.<br/>"
        "• <b>Pierwszy akcent jakościowy:</b> Możesz wprowadzić 4-6 rytmów (przebieżek) po 100m na koniec biegu spokojnego pod koniec tygodnia, aby pobudzić układ nerwowo-mięśniowy bez długu tlenowego.<br/>"
        "• <b>Uwaga na 'fałszywą świeżość':</b> W 2-3 tygodniu po maratonie układ mięśniowy czuje się już wyleczony, jednak układ hormonalny i tkanka łączna (ścięgna, powięź) potrzebują 4 pełnych tygodni na głęboką przebudowę."
    )
    rec_box = Table([[Paragraph(rec_html, callout_text)]], colWidths=[usable_width])
    rec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#132338')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0284c7')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(rec_box)

    # Build document
    doc.build(
        story,
        canvasmaker=DarkReportCanvas,
        onFirstPage=draw_background_decorations,
        onLaterPages=draw_background_decorations
    )
    print(f"SUCCESS: Report generated at {output_filename}")

if __name__ == "__main__":
    create_pdf()

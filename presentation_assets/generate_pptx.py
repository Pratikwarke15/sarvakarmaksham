import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR

ICONS_DIR = "/Users/apple/Desktop/SIH/presentation_assets/icons"
ASSETS_DIR = "/Users/apple/Desktop/SIH/presentation_assets"

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    slide = prs.slides.add_slide(prs.slide_layouts[6]) # blank layout
    
    # Solid clean white background
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = RGBColor(255, 255, 255)
    
    # Color Constants
    NAVY_BLUE = RGBColor(0, 98, 177)      # #0062B1 solid header
    DARK_TEXT = RGBColor(17, 24, 39)      # #111827
    MUTED_TEXT = RGBColor(100, 116, 139)  # #64748B
    HIGHLIGHT_GREEN = RGBColor(16, 185, 129) # #10B981
    PURPLE_THEME = RGBColor(99, 102, 241) # #6366F1
    LIGHT_BG = RGBColor(248, 250, 252)    # #F8FAFC
    BORDER_GRAY = RGBColor(226, 232, 240) # #E2E8F0
    
    # ==========================================
    # 1. TOP HEADER SECTION
    # ==========================================
    
    # Left: Team Pill Badge
    pill = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.4), Inches(0.2), Inches(1.9), Inches(0.55)
    )
    pill.fill.solid()
    pill.fill.fore_color.rgb = RGBColor(245, 243, 255)
    pill.line.color.rgb = PURPLE_THEME
    pill.line.width = Pt(1.5)
    tf_pill = pill.text_frame
    tf_pill.word_wrap = True
    p_pill = tf_pill.paragraphs[0]
    p_pill.text = "सर्वकर्मक्षमः"
    p_pill.font.name = "Kohinoor Devanagari"
    p_pill.font.size = Pt(15)
    p_pill.font.bold = True
    p_pill.font.color.rgb = PURPLE_THEME
    p_pill.alignment = PP_ALIGN.CENTER
    
    # Center: Title "FEASIBILITY AND VIABILITY"
    title_box = slide.shapes.add_textbox(
        Inches(2.3), Inches(0.15), Inches(8.7), Inches(0.65)
    )
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = "FEASIBILITY AND VIABILITY"
    p_title.font.name = "Georgia"
    p_title.font.size = Pt(28)
    p_title.font.bold = True
    p_title.font.color.rgb = DARK_TEXT
    p_title.alignment = PP_ALIGN.CENTER
    
    # Right: SIH 2025 Badge
    sih_badge_path = f"{ASSETS_DIR}/sih_badge.png"
    if os.path.exists(sih_badge_path):
        slide.shapes.add_picture(
            sih_badge_path,
            Inches(11.1), Inches(0.12), Inches(1.8), Inches(0.72)
        )
        
    def create_card_container(left, top, width, height, title_text):
        # Outer Border Box
        outer = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left, top, width, height
        )
        outer.fill.solid()
        outer.fill.fore_color.rgb = RGBColor(255, 255, 255)
        outer.line.color.rgb = NAVY_BLUE
        outer.line.width = Pt(1.5)
        
        # Header Banner
        header = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left, top, width, Inches(0.42)
        )
        header.fill.solid()
        header.fill.fore_color.rgb = NAVY_BLUE
        header.line.color.rgb = NAVY_BLUE
        header.line.width = Pt(0)
        
        tf = header.text_frame
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.name = "Arial"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)
        p.alignment = PP_ALIGN.CENTER
        return outer

    # ==========================================
    # 2. COLUMN 1: FINANCIALS (Left side)
    # ==========================================
    create_card_container(Inches(0.4), Inches(0.95), Inches(4.1), Inches(6.25), "Financials")
    
    # 4 Revenue Stream Cards (Top Row)
    rev_streams = [
        {"icon": "commission.png", "title": "Commission", "sub": "0% – 5% Fee", "desc": "Escrow held"},
        {"icon": "store.png", "title": "Co-op Store", "sub": "Tool Margin", "desc": "20-30% Trade cut"},
        {"icon": "b2b.png", "title": "B2B AMC", "sub": "Society Pacts", "desc": "Fixed contracts"},
        {"icon": "grant.png", "title": "Govt Grants", "sub": "Welfare Pool", "desc": "Sahakar funds"},
    ]
    
    card_w = Inches(0.93)
    card_h = Inches(1.15)
    card_top = Inches(1.45)
    card_start_x = Inches(0.48)
    card_gap = Inches(0.06)
    
    for i, item in enumerate(rev_streams):
        cx = card_start_x + i * (card_w + card_gap)
        cbox = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            cx, card_top, card_w, card_h
        )
        cbox.fill.solid()
        cbox.fill.fore_color.rgb = LIGHT_BG
        cbox.line.color.rgb = BORDER_GRAY
        cbox.line.width = Pt(1)
        
        # Add Icon
        icon_path = f"{ICONS_DIR}/{item['icon']}"
        if os.path.exists(icon_path):
            slide.shapes.add_picture(
                icon_path,
                cx + Inches(0.31), card_top + Inches(0.08), Inches(0.32), Inches(0.32)
            )
        
        # Text
        tf_c = cbox.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_right = Inches(0.02)
        tf_c.margin_top = Inches(0.44)
        
        p1 = tf_c.paragraphs[0]
        p1.text = item["title"]
        p1.font.name = "Arial"
        p1.font.size = Pt(8.2)
        p1.font.bold = True
        p1.font.color.rgb = DARK_TEXT
        p1.alignment = PP_ALIGN.CENTER
        
        p2 = tf_c.add_paragraph()
        p2.text = item["sub"]
        p2.font.name = "Arial"
        p2.font.size = Pt(7.2)
        p2.font.bold = True
        p2.font.color.rgb = NAVY_BLUE
        p2.alignment = PP_ALIGN.CENTER
        
        p3 = tf_c.add_paragraph()
        p3.text = item["desc"]
        p3.font.name = "Arial"
        p3.font.size = Pt(6.2)
        p3.font.color.rgb = MUTED_TEXT
        p3.alignment = PP_ALIGN.CENTER

    # 5 Budget Callout Boxes
    callouts = [
        {
            "cat": "Others: Compliance (9%)", "cost": "₹35K - ₹40K",
            "desc": "Bylaws | Grievance | Audit | Legal",
            "x": Inches(1.35), "y": Inches(2.68), "w": Inches(2.2), "h": Inches(0.55),
            "color": RGBColor(138, 43, 226)
        },
        {
            "cat": "Tech & Security (22%)", "cost": "₹70K - ₹80K",
            "desc": "PWA app | Security audits | Testing",
            "x": Inches(0.48), "y": Inches(3.30), "w": Inches(1.88), "h": Inches(0.62),
            "color": RGBColor(255, 42, 109)
        },
        {
            "cat": "Co-op Onboarding (36%)", "cost": "₹1.2L - ₹1.4L",
            "desc": "Field onboarding | Skill Testing | KYC",
            "x": Inches(2.46), "y": Inches(3.30), "w": Inches(1.95), "h": Inches(0.62),
            "color": RGBColor(0, 119, 254)
        },
        {
            "cat": "Verification & SMS (14%)", "cost": "₹45K - ₹55K",
            "desc": "UIDAI QR | 2Factor SMS | SSL APIs",
            "x": Inches(0.48), "y": Inches(4.00), "w": Inches(1.88), "h": Inches(0.62),
            "color": RGBColor(5, 199, 112)
        },
        {
            "cat": "Cloud & DB (19%)", "cost": "₹60K - ₹75K",
            "desc": "Supabase | Render | Redis | CDN",
            "x": Inches(2.46), "y": Inches(4.00), "w": Inches(1.95), "h": Inches(0.62),
            "color": RGBColor(255, 140, 0)
        }
    ]
    
    for c in callouts:
        c_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            c["x"], c["y"], c["w"], c["h"]
        )
        c_box.fill.solid()
        c_box.fill.fore_color.rgb = RGBColor(255, 255, 255)
        c_box.line.color.rgb = BORDER_GRAY
        c_box.line.width = Pt(1)
        
        # Color indicator strip on left
        strip = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            c["x"] + Inches(0.04), c["y"] + Inches(0.06), Inches(0.05), c["h"] - Inches(0.12)
        )
        strip.fill.solid()
        strip.fill.fore_color.rgb = c["color"]
        strip.line.width = Pt(0)
        
        tf_cb = c_box.text_frame
        tf_cb.word_wrap = True
        tf_cb.margin_left = Inches(0.12)
        tf_cb.margin_right = Inches(0.04)
        tf_cb.margin_top = Inches(0.03)
        
        p_c1 = tf_cb.paragraphs[0]
        p_c1.text = c["cat"] + " "
        p_c1.font.name = "Arial"
        p_c1.font.size = Pt(7.4)
        p_c1.font.bold = True
        p_c1.font.color.rgb = DARK_TEXT
        
        run_cost = p_c1.add_run()
        run_cost.text = c["cost"]
        run_cost.font.size = Pt(7.4)
        run_cost.font.bold = True
        run_cost.font.color.rgb = HIGHLIGHT_GREEN
        
        p_c2 = tf_cb.add_paragraph()
        p_c2.text = c["desc"]
        p_c2.font.name = "Arial"
        p_c2.font.size = Pt(6.2)
        p_c2.font.color.rgb = MUTED_TEXT

    # Pie Chart image at the bottom
    pie_path = f"{ASSETS_DIR}/financials_pie.png"
    if os.path.exists(pie_path):
        slide.shapes.add_picture(
            pie_path,
            Inches(0.65), Inches(4.78), Inches(3.6), Inches(2.35)
        )
    
    # Thin Callout lines connecting slices to boxes
    def draw_callout_line(begin_x, begin_y, end_x, end_y):
        conn = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT, begin_x, begin_y, end_x, end_y
        )
        conn.line.color.rgb = RGBColor(148, 163, 184) # slate-400
        conn.line.width = Pt(1)
        
    draw_callout_line(Inches(2.45), Inches(4.75), Inches(2.45), Inches(3.25)) # to Others
    draw_callout_line(Inches(1.5), Inches(5.2), Inches(1.4), Inches(4.65))    # to Tech
    draw_callout_line(Inches(3.3), Inches(5.2), Inches(3.4), Inches(4.65))    # to Co-op Onboarding

    # ==========================================
    # 3. COLUMN 2: FEASIBILITY (Middle Top)
    # ==========================================
    create_card_container(Inches(4.65), Inches(0.95), Inches(4.08), Inches(3.35), "Feasibility")
    
    feas_items = [
        {
            "icon": "pwa.png",
            "bold": "Full-Stack PWA + FastAPI",
            "rest": " built on Next.js 14 & Python. Bypasses ",
            "bold2": "30% App Store cuts",
            "rest2": "; lightweight and offline-cached for low-end ₹6,000 devices."
        },
        {
            "icon": "map.png",
            "bold": "Zero-cost public infra",
            "rest": " via ",
            "bold2": "OpenStreetMap / OSRM",
            "rest2": " & UIDAI Offline e-KYC/Secure QR, eliminating commercial Google Maps and KYC API billing."
        },
        {
            "icon": "ai.png",
            "bold": "In-process statistical AI engine",
            "rest": " delivers 30-day demand forecasts locally with ",
            "bold2": "zero external GPU or LLM token costs",
            "rest2": "."
        },
        {
            "icon": "modular.png",
            "bold": "Provider Abstraction Architecture",
            "rest": " allows ",
            "bold2": "seamless plug-and-play migration",
            "rest2": " between zero-cost demo mocks and live production gateways."
        }
    ]
    
    f_top = Inches(1.46)
    f_step = Inches(0.67)
    for i, item in enumerate(feas_items):
        y_pos = f_top + i * f_step
        
        # Add Icon
        icon_path = f"{ICONS_DIR}/{item['icon']}"
        if os.path.exists(icon_path):
            slide.shapes.add_picture(
                icon_path,
                Inches(4.78), y_pos, Inches(0.42), Inches(0.42)
            )
        
        # Text box
        tbox = slide.shapes.add_textbox(
            Inches(5.28), y_pos - Inches(0.04), Inches(3.35), Inches(0.58)
        )
        tf_t = tbox.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        
        r1 = p_t.add_run()
        r1.text = item["bold"]
        r1.font.name = "Arial"
        r1.font.size = Pt(8.5)
        r1.font.bold = True
        r1.font.color.rgb = DARK_TEXT
        
        r2 = p_t.add_run()
        r2.text = item["rest"]
        r2.font.name = "Arial"
        r2.font.size = Pt(8.2)
        r2.font.color.rgb = DARK_TEXT
        
        r3 = p_t.add_run()
        r3.text = item["bold2"]
        r3.font.name = "Arial"
        r3.font.size = Pt(8.5)
        r3.font.bold = True
        r3.font.color.rgb = DARK_TEXT
        
        r4 = p_t.add_run()
        r4.text = item["rest2"]
        r4.font.name = "Arial"
        r4.font.size = Pt(8.2)
        r4.font.color.rgb = DARK_TEXT

    # ==========================================
    # 4. COLUMN 3: VIABILITY (Right Top)
    # ==========================================
    create_card_container(Inches(8.85), Inches(0.95), Inches(4.08), Inches(3.35), "Viability")
    
    viab_items = [
        {
            "icon": "market.png",
            "bold": "India's home services market to hit $35B by 2030",
            "rest": "; over ",
            "bold2": "90%+ unorganized technicians",
            "rest2": " ready for digital formalization."
        },
        {
            "icon": "earnings.png",
            "bold": "25%–35% higher take-home pay",
            "rest": " via 0%–5% commission guarantees organic viral retention with ",
            "bold2": "₹0 Customer Acquisition Cost (CAC)",
            "rest2": "."
        },
        {
            "icon": "policy.png",
            "bold": "Direct National Policy Alignment",
            "rest": " with ",
            "bold2": "Code on Social Security 2020",
            "rest2": " and Ministry of Cooperation's 'Sahakar Se Samriddhi' framework."
        },
        {
            "icon": "vault.png",
            "bold": "Self-sustaining Social Security Vaults",
            "rest": ": automated ",
            "bold2": "1% micro-deductions",
            "rest2": " fund worker health, pension, and insurance with zero fiscal debt."
        }
    ]
    
    v_top = Inches(1.46)
    v_step = Inches(0.67)
    for i, item in enumerate(viab_items):
        y_pos = v_top + i * v_step
        
        # Add Icon
        icon_path = f"{ICONS_DIR}/{item['icon']}"
        if os.path.exists(icon_path):
            slide.shapes.add_picture(
                icon_path,
                Inches(8.98), y_pos, Inches(0.42), Inches(0.42)
            )
        
        # Text box
        tbox = slide.shapes.add_textbox(
            Inches(9.48), y_pos - Inches(0.04), Inches(3.35), Inches(0.58)
        )
        tf_t = tbox.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        
        r1 = p_t.add_run()
        r1.text = item["bold"]
        r1.font.name = "Arial"
        r1.font.size = Pt(8.5)
        r1.font.bold = True
        r1.font.color.rgb = DARK_TEXT
        
        r2 = p_t.add_run()
        r2.text = item["rest"]
        r2.font.name = "Arial"
        r2.font.size = Pt(8.2)
        r2.font.color.rgb = DARK_TEXT
        
        r3 = p_t.add_run()
        r3.text = item["bold2"]
        r3.font.name = "Arial"
        r3.font.size = Pt(8.5)
        r3.font.bold = True
        r3.font.color.rgb = DARK_TEXT
        
        r4 = p_t.add_run()
        r4.text = item["rest2"]
        r4.font.name = "Arial"
        r4.font.size = Pt(8.2)
        r4.font.color.rgb = DARK_TEXT

    # ==========================================
    # 5. BOTTOM SECTION: CHALLENGES AND MITIGATION
    # ==========================================
    create_card_container(Inches(4.65), Inches(4.42), Inches(8.28), Inches(2.78), "Challenges and Mitigation")
    
    challenges = [
        {
            "challenge": "Semi-literacy & digital divide among gig workers",
            "c_icon": "ch_lang.png", "m_icon": "mit_voice.png",
            "bold": "Trilingual Voice AI (Hindi, Marathi, English)",
            "rest": " + 1-click icon dispatch and SMS fallback cuts onboarding friction by ",
            "bold2": "60%",
            "rest2": "."
        },
        {
            "challenge": "Doorstep trust & customer safety concerns",
            "c_icon": "ch_trust.png", "m_icon": "mit_kyc.png",
            "bold": "100% DigiLocker / Aadhaar KYC",
            "rest": " + mandatory doorstep ",
            "bold2": "4-digit arrival OTP handshake",
            "rest2": " ensures zero unauthorized visits."
        },
        {
            "challenge": "Platform sustainability on low 0%–5% cut",
            "c_icon": "ch_margin.png", "m_icon": "mit_store.png",
            "bold": "Co-op tool store wholesale margins (20–30% trade discount)",
            "rest": " and society AMC contracts ",
            "bold2": "cross-subsidize digital platform overhead",
            "rest2": "."
        },
        {
            "challenge": "Weak rural / Tier-3 internet connectivity",
            "c_icon": "ch_net.png", "m_icon": "mit_pwa.png",
            "bold": "Offline-first PWA caching",
            "rest": " + lightweight Haversine radius search requires ",
            "bold2": "<50KB payload",
            "rest2": ", delivering 2x faster performance on 2G/3G."
        }
    ]
    
    c_top = Inches(4.94)
    c_step = Inches(0.55)
    
    for i, ch in enumerate(challenges):
        cy = c_top + i * c_step
        
        # Challenge Title (Left)
        t_ch = slide.shapes.add_textbox(
            Inches(4.78), cy - Inches(0.04), Inches(2.40), Inches(0.50)
        )
        tf_ch = t_ch.text_frame
        tf_ch.word_wrap = True
        tf_ch.margin_left = tf_ch.margin_right = tf_ch.margin_top = tf_ch.margin_bottom = 0
        p_ch = tf_ch.paragraphs[0]
        p_ch.text = ch["challenge"]
        p_ch.font.name = "Arial"
        p_ch.font.size = Pt(8.5)
        p_ch.font.bold = True
        p_ch.font.color.rgb = DARK_TEXT
        
        # Center connector: [c_icon] ---> [m_icon]
        c_icon_path = f"{ICONS_DIR}/{ch['c_icon']}"
        if os.path.exists(c_icon_path):
            slide.shapes.add_picture(
                c_icon_path,
                Inches(7.28), cy + Inches(0.02), Inches(0.32), Inches(0.32)
            )
            
        # Arrow connector line
        arrow = slide.shapes.add_shape(
            MSO_SHAPE.RIGHT_ARROW,
            Inches(7.66), cy + Inches(0.12), Inches(0.38), Inches(0.12)
        )
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = NAVY_BLUE
        arrow.line.width = Pt(0)
        
        m_icon_path = f"{ICONS_DIR}/{ch['m_icon']}"
        if os.path.exists(m_icon_path):
            slide.shapes.add_picture(
                m_icon_path,
                Inches(8.10), cy + Inches(0.02), Inches(0.32), Inches(0.32)
            )
        
        # Mitigation (Right)
        t_mit = slide.shapes.add_textbox(
            Inches(8.52), cy - Inches(0.04), Inches(4.30), Inches(0.50)
        )
        tf_mit = t_mit.text_frame
        tf_mit.word_wrap = True
        tf_mit.margin_left = tf_mit.margin_right = tf_mit.margin_top = tf_mit.margin_bottom = 0
        p_mit = tf_mit.paragraphs[0]
        
        r1 = p_mit.add_run()
        r1.text = ch["bold"]
        r1.font.name = "Arial"
        r1.font.size = Pt(8.2)
        r1.font.bold = True
        r1.font.color.rgb = DARK_TEXT
        
        r2 = p_mit.add_run()
        r2.text = ch["rest"]
        r2.font.name = "Arial"
        r2.font.size = Pt(8.0)
        r2.font.color.rgb = DARK_TEXT
        
        r3 = p_mit.add_run()
        r3.text = ch["bold2"]
        r3.font.name = "Arial"
        r3.font.size = Pt(8.2)
        r3.font.bold = True
        r3.font.color.rgb = DARK_TEXT
        
        if "rest2" in ch:
            r4 = p_mit.add_run()
            r4.text = ch["rest2"]
            r4.font.name = "Arial"
            r4.font.size = Pt(8.0)
            r4.font.color.rgb = DARK_TEXT

    output_path = "/Users/apple/Desktop/SIH/Shramik_Co_Feasibility_and_Viability.pptx"
    prs.save(output_path)
    print("PowerPoint presentation generated at:", output_path)

if __name__ == "__main__":
    build_presentation()

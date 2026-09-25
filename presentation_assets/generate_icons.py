import os
from PIL import Image, ImageDraw, ImageFont

ICONS_DIR = "/Users/apple/Desktop/SIH/presentation_assets/icons"
os.makedirs(ICONS_DIR, exist_ok=True)

def create_base_icon(bg_color, border_color, size=(120, 120), radius=28):
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([2, 2, size[0]-3, size[1]-3], radius=radius, fill=bg_color, outline=border_color, width=3)
    return img, draw

# 1. Commission Icon (Tag / %)
def make_icon_commission():
    img, draw = create_base_icon("#EFF6FF", "#3B82F6")
    # Draw tag shape
    draw.polygon([(30, 60), (60, 30), (90, 30), (90, 60), (60, 90), (30, 60)], fill="#2563EB")
    draw.ellipse([70, 40, 80, 50], fill="white")
    # Draw %
    draw.ellipse([45, 62, 53, 70], fill="white")
    draw.line([46, 75, 64, 50], fill="white", width=3)
    draw.ellipse([57, 52, 65, 60], fill="white")
    img.save(f"{ICONS_DIR}/commission.png")

# 2. Co-op Store Icon (Wrench & Hammer)
def make_icon_store():
    img, draw = create_base_icon("#FFF1F2", "#F43F5E")
    # Hammer
    draw.rectangle([40, 35, 75, 48], fill="#E11D48")
    draw.rectangle([54, 48, 62, 90], fill="#BE123C")
    # Wrench ring
    draw.ellipse([65, 65, 88, 88], outline="#E11D48", width=5)
    img.save(f"{ICONS_DIR}/store.png")

# 3. B2B Society AMC Icon (Building)
def make_icon_b2b():
    img, draw = create_base_icon("#FFFBEB", "#F59E0B")
    # Main building
    draw.rectangle([35, 30, 85, 95], fill="#D97706")
    # Windows
    for y in [40, 52, 64, 76]:
        for x in [44, 58, 72]:
            draw.rectangle([x, y, x+6, y+7], fill="white")
    # Door
    draw.rectangle([53, 85, 67, 95], fill="#78350F")
    img.save(f"{ICONS_DIR}/b2b.png")

# 4. Govt Grants Icon (Pillars / Temple)
def make_icon_grant():
    img, draw = create_base_icon("#F0FDF4", "#22C55E")
    # Pediment triangle
    draw.polygon([(60, 25), (28, 42), (92, 42)], fill="#16A34A")
    # Architrave
    draw.rectangle([28, 42, 92, 47], fill="#15803D")
    # 4 Pillars
    for px in [32, 48, 64, 80]:
        draw.rectangle([px, 47, px+8, 82], fill="#16A34A")
    # Base
    draw.rectangle([24, 82, 96, 92], fill="#15803D")
    img.save(f"{ICONS_DIR}/grant.png")

# 5. PWA Icon (Mobile + Lightning)
def make_icon_pwa():
    img, draw = create_base_icon("#EFF6FF", "#60A5FA")
    # Phone body
    draw.rounded_rectangle([38, 22, 82, 98], radius=10, fill="#1E40AF", outline="#93C5FD", width=2)
    # Screen
    draw.rounded_rectangle([44, 30, 76, 90], radius=5, fill="#DBEAFE")
    # Lightning inside screen
    draw.polygon([(62, 38), (52, 58), (62, 58), (58, 80), (70, 54), (60, 54)], fill="#F59E0B")
    img.save(f"{ICONS_DIR}/pwa.png")

# 6. Map / Routing Icon
def make_icon_map():
    img, draw = create_base_icon("#F0FDF4", "#4ADE80")
    # Folded map
    draw.polygon([(30, 35), (50, 25), (70, 35), (90, 25), (90, 85), (70, 95), (50, 85), (30, 95)], fill="#DCFCE7", outline="#16A34A", width=3)
    draw.line([(50, 25), (50, 85)], fill="#16A34A", width=2)
    draw.line([(70, 35), (70, 95)], fill="#16A34A", width=2)
    # Pin
    draw.ellipse([53, 40, 67, 54], fill="#EF4444")
    draw.polygon([(53, 47), (67, 47), (60, 66)], fill="#EF4444")
    draw.ellipse([57, 44, 63, 50], fill="white")
    img.save(f"{ICONS_DIR}/map.png")

# 7. AI Engine Icon (Neural/Chip)
def make_icon_ai():
    img, draw = create_base_icon("#FAF5FF", "#C084FC")
    # Chip body
    draw.rounded_rectangle([35, 35, 85, 85], radius=10, fill="#7E22CE")
    # Pins
    for p in [45, 60, 75]:
        draw.line([(p, 23), (p, 35)], fill="#A855F7", width=3)
        draw.line([(p, 85), (p, 97)], fill="#A855F7", width=3)
        draw.line([(23, p), (35, p)], fill="#A855F7", width=3)
        draw.line([(85, p), (97, p)], fill="#A855F7", width=3)
    # Brain / Spark inside
    draw.ellipse([50, 50, 70, 70], fill="#F3E8FF")
    draw.polygon([(60, 48), (54, 60), (62, 60), (58, 72), (68, 58), (60, 58)], fill="#F59E0B")
    img.save(f"{ICONS_DIR}/ai.png")

# 8. Modular Architecture Icon (Plugs / Layers)
def make_icon_modular():
    img, draw = create_base_icon("#EFF6FF", "#38BDF8")
    # 3 Layers / Bricks
    draw.rounded_rectangle([28, 28, 92, 46], radius=5, fill="#0284C7")
    draw.rounded_rectangle([28, 51, 92, 69], radius=5, fill="#0369A1")
    draw.rounded_rectangle([28, 74, 92, 92], radius=5, fill="#075985")
    # Connector dots
    draw.ellipse([56, 44, 64, 52], fill="#38BDF8")
    draw.ellipse([56, 67, 64, 75], fill="#38BDF8")
    img.save(f"{ICONS_DIR}/modular.png")

# 9. Market Growth Icon (Chart + Rupee)
def make_icon_market():
    img, draw = create_base_icon("#FEF3C7", "#FBBF24")
    # Chart bars
    draw.rectangle([30, 70, 42, 95], fill="#F59E0B")
    draw.rectangle([48, 55, 60, 95], fill="#F59E0B")
    draw.rectangle([66, 40, 78, 95], fill="#F59E0B")
    draw.rectangle([84, 25, 96, 95], fill="#D97706")
    # Up arrow line
    draw.line([(32, 65), (54, 48), (72, 35), (92, 18)], fill="#DC2626", width=4)
    draw.polygon([(92, 18), (82, 18), (92, 28)], fill="#DC2626")
    img.save(f"{ICONS_DIR}/market.png")

# 10. Worker Earnings Icon (Wallet + Coins)
def make_icon_earnings():
    img, draw = create_base_icon("#ECFDF5", "#34D399")
    # Wallet body
    draw.rounded_rectangle([28, 40, 92, 92], radius=10, fill="#059669")
    # Wallet flap
    draw.rounded_rectangle([68, 54, 94, 78], radius=6, fill="#047857")
    draw.ellipse([80, 62, 88, 70], fill="#FCD34D")
    # Coin popping out top
    draw.ellipse([46, 22, 74, 50], fill="#FBBF24", outline="#D97706", width=2)
    img.save(f"{ICONS_DIR}/earnings.png")

# 11. National Policy Icon (Emblem / Shield)
def make_icon_policy():
    img, draw = create_base_icon("#F5F3FF", "#A78BFA")
    # Tricolor shield
    draw.polygon([(60, 25), (92, 35), (92, 70), (60, 95), (28, 70), (28, 35)], fill="#7C3AED")
    draw.polygon([(60, 30), (87, 39), (87, 67), (60, 90), (33, 67), (33, 39)], fill="white")
    # Saffron stripe
    draw.rectangle([35, 42, 85, 52], fill="#FF9933")
    # White + Chakra
    draw.ellipse([54, 54, 66, 66], fill="#000080")
    # Green stripe
    draw.rectangle([35, 68, 85, 78], fill="#138808")
    img.save(f"{ICONS_DIR}/policy.png")

# 12. Social Security Vault Icon (Safe / Vault)
def make_icon_vault():
    img, draw = create_base_icon("#EFF6FF", "#60A5FA")
    # Vault body
    draw.rounded_rectangle([28, 28, 92, 92], radius=12, fill="#1E3A8A")
    draw.rounded_rectangle([34, 34, 86, 86], radius=8, fill="#2563EB")
    # Wheel in center
    draw.ellipse([46, 46, 74, 74], fill="#DBEAFE", outline="#1E3A8A", width=3)
    draw.line([(46, 60), (74, 60)], fill="#1E3A8A", width=3)
    draw.line([(60, 46), (60, 74)], fill="#1E3A8A", width=3)
    draw.ellipse([56, 56, 64, 64], fill="#F59E0B")
    img.save(f"{ICONS_DIR}/vault.png")

# 13. Challenge & Mitigation Icons
def make_cm_icons():
    # CH1: Book / Language barrier
    img1, d1 = create_base_icon("#FFFBEB", "#F59E0B", size=(90, 90), radius=20)
    d1.rectangle([25, 25, 65, 65], fill="#D97706")
    d1.line([(45, 25), (45, 65)], fill="white", width=2)
    img1.save(f"{ICONS_DIR}/ch_lang.png")
    
    # MIT1: Microphone / Voice AI
    img2, d2 = create_base_icon("#EFF6FF", "#3B82F6", size=(90, 90), radius=20)
    d2.rounded_rectangle([35, 20, 55, 50], radius=8, fill="#2563EB")
    d2.arc([28, 32, 62, 60], 0, 180, fill="#1D4ED8", width=3)
    d2.line([(45, 60), (45, 72)], fill="#1D4ED8", width=3)
    d2.line([(35, 72), (55, 72)], fill="#1D4ED8", width=3)
    img2.save(f"{ICONS_DIR}/mit_voice.png")
    
    # CH2: Safety Hazard / Warning
    img3, d3 = create_base_icon("#FEF2F2", "#EF4444", size=(90, 90), radius=20)
    d3.polygon([(45, 18), (18, 70), (72, 70)], fill="#DC2626")
    d3.line([(45, 34), (45, 54)], fill="white", width=4)
    d3.ellipse([43, 60, 47, 64], fill="white")
    img3.save(f"{ICONS_DIR}/ch_trust.png")
    
    # MIT2: Aadhaar Shield / OTP
    img4, d4 = create_base_icon("#F0FDF4", "#22C55E", size=(90, 90), radius=20)
    d4.polygon([(45, 18), (70, 28), (70, 55), (45, 75), (20, 55), (20, 28)], fill="#16A34A")
    # Checkmark inside shield
    d4.line([(32, 45), (42, 56), (58, 35)], fill="white", width=4)
    img4.save(f"{ICONS_DIR}/mit_kyc.png")
    
    # CH3: Down Trend / Commission risk
    img5, d5 = create_base_icon("#FFF1F2", "#F43F5E", size=(90, 90), radius=20)
    d5.line([(22, 30), (40, 50), (55, 40), (70, 68)], fill="#E11D48", width=4)
    d5.polygon([(70, 68), (58, 66), (68, 56)], fill="#E11D48")
    img5.save(f"{ICONS_DIR}/ch_margin.png")
    
    # MIT3: Co-op Storefront
    img6, d6 = create_base_icon("#EFF6FF", "#3B82F6", size=(90, 90), radius=20)
    # Awning
    d6.polygon([(20, 32), (70, 32), (75, 45), (15, 45)], fill="#2563EB")
    d6.rectangle([22, 45, 68, 75], fill="#DBEAFE", outline="#1D4ED8", width=2)
    d6.rectangle([38, 55, 52, 75], fill="#1E40AF")
    img6.save(f"{ICONS_DIR}/mit_store.png")
    
    # CH4: Weak Internet / No signal
    img7, d7 = create_base_icon("#FEF2F2", "#F87171", size=(90, 90), radius=20)
    d7.ellipse([25, 25, 65, 65], outline="#DC2626", width=3)
    d7.line([(25, 25), (65, 65)], fill="#DC2626", width=4)
    img7.save(f"{ICONS_DIR}/ch_net.png")
    
    # MIT4: High Speed Cache / Lightning
    img8, d8 = create_base_icon("#F0FDF4", "#4ADE80", size=(90, 90), radius=20)
    d8.polygon([(48, 18), (32, 45), (46, 45), (40, 72), (62, 38), (48, 38)], fill="#16A34A")
    img8.save(f"{ICONS_DIR}/mit_pwa.png")

if __name__ == "__main__":
    make_icon_commission()
    make_icon_store()
    make_icon_b2b()
    make_icon_grant()
    make_icon_pwa()
    make_icon_map()
    make_icon_ai()
    make_icon_modular()
    make_icon_market()
    make_icon_earnings()
    make_icon_policy()
    make_icon_vault()
    make_cm_icons()
    print("All custom icons generated successfully in:", ICONS_DIR)

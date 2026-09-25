import matplotlib.pyplot as plt
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs("/Users/apple/Desktop/SIH/presentation_assets", exist_ok=True)

# 1. Generate Financials Pie Chart matching the reference image style
def generate_pie_chart():
    # Proportions & data
    labels = [
        "Local Co-op Onboarding\n₹1.2L - ₹1.4L",
        "Tech & Security\n₹70K - ₹80K",
        "Cloud & Hosting\n₹60K - ₹75K",
        "Verification & SMS\n₹45K - ₹55K",
        "Compliance & Ops\n₹35K - ₹40K"
    ]
    sizes = [36, 22, 19, 14, 9]
    # Colors matching the reference image: Bright Blue, Vibrant Pink, Vibrant Orange, Green, Teal
    colors = ['#0088FF', '#FF3366', '#FF9900', '#00CC66', '#8855FF']
    
    fig, ax = plt.subplots(figsize=(5.5, 4.5), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')
    
    # Explode slightly to give a polished modern look
    explode = (0.04, 0.04, 0.04, 0.04, 0.04)
    
    wedges, texts, autotexts = ax.pie(
        sizes, 
        explode=explode, 
        labels=None, 
        autopct='%1.0f%%',
        startangle=140,
        colors=colors,
        pctdistance=0.68,
        wedgeprops=dict(width=0.62, edgecolor='white', linewidth=2.5) # Donut/Pie style
    )
    
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(13)
        autotext.set_weight('bold')
    
    # Equal aspect ratio ensures that pie is drawn as a circle.
    ax.axis('equal')  
    plt.tight_layout()
    chart_path = "/Users/apple/Desktop/SIH/presentation_assets/financials_pie.png"
    plt.savefig(chart_path, dpi=300, bbox_inches='tight', transparent=True)
    plt.close()
    print("Pie chart created successfully at:", chart_path)

# 2. Generate SIH 2025 Badge & Logo
def generate_sih_badge():
    w, h = 420, 110
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw brain / gear motif circle
    # Orange half (left)
    draw.pieslice([10, 15, 90, 95], 90, 270, fill="#FF6F00")
    # Green half (right)
    draw.pieslice([10, 15, 90, 95], 270, 90, fill="#2E7D32")
    # Center white circle
    draw.ellipse([30, 35, 70, 75], fill="white")
    # Blue center dot (Chakra motif)
    draw.ellipse([42, 47, 58, 63], fill="#0D47A1")
    
    # Try default or truetype font
    try:
        font_sih = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        font_year = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except:
        font_sih = font_year = font_sub = ImageFont.load_default()
        
    draw.text((105, 14), "SMART INDIA", fill="#1A237E", font=font_sih)
    draw.text((105, 38), "HACKATHON", fill="#1A237E", font=font_sih)
    draw.text((105, 64), "2025", fill="#FF6F00", font=font_year)
    draw.text((25, 96), "SIH", fill="#0D47A1", font=font_sub)
    
    path = "/Users/apple/Desktop/SIH/presentation_assets/sih_badge.png"
    img.save(path)
    print("SIH badge created at:", path)

if __name__ == "__main__":
    generate_pie_chart()
    generate_sih_badge()

import subprocess
from PIL import Image
import os

HTML_PATH = "/Users/apple/Desktop/SIH/presentation_assets/logo_render.html"
PDF_PATH = "/Users/apple/Desktop/SIH/presentation_assets/logo_render.pdf"
PNG_DIR = "/Users/apple/Desktop/SIH/presentation_assets"
OUTPUT_LOGO_1 = "/Users/apple/Desktop/SIH/apps/web/public/images/logo.png"
OUTPUT_LOGO_2 = "/Users/apple/Desktop/SIH/apps/web/public/logo.png"

# Design of the logo in HTML with SVG + Devanagari Typography
html_content = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Sanskrit:ital@0;1&family=Outfit:wght@600;700;800;900&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    width: 800px;
    height: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Kohinoor Devanagari', 'Devanagari MT', sans-serif;
  }
  .logo-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .emblem-svg {
    width: 440px;
    height: 440px;
    filter: drop-shadow(0 12px 24px rgba(128, 0, 32, 0.15));
  }
  .brand-title {
    margin-top: 24px;
    font-size: 78px;
    font-weight: 900;
    color: #800020;
    letter-spacing: 0.5px;
    line-height: 1.1;
    font-family: 'Kohinoor Devanagari', 'Devanagari MT', 'Arial Unicode MS', sans-serif;
  }
  .brand-translit {
    margin-top: 10px;
    font-size: 26px;
    font-weight: 800;
    color: #800020;
    letter-spacing: 7px;
    text-transform: uppercase;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .brand-tagline {
    margin-top: 6px;
    font-size: 19px;
    font-weight: 700;
    color: #B45309;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
</style>
</head>
<body>
  <div class="logo-container">
    <!-- Majestic Emblem: Modern Architectural S / Cooperating Artisans & Sacred Geometric Hexagon / Shelter -->
    <svg class="emblem-svg" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Rich Maroon Gradients -->
        <linearGradient id="maroonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#9E0028" />
          <stop offset="60%" stop-color="#800020" />
          <stop offset="100%" stop-color="#550014" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBBF24" />
          <stop offset="50%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>
        <linearGradient id="warmLight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF8" />
          <stop offset="100%" stop-color="#FEF3C7" />
        </linearGradient>
        <!-- Soft Shadow Filter -->
        <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#800020" flood-opacity="0.25" />
        </filter>
      </defs>

      <!-- Outer Subtle Golden Radiance Hexagon -->
      <polygon points="250,15 450,130 450,360 250,475 50,360 50,130" 
               stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="14 10" fill="none" opacity="0.65" />
      
      <!-- Golden Accent Inner Ring (Wholeness / Sarva) -->
      <circle cx="250" cy="245" r="215" stroke="url(#goldGrad)" stroke-width="3" fill="none" opacity="0.4" />
      
      <!-- Top Patron / Shelter Figure -->
      <!-- Head -->
      <circle cx="200" cy="85" r="48" fill="url(#maroonGrad)" filter="url(#shadow)" />
      <!-- Upper Body / Roof Arm creating Shelter -->
      <path d="M 180 150 
               C 220 120, 290 110, 375 160 
               C 395 172, 410 195, 410 220 
               L 410 280 
               C 410 295, 395 305, 380 295 
               L 310 240 
               C 290 225, 260 215, 230 220 
               L 180 230 
               C 165 233, 150 220, 150 205 
               L 150 170 
               C 150 155, 165 142, 180 150 Z" 
            fill="url(#maroonGrad)" filter="url(#shadow)" />

      <!-- Center Dynamic Connection Pillar / Tool Handshake -->
      <path d="M 140 230 
               L 260 160 
               C 275 150, 295 155, 305 170 
               L 330 210 
               C 340 225, 335 245, 320 255 
               L 200 325 
               C 185 335, 165 330, 155 315 
               L 130 275 
               C 120 260, 125 240, 140 230 Z" 
            fill="url(#goldGrad)" opacity="0.9" />

      <!-- Lower Artisan / Skilled Technician Figure (Foundation) -->
      <!-- Head -->
      <circle cx="340" cy="275" r="45" fill="url(#maroonGrad)" filter="url(#shadow)" />
      <!-- Lower Body / Foundation Arm -->
      <path d="M 140 260 
               L 220 320 
               C 250 342, 290 350, 330 340 
               L 370 330 
               C 385 326, 400 338, 400 355 
               L 400 380 
               C 400 405, 380 425, 355 430 
               C 270 445, 195 425, 150 375 
               C 135 358, 125 335, 125 310 
               L 125 275 
               C 125 260, 135 250, 140 260 Z" 
            fill="url(#maroonGrad)" filter="url(#shadow)" />

      <!-- Central Sacred Spark / Precision Diamond -->
      <polygon points="250,225 262,245 250,265 238,245" fill="url(#warmLight)" filter="url(#shadow)" />
      <circle cx="250" cy="245" r="4" fill="#800020" />
    </svg>

    <!-- Brand Typography in Pristine Devanagari & Latin Subtext -->
    <div class="brand-title">सर्वकर्मक्षमः</div>
    <div class="brand-translit">SARVAKARMAKSHAMAH</div>
    <div class="brand-tagline">PEOPLE WORK TOGETHER</div>
  </div>
</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Logo HTML template written.")

# Convert HTML to PDF via headless LibreOffice
cmd_pdf = [
    "/opt/homebrew/bin/soffice", "--headless",
    "--convert-to", "pdf", HTML_PATH,
    "--outdir", PNG_DIR
]
subprocess.run(cmd_pdf, check=True)

# Convert PDF to high-res PNG via pdftoppm
cmd_png = [
    "/opt/homebrew/bin/pdftoppm", "-png", "-r", "300",
    PDF_PATH, f"{PNG_DIR}/logo_gen"
]
subprocess.run(cmd_png, check=True)

# Post-process with Pillow: crop bounding box, make background fully transparent, and save exact 800x800 square
gen_png = f"{PNG_DIR}/logo_gen-1.png"
if os.path.exists(gen_png):
    img = Image.open(gen_png).convert("RGBA")
    
    # Process transparency: replace pure white / near-white background with transparent
    datas = img.getdata()
    new_data = []
    for item in datas:
        # If pixel is close to pure white (background)
        if item[0] > 250 and item[1] > 250 and item[2] > 250:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    
    # Crop to content with padding
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        # Create square canvas
        max_dim = max(cropped.width, cropped.height) + 60
        square_img = Image.new("RGBA", (max_dim, max_dim), (255, 255, 255, 0))
        offset = ((max_dim - cropped.width) // 2, (max_dim - cropped.height) // 2)
        square_img.paste(cropped, offset, cropped)
        
        # Resize to standard high-res 800x800
        final_logo = square_img.resize((800, 800), Image.Resampling.LANCZOS)
        
        # Save to both target locations
        final_logo.save(OUTPUT_LOGO_1, "PNG")
        final_logo.save(OUTPUT_LOGO_2, "PNG")
        final_logo.save(f"{PNG_DIR}/new_brand_logo.png", "PNG")
        print("Successfully generated and saved new logo to:")
        print(f" -> {OUTPUT_LOGO_1}")
        print(f" -> {OUTPUT_LOGO_2}")

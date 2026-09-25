import matplotlib.pyplot as plt
import numpy as np
import os

os.makedirs("/Users/apple/Desktop/SIH/presentation_assets", exist_ok=True)

def generate_financials_pie():
    # Slices: Onboarding 36%, Tech 22%, Cloud 19%, Verification 14%, Compliance 9%
    sizes = [36, 22, 19, 14, 9]
    # Bright modern palette matching reference
    colors = ['#0077FE', '#FF2A6D', '#FF8C00', '#05C770', '#8A2BE2']
    
    # 3D tilted effect using elliptical aspect or wedge transform
    fig = plt.figure(figsize=(4.8, 3.2), dpi=300)
    fig.patch.set_facecolor('white')
    ax = fig.add_subplot(111)
    ax.set_facecolor('white')
    
    explode = (0.05, 0.05, 0.05, 0.05, 0.05)
    
    wedges, texts, autotexts = ax.pie(
        sizes, 
        explode=explode, 
        autopct='%1.0f%%',
        startangle=130,
        colors=colors,
        pctdistance=0.65,
        wedgeprops=dict(width=0.62, edgecolor='white', linewidth=2.5)
    )
    
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(13)
        autotext.set_weight('bold')
    
    # Elliptical aspect ratio to give that subtle 3D tilted perspective
    ax.set_aspect(0.72)
    plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.02)
    
    chart_path = "/Users/apple/Desktop/SIH/presentation_assets/financials_pie.png"
    plt.savefig(chart_path, dpi=300, bbox_inches='tight', transparent=True)
    plt.close()
    print("New 3D-styled pie chart generated at:", chart_path)

if __name__ == "__main__":
    generate_financials_pie()

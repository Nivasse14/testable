#!/usr/bin/env python3
"""
🔬 DIAGNOSTIC INTELLIGENT - Analyse trajectoire vs plateformes
Approche MIT : Visualiser les données pour comprendre le problème
"""

import json
import sys

def analyze_trajectory(json_path):
    with open(json_path) as f:
        data = json.load(f)
    
    platforms = data['platforms']
    keyframes = data['metadata']['config']['ball']['keyframes']
    
    print("=" * 80)
    print("🔬 DIAGNOSTIC TRAJECTOIRE vs PLATEFORMES")
    print("=" * 80)
    
    # 1. Statistiques globales
    print(f"\n📊 DONNÉES GLOBALES:")
    print(f"   Plateformes: {len(platforms)}")
    print(f"   Keyframes: {len(keyframes)}")
    print(f"   Durée totale: {keyframes[-1]['time'] / 1000:.1f}s")
    
    # 2. Analyser les 10 premières secondes
    print(f"\n🎯 ANALYSE DES 10 PREMIÈRES SECONDES:\n")
    
    # Trouver les keyframes des 10 premières secondes (filtrer les None)
    kf_10s = [kf for kf in keyframes if kf.get('time') is not None and kf['time'] <= 10000]
    
    print(f"Keyframes dans les 10s: {len(kf_10s)}")
    print(f"\n{'Time':>8} | {'Ball Y':>8} | {'Ball X':>8} | {'Ball Z':>8} | {'Nearest Platform':>20} | {'Distance':>10}")
    print("-" * 90)
    
    for i in range(0, min(len(kf_10s), 100), 10):  # Échantillonner tous les 10 frames
        kf = kf_10s[i]
        t = kf['time'] / 1000
        ball_pos = kf['position']
        
        # Trouver la plateforme la plus proche en Y
        closest_platform = None
        min_dist_y = float('inf')
        
        for p in platforms:
            dist_y = abs(ball_pos['y'] - p['y'])
            if dist_y < min_dist_y:
                min_dist_y = dist_y
                closest_platform = p
        
        # Distance 3D totale
        if closest_platform:
            dist_3d = (
                (ball_pos['x'] - closest_platform['x'])**2 +
                (ball_pos['y'] - closest_platform['y'])**2 +
                (ball_pos['z'] - closest_platform['z'])**2
            )**0.5
            
            platform_info = f"P({closest_platform['x']:.1f}, {closest_platform['y']:.1f}, {closest_platform['z']:.1f})"
        else:
            dist_3d = 0
            platform_info = "None"
        
        print(f"{t:7.2f}s | {ball_pos['y']:7.2f}m | {ball_pos['x']:7.2f}m | {ball_pos['z']:7.2f}m | {platform_info:>20} | {dist_3d:9.2f}m")
    
    # 3. Détecter le mouvement circulaire
    print(f"\n🌀 DÉTECTION MOUVEMENT CIRCULAIRE (analyse des 3 premières secondes):\n")
    
    kf_3s = [kf for kf in keyframes if kf.get('time') is not None and kf['time'] <= 3000]
    
    # Calculer le rayon moyen par rapport au centre
    center_x = sum(kf['position']['x'] for kf in kf_3s) / len(kf_3s)
    center_z = sum(kf['position']['z'] for kf in kf_3s) / len(kf_3s)
    
    radii = []
    for kf in kf_3s:
        radius = ((kf['position']['x'] - center_x)**2 + (kf['position']['z'] - center_z)**2)**0.5
        radii.append(radius)
    
    avg_radius = sum(radii) / len(radii)
    radius_variance = sum((r - avg_radius)**2 for r in radii) / len(radii)
    
    print(f"   Centre apparent: X={center_x:.2f}m, Z={center_z:.2f}m")
    print(f"   Rayon moyen: {avg_radius:.2f}m")
    print(f"   Variance du rayon: {radius_variance:.4f}")
    
    if radius_variance < 1.0:
        print(f"   ⚠️  MOUVEMENT CIRCULAIRE DÉTECTÉ ! (variance < 1.0)")
    else:
        print(f"   ✅ Pas de mouvement circulaire majeur")
    
    # 4. Analyser les plateformes
    print(f"\n📦 ANALYSE PLATEFORMES:\n")
    
    # Première plateforme
    p0 = platforms[0]
    print(f"   Première plateforme:")
    print(f"      Position: ({p0['x']:.2f}, {p0['y']:.2f}, {p0['z']:.2f})")
    print(f"      Note time: {p0.get('noteTime', 'N/A')}s")
    print(f"      Note pitch: {p0.get('notePitch', 'N/A')}")
    
    # Premier keyframe
    kf0 = keyframes[0]
    print(f"\n   Premier keyframe:")
    print(f"      Position: ({kf0['position']['x']:.2f}, {kf0['position']['y']:.2f}, {kf0['position']['z']:.2f})")
    print(f"      Time: {kf0['time'] / 1000:.3f}s")
    
    # Distance entre premier keyframe et première plateforme
    dist = (
        (kf0['position']['x'] - p0['x'])**2 +
        (kf0['position']['y'] - p0['y'])**2 +
        (kf0['position']['z'] - p0['z'])**2
    )**0.5
    
    print(f"\n   Distance entre premier KF et première plateforme: {dist:.2f}m")
    
    if dist > 5:
        print(f"   ⚠️  PROBLÈME : Distance trop grande ! La balle commence loin de la première plateforme")
    
    # 5. Vérifier alignement temporel
    print(f"\n⏱️  ALIGNEMENT TEMPOREL:\n")
    
    print(f"   Premières plateformes vs keyframes:")
    for i in range(min(5, len(platforms))):
        p = platforms[i]
        note_time_ms = int(p.get('noteTime', 0) * 1000)
        
        # Trouver le keyframe le plus proche de ce temps
        closest_kf = min(keyframes, key=lambda kf: abs(kf['time'] - note_time_ms))
        time_diff = abs(closest_kf['time'] - note_time_ms)
        
        dist_to_platform = (
            (closest_kf['position']['x'] - p['x'])**2 +
            (closest_kf['position']['y'] - p['y'])**2 +
            (closest_kf['position']['z'] - p['z'])**2
        )**0.5
        
        print(f"   P{i}: note@{p.get('noteTime', 0):.2f}s → KF@{closest_kf['time']/1000:.2f}s (Δ={time_diff}ms, dist={dist_to_platform:.2f}m)")
    
    print("\n" + "=" * 80)
    print("🎯 RECOMMANDATIONS:")
    print("=" * 80)
    
    # Diagnostics automatiques
    issues = []
    
    if radius_variance < 1.0:
        issues.append("❌ Mouvement circulaire détecté au début → Vérifier si un tube spiral est généré par erreur")
    
    if dist > 5:
        issues.append("❌ Premier keyframe trop loin de première plateforme → Problème d'initialisation")
    
    # Vérifier si les keyframes commencent avant les plateformes
    first_note_time = platforms[0].get('noteTime', 0) * 1000 if platforms else 0
    first_kf_time = keyframes[0]['time'] if keyframes else 0
    
    if first_kf_time < first_note_time - 500:
        issues.append(f"❌ Keyframes commencent {(first_note_time - first_kf_time)/1000:.2f}s avant la première note")
    
    if not issues:
        print("✅ Aucun problème majeur détecté")
    else:
        for issue in issues:
            print(issue)

if __name__ == '__main__':
    json_path = sys.argv[1] if len(sys.argv) > 1 else 'data/leo_timed_path.json'
    analyze_trajectory(json_path)

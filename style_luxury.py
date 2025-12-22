#!/usr/bin/env python3
"""
Style LUXE : Or et Noir élégant
- Plateformes noires mates avec accents dorés
- Éclairage warm gold dramatique
- Balle dorée brillante avec trail
- Background noir profond avec spots de lumière
"""

import bpy
import math
import sys
from mathutils import Vector, Euler

def parse_args():
    try:
        argv = sys.argv[sys.argv.index("--") + 1:]
    except ValueError:
        argv = []
    
    args = {'frame': 60}
    i = 0
    while i < len(argv):
        if argv[i].startswith('--'):
            key = argv[i][2:]
            if i + 1 < len(argv) and not argv[i + 1].startswith('--'):
                args[key] = argv[i + 1]
                i += 2
            else:
                i += 1
        else:
            i += 1
    return args

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

def setup_luxury_render():
    """Setup pour rendu luxe premium"""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.fps = 30
    
    # Background noir profond
    world = bpy.data.worlds.new("LuxuryWorld")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputWorld')
    background = nodes.new('ShaderNodeBackground')
    
    # Noir très profond avec légère nuance chaude
    background.inputs['Color'].default_value = (0.02, 0.015, 0.01, 1.0)
    background.inputs['Strength'].default_value = 0.3
    
    world.node_tree.links.new(background.outputs['Background'], output.inputs['Surface'])
    print("✓ Luxury background: Deep black")

def create_gold_material(name, metallic=0.95, roughness=0.15):
    """Matériau or brillant réaliste"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    
    # Couleur or véritable
    gold_color = (1.0, 0.766, 0.336)  # Or 24 carats
    principled.inputs['Base Color'].default_value = (*gold_color, 1.0)
    principled.inputs['Metallic'].default_value = metallic
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Specular IOR Level'].default_value = 0.5
    
    # Émission légère pour glow
    principled.inputs['Emission Color'].default_value = (*gold_color, 1.0)
    principled.inputs['Emission Strength'].default_value = 0.3
    
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return mat

def create_black_matte_material(name, gold_trim=False):
    """Matériau noir mat élégant"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    
    # Noir profond mat
    principled.inputs['Base Color'].default_value = (0.05, 0.045, 0.04, 1.0)
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.4
    principled.inputs['Specular IOR Level'].default_value = 0.2
    
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    return mat

def create_luxury_lights():
    """Éclairage dramatique or chaud"""
    # Key light principal - Or chaud
    bpy.ops.object.light_add(type='AREA', location=(6, -10, 15))
    key = bpy.context.active_object
    key.data.energy = 2000
    key.data.size = 12
    key.data.color = (1.0, 0.85, 0.6)  # Warm gold
    
    # Rim light - Accentue les bords
    bpy.ops.object.light_add(type='AREA', location=(-8, -8, 12))
    rim = bpy.context.active_object
    rim.data.energy = 1200
    rim.data.size = 10
    rim.data.color = (1.0, 0.75, 0.4)  # Or intense
    
    # Back light - Sépare du fond
    bpy.ops.object.light_add(type='AREA', location=(0, 8, 10))
    back = bpy.context.active_object
    back.data.energy = 800
    back.data.size = 8
    back.data.color = (0.9, 0.7, 0.3)
    
    # Spotlight sur la balle
    bpy.ops.object.light_add(type='SPOT', location=(0, -5, 18))
    spot = bpy.context.active_object
    spot.data.energy = 3000
    spot.data.spot_size = math.radians(40)
    spot.data.spot_blend = 0.3
    spot.data.color = (1.0, 0.9, 0.7)
    
    print("✓ Luxury lighting: 4 warm gold lights")

def create_luxury_ball(position):
    """Balle dorée brillante avec glow"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=position)
    ball = bpy.context.active_object
    ball.name = "GoldenBall"
    
    # Matériau or ultra brillant
    mat = create_gold_material("Mat_GoldenBall", metallic=1.0, roughness=0.05)
    ball.data.materials.append(mat)
    
    # Smooth shading
    bpy.ops.object.shade_smooth()
    
    # Subdivision pour plus de détails
    mod = ball.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels = 2
    mod.render_levels = 2
    
    print(f"✓ Golden ball created at {position}")
    return ball

def create_luxury_platform(location, rotation, scale, index):
    """Plateforme noire avec accents dorés"""
    # Plateforme principale noire
    bpy.ops.mesh.primitive_cube_add()
    platform = bpy.context.active_object
    platform.name = f"Platform_{index}"
    platform.location = Vector(location)
    platform.rotation_euler = Euler(rotation, 'XYZ')
    platform.scale = Vector(scale)
    
    mat_black = create_black_matte_material(f"Mat_Black_{index}")
    platform.data.materials.append(mat_black)
    
    # Bordures dorées (4 petits cubes sur les côtés)
    border_thickness = 0.08
    border_height = scale[1] * 0.05
    
    # Bordures gauche et droite
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add()
        border = bpy.context.active_object
        border.name = f"Border_{index}_{side}"
        
        border_x = location[0] + side * (scale[0] + border_thickness)
        border.location = Vector((border_x, location[1], location[2]))
        border.rotation_euler = Euler(rotation, 'XYZ')
        border.scale = Vector((border_thickness, scale[1], border_height))
        
        mat_gold = create_gold_material(f"Mat_GoldBorder_{index}_{side}")
        border.data.materials.append(mat_gold)
    
    return platform

def generate_luxury_ramps(frame):
    """Génère rampes luxe style escalier royal"""
    print("Generating luxury ramps...")
    
    num_ramps = 8
    platforms = []
    
    for i in range(num_ramps):
        # Escalier qui descend en zigzag élégant
        x_offset = math.sin(i * 0.8) * 3.5
        y = i * 3.5
        z = -i * 2.2
        
        # Rotation pour pente douce
        angle_y = math.radians(-18)  # Pente douce élégante
        angle_z = math.sin(i * 0.8) * 0.2
        
        rotation = (0, angle_y, angle_z)
        scale = (2.5, 3.2, 0.25)
        
        platform = create_luxury_platform(
            (x_offset, y, z),
            rotation,
            scale,
            i
        )
        
        platforms.append((x_offset, y, z + 1.2))
    
    # Position de la balle
    t = frame / 30.0
    ramp_index = min(int(t * 2), num_ramps - 1)
    ball_x, ball_y, ball_z = platforms[ramp_index]
    
    ball = create_luxury_ball((ball_x, ball_y, ball_z))
    
    # Caméra cinématique
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.data.lens = 50  # Légèrement téléobjectif pour effet premium
    
    # Position caméra qui suit avec élégance
    cam.location = Vector((ball_x + 7, ball_y - 5, ball_z + 4))
    
    # Regarder la balle
    direction = Vector((ball_x, ball_y, ball_z)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = cam
    
    print(f"✓ Frame {frame}: Ball at ramp {ramp_index}, pos=({ball_x:.1f}, {ball_y:.1f}, {ball_z:.1f})")
    print(f"✓ Generated {num_ramps} luxury platforms with gold trim")

def main():
    args = parse_args()
    frame = int(args.get('frame', 60))
    
    print("\n" + "="*70)
    print("🏆 LUXURY STYLE : Or et Noir Élégant")
    print(f"Frame {frame}")
    print("="*70 + "\n")
    
    clear_scene()
    setup_luxury_render()
    create_luxury_lights()
    generate_luxury_ramps(frame)
    
    # Rendu
    scene = bpy.context.scene
    scene.frame_set(1)
    scene.render.filepath = f"/tmp/luxury_style_frame{frame}.png"
    
    print("\n" + "-"*70)
    print("Rendering luxury scene...")
    print("-"*70)
    
    bpy.ops.render.render(write_still=True)
    
    print("\n" + "="*70)
    print(f"✨ SUCCESS : {scene.render.filepath}")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

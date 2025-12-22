#!/usr/bin/env python3
"""
Import modèle Meshy.ai dans Blender et rendu test
"""

import bpy
import sys
import os
from mathutils import Vector, Euler
import math

def parse_args():
    try:
        argv = sys.argv[sys.argv.index("--") + 1:]
    except ValueError:
        argv = []
    
    args = {}
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

def setup_render():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.fps = 30
    
    # Background noir luxe
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputWorld')
    background = nodes.new('ShaderNodeBackground')
    background.inputs['Color'].default_value = (0.01, 0.008, 0.006, 1.0)
    background.inputs['Strength'].default_value = 0.2
    world.node_tree.links.new(background.outputs['Background'], output.inputs['Surface'])

def import_glb(glb_path):
    """Import modèle GLB"""
    print(f"Importing GLB: {glb_path}")
    
    if not os.path.exists(glb_path):
        raise FileNotFoundError(f"GLB not found: {glb_path}")
    
    # Import GLB/GLTF
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
    imported_objects = [obj for obj in bpy.context.selected_objects]
    print(f"✓ Imported {len(imported_objects)} objects")
    
    return imported_objects

def create_gold_ball(position):
    """Balle dorée brillante"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=position)
    ball = bpy.context.active_object
    ball.name = "GoldenBall"
    
    # Matériau or
    mat = bpy.data.materials.new("Mat_Gold_Ball")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')
    
    principled.inputs['Base Color'].default_value = (1.0, 0.766, 0.336, 1.0)
    principled.inputs['Metallic'].default_value = 1.0
    principled.inputs['Roughness'].default_value = 0.05
    principled.inputs['Emission Color'].default_value = (1.0, 0.766, 0.336, 1.0)
    principled.inputs['Emission Strength'].default_value = 0.5
    
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    ball.data.materials.append(mat)
    
    bpy.ops.object.shade_smooth()
    
    return ball

def setup_luxury_lights():
    """Éclairage warm gold"""
    # Key
    bpy.ops.object.light_add(type='AREA', location=(8, -12, 18))
    key = bpy.context.active_object
    key.data.energy = 2500
    key.data.size = 15
    key.data.color = (1.0, 0.85, 0.6)
    
    # Rim
    bpy.ops.object.light_add(type='AREA', location=(-10, -10, 15))
    rim = bpy.context.active_object
    rim.data.energy = 1500
    rim.data.size = 12
    rim.data.color = (1.0, 0.75, 0.4)
    
    # Spot sur balle
    bpy.ops.object.light_add(type='SPOT', location=(0, -8, 20))
    spot = bpy.context.active_object
    spot.data.energy = 3500
    spot.data.spot_size = math.radians(45)
    spot.data.color = (1.0, 0.9, 0.7)

def setup_camera(target_position):
    """Caméra cinématique"""
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.data.lens = 50
    
    # Position élégante
    cam_pos = Vector((target_position[0] + 8, target_position[1] - 6, target_position[2] + 5))
    cam.location = cam_pos
    
    # Regarder le centre
    direction = Vector(target_position) - cam_pos
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = cam
    return cam

def main():
    args = parse_args()
    
    if 'glb' not in args:
        print("ERROR: --glb argument required")
        print("Usage: blender -b -P import_meshy_level.py -- --glb path/to/model.glb")
        sys.exit(1)
    
    glb_path = args['glb']
    
    print("\n" + "="*70)
    print("🏆 IMPORT MESHY.AI LUXURY LEVEL")
    print("="*70 + "\n")
    
    clear_scene()
    setup_render()
    
    # Import niveau IA
    imported = import_glb(glb_path)
    
    # Calculer centre du niveau
    if imported:
        all_coords = []
        for obj in imported:
            if obj.type == 'MESH':
                all_coords.extend([obj.matrix_world @ v.co for v in obj.data.vertices])
        
        if all_coords:
            center = sum((Vector(co) for co in all_coords), Vector()) / len(all_coords)
            print(f"Level center: {center}")
        else:
            center = Vector((0, 0, 0))
    else:
        center = Vector((0, 0, 0))
    
    # Ajouter balle dorée
    ball_pos = (center.x, center.y, center.z + 3)
    ball = create_gold_ball(ball_pos)
    
    # Setup lights et caméra
    setup_luxury_lights()
    camera = setup_camera(ball_pos)
    
    # Rendu frame test
    output_path = "/tmp/meshy_luxury_test.png"
    scene = bpy.context.scene
    scene.frame_set(1)
    scene.render.filepath = output_path
    
    print("\n" + "-"*70)
    print("Rendering test frame...")
    print("-"*70)
    
    bpy.ops.render.render(write_still=True)
    
    print("\n" + "="*70)
    print(f"✨ SUCCESS: {output_path}")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""
Script Blender: Construction scène 3D, animation, rendu headless
Usage: blender -b -P render_blender.py -- --level level.json --outFrames ./frames
"""

import bpy
import json
import sys
import math
import os
from pathlib import Path
from mathutils import Vector, Euler


def parse_args():
    """Parse les arguments après '--'"""
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
                args[key] = True
                i += 1
        else:
            i += 1
    
    return args


def hex_to_rgb(hex_color):
    """Convertit hex (#RRGGBB) en RGB (0-1)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def clear_scene():
    """Nettoie la scène"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Nettoie les matériaux orphelins
    for material in bpy.data.materials:
        bpy.data.materials.remove(material)


def setup_scene(level):
    """Configure la scène Blender"""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.resolution_percentage = 100
    scene.render.fps = level['fps']
    
    # EEVEE settings - Compatible Blender 5.x
    eevee = scene.eevee
    
    # Bloom DÉSACTIVÉ pour simplifier
    try:
        eevee.use_bloom = False
    except AttributeError:
        pass
    
    # Motion blur DÉSACTIVÉ pour simplifier
    try:
        eevee.use_motion_blur = False
    except AttributeError:
        scene.render.use_motion_blur = False
    
    # SSR (Screen Space Reflections) DÉSACTIVÉ
    try:
        eevee.use_ssr = False
    except AttributeError:
        pass
    
    # Background
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    
    nodes = world.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputWorld')
    background = nodes.new('ShaderNodeBackground')
    
    bg_color = hex_to_rgb(level['style']['palette']['background'])
    background.inputs['Color'].default_value = (*bg_color, 1.0)
    background.inputs['Strength'].default_value = 0.3
    
    world.node_tree.links.new(background.outputs['Background'], output.inputs['Surface'])
    
    # Fog DÉSACTIVÉ pour simplifier
    world.mist_settings.use_mist = False
    
    print(f"Scene configured: {scene.render.resolution_x}x{scene.render.resolution_y} @ {scene.render.fps}fps (SIMPLE MODE)")


def create_emissive_material(name, color_hex, emission_strength=2.0):
    """Crée un matériau émissif"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    glossy = nodes.new('ShaderNodeBsdfGlossy')
    mix = nodes.new('ShaderNodeMixShader')
    
    color = hex_to_rgb(color_hex)
    emission.inputs['Color'].default_value = (*color, 1.0)
    emission.inputs['Strength'].default_value = emission_strength * 1.5  # Boost émission
    
    glossy.inputs['Color'].default_value = (*color, 1.0)
    glossy.inputs['Roughness'].default_value = 0.2
    
    mix.inputs['Fac'].default_value = 0.8  # Plus d'émission (était 0.7)
    
    links = mat.node_tree.links
    links.new(emission.outputs['Emission'], mix.inputs[1])
    links.new(glossy.outputs['BSDF'], mix.inputs[2])
    links.new(mix.outputs['Shader'], output.inputs['Surface'])
    
    return mat


def create_platforms(level):
    """Crée les plateformes"""
    platforms_objs = []
    palette = level['style']['palette']
    platform_colors = palette['platforms']
    
    for i, platform in enumerate(level['platforms']):
        # Créer cube
        bpy.ops.mesh.primitive_cube_add()
        obj = bpy.context.active_object
        obj.name = f"Platform_{i}"
        
        # Position, rotation, scale
        obj.location = Vector(platform['pos'])
        obj.rotation_euler = Euler(platform['rot'], 'XYZ')
        obj.scale = Vector(platform['size'])
        
        # Matériau
        color = platform_colors[i % len(platform_colors)]
        mat = create_emissive_material(f"Mat_Platform_{i}", color, 1.5)
        obj.data.materials.append(mat)
        
        platforms_objs.append(obj)
    
    print(f"Created {len(platforms_objs)} platforms")
    return platforms_objs


def create_ball(level):
    """Crée la balle"""
    # Balle 3x plus grosse pour être bien visible
    radius = level['ball']['radius'] * 3.0
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius)
    ball = bpy.context.active_object
    ball.name = "Ball"
    
    # Matériau émissif TRÈS lumineux (jaune/orange vif)
    mat = create_emissive_material("Mat_Ball", "#FFFF00", level['style']['glow_intensity'] * 2.0)
    ball.data.materials.append(mat)
    
    # Smooth shading
    bpy.ops.object.shade_smooth()
    
    print(f"Ball created (radius: {radius:.2f})")
    return ball


def animate_ball(ball, platforms, level):
    """Anime la balle avec rebonds sur plateformes"""
    fps = level['fps']
    gravity = level['gravity']
    restitution = level['ball']['restitution']
    
    # Position initiale: au-dessus de la première plateforme
    if len(platforms) > 0:
        first_platform = level['platforms'][0]
        start_pos = Vector(first_platform['pos'])
        start_pos.y += 2.0  # 2m au-dessus
        ball.location = start_pos
        ball.keyframe_insert(data_path="location", frame=1)
    
    # Animation de rebond pour chaque plateforme
    for i, platform_data in enumerate(level['platforms']):
        t = platform_data['t']
        frame = int(t * fps)
        
        platform_pos = Vector(platform_data['pos'])
        
        # Position de rebond (au-dessus de la plateforme)
        bounce_pos = platform_pos.copy()
        bounce_pos.y += level['ball']['radius'] + 0.05
        
        # Keyframe de contact
        ball.location = bounce_pos
        ball.keyframe_insert(data_path="location", frame=frame)
        
        # Arc parabolique vers la prochaine plateforme
        if i < len(level['platforms']) - 1:
            next_platform_data = level['platforms'][i + 1]
            next_t = next_platform_data['t']
            next_frame = int(next_t * fps)
            next_pos = Vector(next_platform_data['pos'])
            
            # Point culminant de l'arc (mid-air)
            mid_frame = int((frame + next_frame) / 2)
            mid_pos = (bounce_pos + next_pos) / 2
            mid_pos.y += 1.0 * platform_data['intensity']  # Hauteur basée sur intensité
            
            ball.location = mid_pos
            ball.keyframe_insert(data_path="location", frame=mid_frame)
    
    # Interpolation F-Curve (bezier pour courbe naturelle)
    # Blender 5.x: fcurves remplacé par keyframe_points direct
    if ball.animation_data and ball.animation_data.action:
        print("Setting keyframe interpolation to BEZIER")
        # Dans Blender 5.x, l'interpolation se fait différemment
        # On skip cette partie car pas critique pour le rendu
    
    print(f"Ball animated with {len(platforms)} bounces")


def create_camera(level):
    """Crée la caméra FIXE en angle pour voir toute la scène"""
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "Camera"
    
    # Settings caméra - PAS de DOF pour tout voir net
    camera.data.lens = level['camera']['fov']
    camera.data.dof.use_dof = False
    
    # Position fixe : côté et en hauteur pour voir toute l'action
    # Z moyen des plateformes = ~12 (début 4.7, fin 19.1)
    camera.location = Vector((8, -12, 14))  # En arrière, sur le côté, en hauteur
    
    # Regarder vers le centre de l'action
    look_target = Vector((0, 0, 12))  # Centre de la zone de jeu
    direction = look_target - camera.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    camera.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = camera
    
    print(f"Camera created (FIXED at {camera.location})")
    return camera


def animate_camera_follow(camera, ball, level):
    """Caméra FIXE - pas d'animation"""
    print("Camera FIXED (no animation)")


def create_lights():
    """Crée l'éclairage"""
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(5, -5, 8))
    key = bpy.context.active_object
    key.data.energy = 1000  # Doublé
    key.data.size = 8  # Plus grand
    
    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(-5, -5, 8))
    rim = bpy.context.active_object
    rim.data.energy = 600  # Doublé
    rim.data.size = 6  # Plus grand
    rim.data.color = (0.5, 0.7, 1.0)
    
    # Fill
    bpy.ops.object.light_add(type='AREA', location=(0, 5, 5))
    fill = bpy.context.active_object
    fill.data.energy = 400  # Doublé
    fill.data.size = 8  # Plus grand
    
    print("Lights created")


def render_animation(output_dir, level, max_frames=None):
    """Rend l'animation frame par frame"""
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = os.path.join(output_dir, 'frame_')
    
    total_frames = int(level['duration'] * level['fps'])
    
    # Limiter nombre de frames si demandé (pour tests rapides)
    if max_frames and max_frames < total_frames:
        total_frames = max_frames
    
    scene.frame_start = 1
    scene.frame_end = total_frames
    
    print(f"Rendering {total_frames} frames to {output_dir}...")
    
    # Rendu
    bpy.ops.render.render(animation=True)
    
    print("Rendering complete")


def main():
    args = parse_args()
    
    if 'level' not in args or 'outFrames' not in args:
        print("ERROR: Missing required arguments")
        print("Usage: blender -b -P render_blender.py -- --level level.json --outFrames ./frames")
        sys.exit(1)
    
    level_path = args['level']
    output_dir = args['outFrames']
    max_frames = int(args.get('maxFrames', 0)) or None  # 0 = toutes les frames
    
    print(f"Loading level: {level_path}")
    if max_frames:
        print(f"Max frames limit: {max_frames}")
    
    # Charger level JSON
    with open(level_path, 'r') as f:
        level = json.load(f)
    
    # Créer dossier de sortie
    os.makedirs(output_dir, exist_ok=True)
    
    # Construction de la scène
    print("Building scene...")
    clear_scene()
    setup_scene(level)
    
    platforms_objs = create_platforms(level)
    ball = create_ball(level)
    animate_ball(ball, platforms_objs, level)
    
    camera = create_camera(level)
    animate_camera_follow(camera, ball, level)
    
    create_lights()
    
    # Rendu
    render_animation(output_dir, level, max_frames)
    
    print("SUCCESS")
    sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""
Batch render: Import Meshy level + Animate + Render all frames
"""

import bpy
import json
import sys
import math
from pathlib import Path
from mathutils import Vector

# ============================================================================
# IMPORT & SETUP (same as render_audio_driven.py)
# ============================================================================

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_glb(glb_path):
    print(f"Importing: {glb_path}")
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
    print(f"✓ Imported {len(imported)} objects")
    return imported

def create_gold_ball(position=(0, 0, 5)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=position)
    ball = bpy.context.active_object
    ball.name = "GoldenBall"
    
    mat = bpy.data.materials.new(name="Gold")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (1.0, 0.766, 0.336, 1.0)
    bsdf.inputs['Metallic'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = 0.05
    
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    ball.data.materials.append(mat)
    return ball

def setup_luxury_lights():
    lights = []
    
    bpy.ops.object.light_add(type='AREA', location=(6, -10, 15))
    key = bpy.context.active_object
    key.data.energy = 2000
    key.data.color = (1.0, 0.85, 0.6)
    key.data.size = 5
    lights.append(key)
    
    bpy.ops.object.light_add(type='AREA', location=(-8, -8, 12))
    rim = bpy.context.active_object
    rim.data.energy = 1200
    rim.data.color = (1.0, 0.75, 0.4)
    rim.data.size = 4
    lights.append(rim)
    
    bpy.ops.object.light_add(type='POINT', location=(0, 8, 10))
    back = bpy.context.active_object
    back.data.energy = 800
    back.data.color = (0.9, 0.7, 0.3)
    lights.append(back)
    
    bpy.ops.object.light_add(type='SPOT', location=(0, -5, 18))
    spot = bpy.context.active_object
    spot.data.energy = 3000
    spot.data.spot_size = math.radians(40)
    spot.data.color = (1.0, 0.9, 0.7)
    lights.append(spot)
    
    return lights

def setup_camera(target_location):
    bpy.ops.object.camera_add(location=(
        target_location[0] + 8,
        target_location[1] - 6,
        target_location[2] + 5
    ))
    camera = bpy.context.active_object
    camera.data.lens = 50
    
    direction = target_location - camera.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    camera.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = camera
    return camera

def setup_world():
    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.02, 0.02, 0.03, 1.0)
    bg.inputs['Strength'].default_value = 0.1

def setup_render_settings(output_dir, fps=30):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.fps = fps
    scene.render.filepath = str(output_dir) + "/"
    scene.render.image_settings.file_format = 'PNG'

# ============================================================================
# ANIMATION
# ============================================================================

def load_audio_analysis(json_path):
    with open(json_path) as f:
        data = json.load(f)
    onset_times = [o['t'] if isinstance(o, dict) else o for o in data['onsets']]
    return onset_times, data['duration']

def find_level_geometry():
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and 'ball' not in obj.name.lower():
            return obj
    return None

def get_descent_path(level_obj, num_points=50):
    if not level_obj:
        points = []
        for i in range(num_points):
            t = i / (num_points - 1)
            angle = t * math.pi * 4
            radius = 3 * (1 - t * 0.3)
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            z = 5 - t * 8
            points.append((x, y, z))
        return points
    
    vertices = [level_obj.matrix_world @ v.co for v in level_obj.data.vertices]
    vertices.sort(key=lambda v: -v.z)
    
    if len(vertices) >= num_points:
        step = len(vertices) // num_points
        points = [vertices[i * step] for i in range(num_points)]
    else:
        points = vertices + [vertices[-1]] * (num_points - len(vertices))
    
    return [(p.x, p.y, p.z + 0.7) for p in points]

def animate_ball(ball, onsets, duration, fps=30):
    level = find_level_geometry()
    path_points = get_descent_path(level, len(onsets) + 10)
    
    ball.animation_data_clear()
    
    ball.location = path_points[0]
    ball.keyframe_insert(data_path="location", frame=1)
    ball.keyframe_insert(data_path="scale", frame=1)
    
    for i, onset_time in enumerate(onsets):
        frame = int(onset_time * fps) + 1
        path_idx = min(int((onset_time / duration) * len(path_points)), len(path_points) - 1)
        
        ball.location = path_points[path_idx]
        ball.scale = (1.2, 1.2, 1.2)
        ball.keyframe_insert(data_path="location", frame=frame)
        ball.keyframe_insert(data_path="scale", frame=frame)
        
        if frame + 3 <= duration * fps:
            ball.scale = (1.0, 1.0, 1.0)
            ball.keyframe_insert(data_path="scale", frame=frame + 3)
    
    final_frame = int(duration * fps)
    ball.location = path_points[-1]
    ball.scale = (1.0, 1.0, 1.0)
    ball.keyframe_insert(data_path="location", frame=final_frame)
    ball.keyframe_insert(data_path="scale", frame=final_frame)

def animate_camera(camera, ball, duration, fps=30):
    camera.animation_data_clear()
    offset = (8, -6, 5)
    
    for progress in [0, 0.33, 0.67, 1.0]:
        frame = int(progress * duration * fps) + 1
        bpy.context.scene.frame_set(frame)
        
        ball_pos = ball.location
        camera.location = (
            ball_pos[0] + offset[0],
            ball_pos[1] + offset[1],
            ball_pos[2] + offset[2]
        )
        camera.keyframe_insert(data_path="location", frame=frame)
        
        direction = ball_pos - camera.location
        rot_quat = direction.to_track_quat('-Z', 'Y')
        camera.rotation_euler = rot_quat.to_euler()
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)

# ============================================================================
# MAIN - BATCH RENDER
# ============================================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--glb', required=True)
    parser.add_argument('--analysis', required=True)
    parser.add_argument('--output', required=True, help='Output directory for frames')
    parser.add_argument('--fps', type=int, default=30)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    
    print("\n" + "="*70)
    print("  🎬 BATCH RENDER - AUDIO-DRIVEN ANIMATION")
    print("="*70 + "\n")
    
    # Load audio
    onsets, duration = load_audio_analysis(args.analysis)
    total_frames = int(duration * args.fps)
    print(f"Audio: {duration:.1f}s, {len(onsets)} onsets")
    print(f"Rendering: {total_frames} frames @ {args.fps}fps\n")
    
    # Setup scene
    clear_scene()
    imported = import_glb(args.glb)
    
    if imported:
        level = imported[0]
        bbox = [level.matrix_world @ v.co for v in level.data.vertices]
        center = sum([v for v in bbox], Vector()) / len(bbox)
    else:
        center = Vector((0, 0, 0))
    
    ball = create_gold_ball(position=(center.x, center.y, center.z + 3))
    setup_luxury_lights()
    camera = setup_camera(center)
    setup_world()
    
    # Timeline
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = total_frames
    bpy.context.scene.render.fps = args.fps
    
    # Animate
    print("Creating animation...")
    animate_ball(ball, onsets, duration, args.fps)
    animate_camera(camera, ball, duration, args.fps)
    print(f"✓ Animation ready: {total_frames} frames\n")
    
    # Render settings
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    setup_render_settings(output_dir, args.fps)
    
    # Batch render
    print("="*70)
    print(f"  RENDERING {total_frames} FRAMES")
    print("="*70 + "\n")
    
    bpy.ops.render.render(animation=True)
    
    print("\n" + "="*70)
    print(f"  ✨ FRAMES SAVED: {output_dir}")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Complete pipeline: Import Meshy level + Animate ball to audio
"""

import bpy
import json
import sys
import math
from pathlib import Path
from mathutils import Vector

# ============================================================================
# IMPORT & SETUP
# ============================================================================

def clear_scene():
    """Clear all existing objects"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_glb(glb_path):
    """Import GLB file"""
    print(f"Importing GLB: {glb_path}")
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
    print(f"✓ Imported {len(imported)} objects")
    return imported

def create_gold_ball(position=(0, 0, 5)):
    """Create golden ball"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=position)
    ball = bpy.context.active_object
    ball.name = "GoldenBall"
    
    # Gold material
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
    """Create 4-point luxury lighting"""
    lights = []
    
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(6, -10, 15))
    key = bpy.context.active_object
    key.data.energy = 2000
    key.data.color = (1.0, 0.85, 0.6)
    key.data.size = 5
    lights.append(key)
    
    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(-8, -8, 12))
    rim = bpy.context.active_object
    rim.data.energy = 1200
    rim.data.color = (1.0, 0.75, 0.4)
    rim.data.size = 4
    lights.append(rim)
    
    # Back light
    bpy.ops.object.light_add(type='POINT', location=(0, 8, 10))
    back = bpy.context.active_object
    back.data.energy = 800
    back.data.color = (0.9, 0.7, 0.3)
    lights.append(back)
    
    # Spot from above
    bpy.ops.object.light_add(type='SPOT', location=(0, -5, 18))
    spot = bpy.context.active_object
    spot.data.energy = 3000
    spot.data.spot_size = math.radians(40)
    spot.data.color = (1.0, 0.9, 0.7)
    lights.append(spot)
    
    print("✓ Luxury lights setup")
    return lights

def setup_camera(target_location):
    """Setup cinematic camera"""
    bpy.ops.object.camera_add(location=(
        target_location[0] + 8,
        target_location[1] - 6,
        target_location[2] + 5
    ))
    camera = bpy.context.active_object
    camera.data.lens = 50
    
    # Point at target
    direction = target_location - camera.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    camera.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = camera
    print("✓ Camera setup")
    return camera

def setup_world():
    """Dark elegant background"""
    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.02, 0.02, 0.03, 1.0)
    bg.inputs['Strength'].default_value = 0.1

def setup_render_settings(output_path, fps=30):
    """Configure EEVEE render settings"""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.fps = fps
    scene.render.filepath = output_path
    scene.render.image_settings.file_format = 'PNG'

# ============================================================================
# ANIMATION
# ============================================================================

def load_audio_analysis(json_path):
    """Load onset times"""
    with open(json_path) as f:
        data = json.load(f)
    # Extract time values from onset dictionaries
    onset_times = [o['t'] if isinstance(o, dict) else o for o in data['onsets']]
    return onset_times, data['duration']

def find_level_geometry():
    """Find imported level mesh"""
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and 'ball' not in obj.name.lower():
            return obj
    return None

def get_descent_path(level_obj, num_points=50):
    """Sample descent path"""
    if not level_obj:
        # Fallback spiral
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
    
    # Sample from level vertices
    vertices = [level_obj.matrix_world @ v.co for v in level_obj.data.vertices]
    vertices.sort(key=lambda v: -v.z)
    
    if len(vertices) >= num_points:
        step = len(vertices) // num_points
        points = [vertices[i * step] for i in range(num_points)]
    else:
        points = vertices + [vertices[-1]] * (num_points - len(vertices))
    
    return [(p.x, p.y, p.z + 0.7) for p in points]

def animate_ball(ball, onsets, duration, fps=30):
    """Create onset-synced keyframes"""
    print(f"🎬 Animating: {len(onsets)} onsets, {duration:.1f}s")
    
    level = find_level_geometry()
    path_points = get_descent_path(level, len(onsets) + 10)
    
    ball.animation_data_clear()
    
    # Start position
    ball.location = path_points[0]
    ball.keyframe_insert(data_path="location", frame=1)
    ball.keyframe_insert(data_path="scale", frame=1)
    
    # Keyframe at each onset
    for i, onset_time in enumerate(onsets):
        frame = int(onset_time * fps) + 1
        path_idx = min(int((onset_time / duration) * len(path_points)), len(path_points) - 1)
        
        # Bounce at onset
        ball.location = path_points[path_idx]
        ball.scale = (1.2, 1.2, 1.2)
        ball.keyframe_insert(data_path="location", frame=frame)
        ball.keyframe_insert(data_path="scale", frame=frame)
        
        # Recover
        if frame + 3 <= duration * fps:
            ball.scale = (1.0, 1.0, 1.0)
            ball.keyframe_insert(data_path="scale", frame=frame + 3)
    
    # End position
    final_frame = int(duration * fps)
    ball.location = path_points[-1]
    ball.scale = (1.0, 1.0, 1.0)
    ball.keyframe_insert(data_path="location", frame=final_frame)
    ball.keyframe_insert(data_path="scale", frame=final_frame)
    
    print(f"✓ {len(onsets)} keyframes created")

def animate_camera(camera, ball, duration, fps=30):
    """Camera follows ball"""
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
    
    print("✓ Camera tracking")

# ============================================================================
# MAIN
# ============================================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--glb', required=True, help='GLB file')
    parser.add_argument('--analysis', required=True, help='Audio analysis JSON')
    parser.add_argument('--output', default='/tmp/audio_test.png', help='Test output')
    parser.add_argument('--fps', type=int, default=30, help='Frame rate')
    parser.add_argument('--render-frames', type=int, default=1, help='Frames to render (0=none)')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    
    print("\n" + "="*70)
    print("  🎵 AUDIO-DRIVEN 3D LEVEL ANIMATION")
    print("="*70 + "\n")
    
    # Load audio analysis
    onsets, duration = load_audio_analysis(args.analysis)
    print(f"Audio: {duration:.1f}s, {len(onsets)} onsets\n")
    
    # Clear and import
    clear_scene()
    imported = import_glb(args.glb)
    
    # Find level center
    if imported:
        level = imported[0]
        bbox = [level.matrix_world @ v.co for v in level.data.vertices]
        center = sum([v for v in bbox], Vector()) / len(bbox)
        print(f"Level center: {center}")
    else:
        center = Vector((0, 0, 0))
    
    # Setup scene
    ball = create_gold_ball(position=(center.x, center.y, center.z + 3))
    setup_luxury_lights()
    camera = setup_camera(center)
    setup_world()
    
    # Setup timeline
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = int(duration * args.fps)
    bpy.context.scene.render.fps = args.fps
    
    # Animate
    animate_ball(ball, onsets, duration, args.fps)
    animate_camera(camera, ball, duration, args.fps)
    
    print(f"\n✓ Animation ready: {int(duration * args.fps)} frames")
    
    # Render test
    if args.render_frames > 0:
        print(f"\n{'─'*70}")
        print("  Rendering test frames...")
        print('─'*70 + "\n")
        
        setup_render_settings(args.output, args.fps)
        
        for i in range(args.render_frames):
            frame = 1 + i * (int(duration * args.fps) // args.render_frames) if args.render_frames > 1 else 1
            bpy.context.scene.frame_set(frame)
            output = args.output.replace('.png', f'_frame{frame:04d}.png')
            bpy.context.scene.render.filepath = output
            bpy.ops.render.render(write_still=True)
            print(f"✓ Frame {frame} → {output}")
    
    print("\n" + "="*70)
    print("  ✨ SUCCESS")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()

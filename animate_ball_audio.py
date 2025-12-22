#!/usr/bin/env python3
"""
Animate ball synchronized to audio onsets
"""

import bpy
import json
import sys
import math
from pathlib import Path

def load_audio_analysis(json_path):
    """Load onset times from audio analysis"""
    with open(json_path) as f:
        data = json.load(f)
    return data['onsets'], data['duration']

def find_level_geometry():
    """Find imported level mesh"""
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and 'ball' not in obj.name.lower():
            return obj
    return None

def find_ball():
    """Find golden ball object"""
    for obj in bpy.data.objects:
        if 'ball' in obj.name.lower() or 'sphere' in obj.name.lower():
            return obj
    return None

def get_descent_path(level_obj, num_points=50):
    """Sample descent path along level geometry"""
    if not level_obj:
        # Fallback: simple descending spiral
        points = []
        for i in range(num_points):
            t = i / (num_points - 1)
            angle = t * math.pi * 4  # 2 full rotations
            radius = 3 * (1 - t * 0.3)  # Shrinking spiral
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            z = 5 - t * 8  # Descend from z=5 to z=-3
            points.append((x, y, z))
        return points
    
    # Sample points from level mesh vertices
    vertices = [level_obj.matrix_world @ v.co for v in level_obj.data.vertices]
    
    # Sort by Z (high to low)
    vertices.sort(key=lambda v: -v.z)
    
    # Take top vertices and smooth path
    if len(vertices) >= num_points:
        step = len(vertices) // num_points
        points = [vertices[i * step] for i in range(num_points)]
    else:
        points = vertices + [vertices[-1]] * (num_points - len(vertices))
    
    return [(p.x, p.y, p.z + 0.7) for p in points]  # +0.7 to keep ball above surface

def create_ball_animation(ball, onsets, duration, fps=30):
    """Create keyframes at onset times"""
    if not ball:
        print("❌ No ball found")
        return
    
    print(f"🎬 Creating animation: {len(onsets)} onsets over {duration:.1f}s")
    
    # Get or create level geometry
    level = find_level_geometry()
    path_points = get_descent_path(level, len(onsets) + 10)
    
    # Clear existing animation
    ball.animation_data_clear()
    
    # Initial position
    start_pos = path_points[0]
    ball.location = start_pos
    ball.keyframe_insert(data_path="location", frame=1)
    ball.keyframe_insert(data_path="scale", frame=1)
    
    # Create keyframes at each onset
    for i, onset_time in enumerate(onsets):
        frame = int(onset_time * fps) + 1
        
        # Position along path
        path_index = min(int((onset_time / duration) * len(path_points)), len(path_points) - 1)
        pos = path_points[path_index]
        
        # Bounce effect: scale up at impact
        ball.location = pos
        ball.scale = (1.2, 1.2, 1.2)  # Squash on impact
        ball.keyframe_insert(data_path="location", frame=frame)
        ball.keyframe_insert(data_path="scale", frame=frame)
        
        # Return to normal scale after bounce
        if frame + 3 <= duration * fps:
            ball.scale = (1.0, 1.0, 1.0)
            ball.keyframe_insert(data_path="scale", frame=frame + 3)
    
    # Final position
    final_frame = int(duration * fps)
    ball.location = path_points[-1]
    ball.scale = (1.0, 1.0, 1.0)
    ball.keyframe_insert(data_path="location", frame=final_frame)
    ball.keyframe_insert(data_path="scale", frame=final_frame)
    
    # Smooth interpolation
    if ball.animation_data and ball.animation_data.action:
        for fcurve in ball.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = 'BEZIER'
                keyframe.handle_left_type = 'AUTO_CLAMPED'
                keyframe.handle_right_type = 'AUTO_CLAMPED'
    
    print(f"✓ Animation created: {len(onsets)} keyframes")

def setup_camera_follow(ball, duration, fps=30):
    """Setup camera to follow ball smoothly"""
    camera = bpy.data.objects.get('Camera')
    if not camera or not ball:
        return
    
    # Clear camera animation
    camera.animation_data_clear()
    
    # Camera follows ball with offset
    offset = (8, -6, 5)
    
    # Keyframe at start, middle, end
    for progress in [0, 0.5, 1.0]:
        frame = int(progress * duration * fps) + 1
        bpy.context.scene.frame_set(frame)
        
        ball_pos = ball.location
        camera.location = (
            ball_pos[0] + offset[0],
            ball_pos[1] + offset[1],
            ball_pos[2] + offset[2]
        )
        camera.keyframe_insert(data_path="location", frame=frame)
        
        # Point camera at ball
        direction = ball_pos - camera.location
        rot_quat = direction.to_track_quat('-Z', 'Y')
        camera.rotation_euler = rot_quat.to_euler()
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    
    # Smooth camera movement
    if camera.animation_data and camera.animation_data.action:
        for fcurve in camera.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = 'BEZIER'
    
    print("✓ Camera tracking setup")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--analysis', required=True, help='Audio analysis JSON')
    parser.add_argument('--fps', type=int, default=30, help='Frame rate')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    
    print("\n" + "="*70)
    print("  🎵 ANIMATE BALL TO AUDIO")
    print("="*70 + "\n")
    
    # Load audio analysis
    onsets, duration = load_audio_analysis(args.analysis)
    print(f"Audio: {duration:.1f}s, {len(onsets)} onsets")
    
    # Find ball
    ball = find_ball()
    if not ball:
        print("❌ Ball not found, creating one...")
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(0, 0, 5))
        ball = bpy.context.active_object
        ball.name = "GoldenBall"
    
    # Setup scene
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = int(duration * args.fps)
    bpy.context.scene.render.fps = args.fps
    
    # Create animation
    create_ball_animation(ball, onsets, duration, args.fps)
    setup_camera_follow(ball, duration, args.fps)
    
    print("\n" + "="*70)
    print(f"  ✨ Animation ready: {int(duration * args.fps)} frames")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()

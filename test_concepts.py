#!/usr/bin/env python3
"""
Test 3 concepts visuels de rampes/pentes
Usage: blender -b -P test_concepts.py -- --concept A --frame 1
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
    
    args = {'concept': 'A', 'frame': 1}
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
    
    # Simple, pas d'effets (compatible Blender 5.x)
    try:
        scene.eevee.use_bloom = False
        scene.eevee.use_motion_blur = False
    except AttributeError:
        pass  # Blender 5.x n'a pas ces attributs
    
    # Background sombre mais visible
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputWorld')
    background = nodes.new('ShaderNodeBackground')
    background.inputs['Color'].default_value = (0.05, 0.05, 0.1, 1.0)
    background.inputs['Strength'].default_value = 0.5
    world.node_tree.links.new(background.outputs['Background'], output.inputs['Surface'])

def create_emissive_mat(name, color, strength=3.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (*color, 1.0)
    emission.inputs['Strength'].default_value = strength
    
    mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])
    return mat

def create_lights():
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(5, -8, 12))
    key = bpy.context.active_object
    key.data.energy = 1500
    key.data.size = 10
    
    # Fill
    bpy.ops.object.light_add(type='AREA', location=(-5, -8, 10))
    fill = bpy.context.active_object
    fill.data.energy = 800
    fill.data.size = 8

def create_ball(position, color=(1, 1, 0)):
    """Balle jaune vif, grosse et visible"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.6, location=position)
    ball = bpy.context.active_object
    ball.name = "Ball"
    
    mat = create_emissive_mat("Mat_Ball", color, 5.0)
    ball.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ball

# ============================================================
# CONCEPT A : ESCALIER DESCENDANT
# ============================================================
def concept_stairs(frame):
    """Escalier de plateformes qui descend"""
    print("CONCEPT A: Escalier descendant")
    
    # 8 marches d'escalier
    step_height = 1.5
    step_depth = 2.5
    step_width = 3.0
    
    colors = [
        (0, 1, 1),    # Cyan
        (1, 0, 1),    # Magenta
        (0, 1, 0),    # Vert
        (1, 0.5, 0),  # Orange
    ]
    
    platforms = []
    for i in range(8):
        y = i * step_depth
        z = -i * step_height
        
        bpy.ops.mesh.primitive_cube_add()
        obj = bpy.context.active_object
        obj.name = f"Step_{i}"
        obj.location = Vector((0, y, z))
        obj.scale = Vector((step_width, step_depth, 0.3))
        
        color = colors[i % len(colors)]
        mat = create_emissive_mat(f"Mat_Step_{i}", color, 2.5)
        obj.data.materials.append(mat)
        platforms.append(obj)
    
    # Balle qui descend les marches
    # Position selon frame (simulation chemin)
    t = frame / 30.0  # temps en secondes
    step_index = min(int(t * 2), 7)  # 2 marches par seconde
    
    # Position interpolée
    current_step = platforms[step_index]
    ball_y = current_step.location.y
    ball_z = current_step.location.z + 1.0  # Au-dessus de la marche
    
    ball = create_ball((0, ball_y, ball_z))
    
    # Caméra qui suit de côté
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.location = Vector((6, ball_y - 3, ball_z + 2))
    
    # Regarder la balle
    direction = Vector((0, ball_y, ball_z)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = cam
    print(f"Frame {frame}: Ball at step {step_index}, pos=(0, {ball_y:.1f}, {ball_z:.1f})")

# ============================================================
# CONCEPT B : TOBOGGAN SINUEUX
# ============================================================
def concept_slide(frame):
    """Chemin sinueux qui serpente vers le bas"""
    print("CONCEPT B: Toboggan sinueux")
    
    # Créer un chemin sinusoïdal
    num_segments = 12
    colors = [(1, 0, 1), (0, 1, 1), (1, 1, 0)]
    
    platforms = []
    for i in range(num_segments):
        t_param = i / num_segments
        
        # Position sinusoïdale
        x = math.sin(t_param * math.pi * 3) * 3  # Serpente
        y = i * 2.0
        z = -i * 1.0
        
        # Rotation pour suivre la pente
        angle_y = math.atan2(-1.0, 2.0)  # Pente descendante
        angle_z = math.cos(t_param * math.pi * 3) * 0.5  # Twist du serpent
        
        bpy.ops.mesh.primitive_cube_add()
        obj = bpy.context.active_object
        obj.name = f"Segment_{i}"
        obj.location = Vector((x, y, z))
        obj.rotation_euler = Euler((0, angle_y, angle_z), 'XYZ')
        obj.scale = Vector((1.5, 2.0, 0.2))
        
        color = colors[i % len(colors)]
        mat = create_emissive_mat(f"Mat_Seg_{i}", color, 2.5)
        obj.data.materials.append(mat)
        platforms.append((x, y, z))
    
    # Balle qui suit le chemin
    t = frame / 30.0
    seg_index = min(int(t * 3), num_segments - 1)  # 3 segments par seconde
    
    ball_x, ball_y, ball_z = platforms[seg_index]
    ball_z += 0.8
    
    ball = create_ball((ball_x, ball_y, ball_z))
    
    # Caméra latérale qui suit
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.location = Vector((ball_x + 5, ball_y - 2, ball_z + 3))
    
    direction = Vector((ball_x, ball_y, ball_z)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = cam
    print(f"Frame {frame}: Ball at segment {seg_index}, pos=({ball_x:.1f}, {ball_y:.1f}, {ball_z:.1f})")

# ============================================================
# CONCEPT C : CASCADE DE RAMPES
# ============================================================
def concept_cascade(frame):
    """Rampes alternées gauche/droite en cascade"""
    print("CONCEPT C: Cascade de rampes")
    
    # 6 rampes alternées
    num_ramps = 6
    colors = [(1, 0, 0), (0, 1, 0), (0, 0.5, 1)]
    
    ramps = []
    for i in range(num_ramps):
        # Alternance gauche/droite
        x_offset = 2.5 if i % 2 == 0 else -2.5
        y = i * 3.0
        z = -i * 2.0
        
        # Rotation pour pente descendante
        angle_y = math.radians(-25)  # Inclinaison 25°
        angle_z = math.radians(15) if i % 2 == 0 else math.radians(-15)  # Twist
        
        bpy.ops.mesh.primitive_cube_add()
        obj = bpy.context.active_object
        obj.name = f"Ramp_{i}"
        obj.location = Vector((x_offset, y, z))
        obj.rotation_euler = Euler((0, angle_y, angle_z), 'XYZ')
        obj.scale = Vector((2.0, 3.0, 0.2))
        
        color = colors[i % len(colors)]
        mat = create_emissive_mat(f"Mat_Ramp_{i}", color, 2.5)
        obj.data.materials.append(mat)
        
        # Position de la balle sur cette rampe (centre)
        ramps.append((x_offset, y, z + 1.0))
    
    # Balle qui descend en zigzag
    t = frame / 30.0
    ramp_index = min(int(t * 1.5), num_ramps - 1)  # 1.5 rampe par seconde
    
    ball_x, ball_y, ball_z = ramps[ramp_index]
    ball = create_ball((ball_x, ball_y, ball_z))
    
    # Caméra de face/côté
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    cam.location = Vector((0, ball_y - 8, ball_z + 5))
    
    direction = Vector((ball_x, ball_y, ball_z)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    
    bpy.context.scene.camera = cam
    print(f"Frame {frame}: Ball at ramp {ramp_index}, pos=({ball_x:.1f}, {ball_y:.1f}, {ball_z:.1f})")

# ============================================================
# MAIN
# ============================================================
def main():
    args = parse_args()
    concept = args.get('concept', 'A')
    frame = int(args.get('frame', 1))
    
    print(f"\n{'='*60}")
    print(f"TEST CONCEPT {concept} - Frame {frame}")
    print(f"{'='*60}\n")
    
    clear_scene()
    setup_render()
    create_lights()
    
    if concept == 'A':
        concept_stairs(frame)
    elif concept == 'B':
        concept_slide(frame)
    elif concept == 'C':
        concept_cascade(frame)
    else:
        print(f"ERROR: Concept {concept} inconnu")
        sys.exit(1)
    
    # Rendu
    scene = bpy.context.scene
    scene.frame_set(1)
    scene.render.filepath = f"/tmp/concept_{concept}_frame{frame}.png"
    bpy.ops.render.render(write_still=True)
    
    print(f"\n✓ Rendu sauvegardé: {scene.render.filepath}")
    print("SUCCESS")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

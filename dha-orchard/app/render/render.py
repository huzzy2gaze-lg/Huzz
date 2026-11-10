# Offline, photo-real renders of the website's home with Blender Cycles (path tracing).
# Input: the GLB that web/tools/export.html makes (the same home, street and neighbours as the live 3D).
# Usage: python render.py <home.glb> <out_dir> <mood: day|dusk|night> <camera: cam_hero|cam_corner|cam_close> [width] [samples]
import math
import sys

import bpy

glb, out_dir, mood, cam_name = sys.argv[1:5]
width = int(sys.argv[5]) if len(sys.argv) > 5 else 1600
samples = int(sys.argv[6]) if len(sys.argv) > 6 else 128

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
scene = bpy.context.scene


def base(name):
    return name.split(".")[0]


def principled(mat):
    if not mat or not mat.use_nodes:
        return None
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            return n
    return None


def setin(node, key, value):
    if key in node.inputs:
        node.inputs[key].default_value = value


def add_bump(mat, strength):
    """Use the colour texture as a height map, so stone, wood and plaster get relief."""
    nt = mat.node_tree
    bsdf = principled(mat)
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
    if not bsdf or not tex:
        return
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.02
    nt.links.new(tex.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


LIGHT = {"day": 2.0, "dusk": 28.0, "night": 40.0}  # strength of the warm lamps and cove lights
WARM = (1.0, 0.72, 0.42, 1.0)

for mat in bpy.data.materials:
    b = base(mat.name)
    bsdf = principled(mat)
    if not bsdf:
        continue
    mat.blend_method = "OPAQUE" if hasattr(mat, "blend_method") else None
    setin(bsdf, "Alpha", 1.0)
    if b in ("glass", "rail", "carGlass"):
        setin(bsdf, "Base Color", (0.86, 0.92, 0.93, 1) if b != "carGlass" else (0.05, 0.07, 0.08, 1))
        setin(bsdf, "Transmission Weight", 0.0 if b == "carGlass" else 1.0)
        setin(bsdf, "Roughness", 0.0)
        setin(bsdf, "IOR", 1.45)
        setin(bsdf, "Emission Strength", 0.0)
    elif b == "water":
        setin(bsdf, "Base Color", (0.25, 0.65, 0.7, 1))
        setin(bsdf, "Transmission Weight", 1.0)
        setin(bsdf, "Roughness", 0.01)
        setin(bsdf, "IOR", 1.33)
        setin(bsdf, "Emission Strength", 0.6 if mood != "day" else 0.0)
        setin(bsdf, "Emission Color", (0.2, 0.7, 0.85, 1))
    elif b in ("warm", "street_lampHead"):
        setin(bsdf, "Emission Color", WARM)
        setin(bsdf, "Emission Strength", LIGHT[mood] if b == "warm" else (0.0 if mood == "day" else 30.0))
    elif b == "curtain":
        setin(bsdf, "Base Color", (0.95, 0.93, 0.88, 1))
        setin(bsdf, "Transmission Weight", 0.35)
        setin(bsdf, "Roughness", 0.9)
    elif b == "car":
        setin(bsdf, "Metallic", 0.55)
        setin(bsdf, "Roughness", 0.18)
        setin(bsdf, "Coat Weight", 1.0)
        setin(bsdf, "Coat Roughness", 0.03)
    elif b in ("mullion", "band"):
        setin(bsdf, "Metallic", 0.7)
        setin(bsdf, "Roughness", 0.3)
    elif b.startswith("leaf") or b in ("hedge", "grassA", "grassB"):
        setin(bsdf, "Roughness", 0.75)
        setin(bsdf, "Subsurface Weight", 0.15)
    elif b in ("stone",):
        add_bump(mat, 0.35)
    elif b in ("wood", "deck", "floor"):
        add_bump(mat, 0.12)
        setin(bsdf, "Roughness", 0.45)
    elif b in ("frame", "lower"):
        add_bump(mat, 0.05)
    elif b == "poolTile":
        setin(bsdf, "Roughness", 0.25)

# soft warm light inside the rooms (they glow through the glass at dusk and at night)
for o in list(bpy.data.objects):
    if o.name.startswith("roomlight"):
        ld = bpy.data.lights.new(o.name + "_L", "AREA")
        ld.shape = "DISK"
        ld.size = 2.5
        ld.color = WARM[:3]
        ld.energy = {"day": 60, "dusk": 700, "night": 900}[mood]
        lo = bpy.data.objects.new(o.name + "_L", ld)
        lo.location = o.matrix_world.translation
        lo.rotation_euler = (0, 0, 0)  # facing down
        lo.visible_camera = False  # its light shows, the panel itself does not
        lo.visible_glossy = False
        lo.visible_transmission = False
        scene.collection.objects.link(lo)

# the sky and the sun
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wn = world.node_tree
bg = wn.nodes["Background"]
SUN = {"day": (38, 135, 3.2, (1.0, 0.96, 0.9)), "dusk": (1.0, 120, 0.7, (1.0, 0.55, 0.3)), "night": (25, 200, 0.06, (0.6, 0.7, 1.0))}
elev, azi, sun_strength, sun_color = SUN[mood]
if mood == "night":
    grad = wn.nodes.new("ShaderNodeTexGradient")
    ramp = wn.nodes.new("ShaderNodeValToRGB")
    coords = wn.nodes.new("ShaderNodeTexCoord")
    mapping = wn.nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
    wn.links.new(coords.outputs["Generated"], mapping.inputs["Vector"])
    wn.links.new(mapping.outputs["Vector"], grad.inputs["Vector"])
    wn.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].color = (0.035, 0.05, 0.09, 1)
    ramp.color_ramp.elements[1].color = (0.002, 0.004, 0.012, 1)
    wn.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
else:
    sky = wn.nodes.new("ShaderNodeTexSky")
    for t in ("MULTIPLE_SCATTERING", "NISHITA", "SINGLE_SCATTERING"):
        try:
            sky.sky_type = t
            break
        except TypeError:
            continue
    if hasattr(sky, "sun_disc"):
        sky.sun_disc = False
    if hasattr(sky, "sun_elevation"):
        sky.sun_elevation = math.radians(elev)
        sky.sun_rotation = math.radians(azi)
    if hasattr(sky, "air_density"):
        sky.air_density = 1.0
    for attr in ("aerosol_density", "dust_density"):
        if hasattr(sky, attr):
            setattr(sky, attr, 1.5 if mood == "day" else 3.0)
    wn.links.new(sky.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.35 if mood == "day" else 0.09

sun_data = bpy.data.lights.new("Sun", "SUN")
sun_data.energy = sun_strength
sun_data.color = sun_color
sun_data.angle = math.radians(0.6)
sun = bpy.data.objects.new("Sun", sun_data)
# glTF is y-up and Blender is z-up: the importer turns the scene, so place the sun in Blender's frame
sun.rotation_euler = (math.radians(90 - elev), 0, math.radians(azi + 180))
scene.collection.objects.link(sun)

# smoother leaves and shrubs (the live 3D keeps them light for phones)
for o in bpy.data.objects:
    if o.type == "MESH" and o.active_material and base(o.active_material.name) in ("leafA", "leafB", "leafC", "hedge"):
        m = o.modifiers.new("smooth", "SUBSURF")
        m.levels = 1
        m.render_levels = 3
        tex = bpy.data.textures.get("leafnoise") or bpy.data.textures.new("leafnoise", "VORONOI")
        tex.noise_scale = 0.18
        d = o.modifiers.new("leafy", "DISPLACE")
        d.texture = tex
        d.strength = 0.22
        d.mid_level = 0.6
        d.texture_coords = "GLOBAL"
        for poly in o.data.polygons:
            poly.use_smooth = True

# camera and render settings
cam = bpy.data.objects.get(cam_name) or next(o for o in bpy.data.objects if o.type == "CAMERA")
scene.camera = cam
# a street light right in front of the camera would block the view: leave it out of this picture
cp = cam.matrix_world.translation
for o in bpy.data.objects:
    if o.type == "MESH" and o.active_material and base(o.active_material.name) in ("street_pole", "street_lampHead"):
        p = o.matrix_world.translation
        if ((p.x - cp.x) ** 2 + (p.y - cp.y) ** 2) ** 0.5 < 14:
            o.hide_render = True
if cam_name == "cam_hero":
    cam.location.z += 1.0  # a little above the front wall, so the garden shows
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.render.resolution_x = width
scene.render.resolution_y = int(width * 9 / 16)
scene.render.film_transparent = False
vs = scene.view_settings
for vt in ("AgX", "Filmic"):
    try:
        vs.view_transform = vt
        break
    except TypeError:
        continue
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        vs.look = look
        break
    except TypeError:
        continue
vs.exposure = {"day": 0.0, "dusk": 0.9, "night": 1.0}[mood]
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = f"{out_dir}/{mood}-{cam_name}.png"
bpy.ops.render.render(write_still=True)
print("written", scene.render.filepath)

# Margalla Orchards main gate, finished, at dusk: a 3D scene whose camera matches the real photo
# (ads/wh-teal/set5/plates/gate_real_1080x1920.jpg), so the real frame can turn into the 3D one.
# Runs headless:  python3 gate_scene.py <out.png> [width height samples] [stage 0..1]
# or inside Blender (Scripting tab → Run) on the laptop for GPU renders. Units are metres.
# stage: 0 = bare concrete (as today), 1 = finished (cladding, lights, landscaping). In between, the cladding rises
# up the pillar and the lights switch on, for the build-up animation.
import sys, math, bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
OUT = argv[0] if argv else "/tmp/gate.png"
W, H = (int(argv[1]), int(argv[2])) if len(argv) > 2 else (540, 960)
SAMPLES = int(argv[3]) if len(argv) > 3 else 32
STAGE = float(argv[4]) if len(argv) > 4 else 1.0
clamp = lambda x: max(0.0, min(1.0, x))
sub = lambda a, b: clamp((STAGE - a) / (b - a))      # progress of one part of the build

# ---------- camera, matched to the photo (iPhone 26 mm-equivalent, 9:16 crop of a 4:3 frame) ----------
D = 80.0                    # distance to the gate (m)
TILT = 7.8                  # the photo is tilted up a little (the horizon sits 13% below the centre)
HFOV = 32.4                 # horizontal field of view of the 9:16 crop
CAM_H = 1.5
PIL_X, PIL_W, PIL_D = -1.6, 7.6, 6.0     # central pillar centre, width, depth
BEAM_Z0, BEAM_T, BEAM_DEPTH = 16.3, 3.8, 10.0
BEAM_X0, BEAM_X1 = -60.0, 40.0
LET_H, LET_CX = 2.7, 0.2

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX" if "OPTIX" in [d[0] for d in prefs.get_device_types(bpy.context)] else "CUDA"
    prefs.get_devices(); [setattr(d, "use", True) for d in prefs.devices]; sc.cycles.device = "GPU"
except Exception:
    sc.cycles.device = "CPU"

cam_data = bpy.data.cameras.new("cam"); cam_data.sensor_fit = "HORIZONTAL"; cam_data.sensor_width = 36
cam_data.lens = 18 / math.tan(math.radians(HFOV / 2)); cam_data.clip_end = 3000
cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, 0, CAM_H); cam.rotation_euler = (math.radians(90 + TILT), 0, 0)

def mat(name, color, rough=0.6, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m

def stone(name, base, joint, scale_x, scale_y):
    """Stone panels: a brick pattern for the joints plus noise for the stone grain."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.55
    tc = N.new("ShaderNodeTexCoord"); br = N.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 1.0; br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Brick Width"].default_value = scale_x; br.inputs["Row Height"].default_value = scale_y
    br.offset = 0.5
    br.inputs["Color1"].default_value = (*base, 1); br.inputs["Color2"].default_value = tuple(c * 0.93 for c in base) + (1,)
    br.inputs["Mortar"].default_value = (*joint, 1)
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 0.18
    L.new(tc.outputs["Object"], br.inputs["Vector"]); L.new(tc.outputs["Object"], nz.inputs["Vector"])
    L.new(br.outputs["Color"], mix.inputs[6]); L.new(nz.outputs["Color"], mix.inputs[7])
    L.new(mix.outputs[2], bsdf.inputs["Base Color"])
    return m

def box(name, x0, x1, y0, y1, z0, z1, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.name = name; o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m); return o

concrete = mat("concrete", (0.50, 0.49, 0.47), 0.85)
beige = stone("beige", (0.62, 0.50, 0.36), (0.18, 0.15, 0.12), 1.2, 0.6)
grey = stone("grey", (0.55, 0.55, 0.53), (0.3, 0.3, 0.3), 2.4, 0.95)
granite = mat("granite", (0.05, 0.05, 0.055), 0.25)
asphalt = mat("asphalt", (0.035, 0.035, 0.04), 0.75)
paint = mat("paint", (0.85, 0.85, 0.82), 0.5)
kerb = mat("kerb", (0.45, 0.44, 0.42), 0.8)
grass = mat("grass", (0.05, 0.12, 0.03), 0.9)
shrub = mat("shrub", (0.03, 0.09, 0.025), 0.85)
trunk = mat("trunk", (0.12, 0.09, 0.06), 0.9)
letters = mat("letters", (0.95, 0.95, 0.93), 0.4, (1.0, 0.97, 0.9), 2.5 * sub(0.7, 1.0) + 0.2)
lamp = mat("lamp", (1, 1, 1), 0.3, (1.0, 0.85, 0.6), 60.0 * sub(0.75, 0.95))

# ground: asphalt road with lane markings
box("road", -300, 300, -20, 800, -0.2, 0.0, asphalt)
for x in (-11.0, -3.5, 4.0, 11.5):
    for y in range(6, 140, 12):
        box(f"mark{x}{y}", x - 0.08, x + 0.08, y, y + 5, 0.0, 0.01, paint)

# central pillar: bare concrete core, with stone cladding that rises up it (stage 0.2 → 0.65)
py0, py1 = D, D + PIL_D
box("pillar_core", PIL_X - PIL_W / 2 + 0.05, PIL_X + PIL_W / 2 - 0.05, py0 + 0.05, py1, 0, BEAM_Z0, concrete)
clad_top = BEAM_Z0 * sub(0.2, 0.65)
if clad_top > 0.05:
    box("pillar_clad", PIL_X - PIL_W / 2, PIL_X + PIL_W / 2, py0, py1, 0, clad_top, beige)
    box("pillar_base", PIL_X - PIL_W / 2 - 0.15, PIL_X + PIL_W / 2 + 0.15, py0 - 0.15, py1 + 0.15, 0, min(1.2, clad_top), granite)

# beam, then the stone finish under it
beam_m = grey if STAGE >= 0.6 else concrete
box("beam", BEAM_X0, BEAM_X1, py0 - 2, py0 - 2 + BEAM_DEPTH, BEAM_Z0, BEAM_Z0 + BEAM_T, beam_m)

# letters on top of the beam
bpy.ops.object.text_add(location=(LET_CX, py0 - 1.6, BEAM_Z0 + BEAM_T + 0.05))
t = bpy.context.object; t.data.body = "MARGALLA ORCHARDS"; t.data.align_x = "CENTER"
try: t.data.font = bpy.data.fonts.load("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
except Exception: pass
t.data.size = LET_H * 1.32; t.data.extrude = 0.25; t.rotation_euler = (math.radians(90), 0, 0)
t.data.materials.append(letters)
bpy.context.view_layer.update()
sx = 37.8 / max(t.dimensions.x, 0.01); t.scale = (sx, 1, 1)   # letters span 37.8 m, as in the photo

# downlights under the beam and warm uplights at the pillar (switch on at stage 0.75 → 0.95)
on = sub(0.75, 0.95)
if on > 0:
    for x in range(int(BEAM_X0) + 3, int(BEAM_X1), 5):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.05, location=(x, py0 + 1.5, BEAM_Z0 - 0.02))
        bpy.context.object.data.materials.append(lamp)
        ld = bpy.data.lights.new(f"dl{x}", "SPOT"); ld.energy = 900 * on; ld.color = (1.0, 0.82, 0.58); ld.spot_size = math.radians(70)
        lo = bpy.data.objects.new(f"dl{x}", ld); lo.location = (x, py0 + 1.5, BEAM_Z0 - 0.1); sc.collection.objects.link(lo)
    for dx in (-2.6, 0, 2.6):
        ld = bpy.data.lights.new(f"up{dx}", "SPOT"); ld.energy = 6000 * on; ld.color = (1.0, 0.78, 0.5); ld.spot_size = math.radians(35)
        lo = bpy.data.objects.new(f"up{dx}", ld); lo.location = (PIL_X + dx, py0 - 1.2, 0.3); lo.rotation_euler = (math.radians(-8), 0, 0)
        sc.collection.objects.link(lo)

# landscaping: kerb, grass and shrubs around the pillar, young palms (stage 0.5 → 0.85)
g = sub(0.5, 0.85)
if g > 0:
    box("kerb", PIL_X - 14, PIL_X + 14, py0 - 3.2, py1 + 3.2, 0, 0.25, kerb)
    box("lawn", PIL_X - 13.7, PIL_X + 13.7, py0 - 2.9, py1 + 2.9, 0, 0.28, grass)
    import random; random.seed(4)
    for i in range(36):
        x = PIL_X + random.uniform(-13, 13); y = py0 + random.uniform(-2.6, -0.8)
        if abs(x - PIL_X) < PIL_W / 2 + 0.4: continue
        bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(0.35, 0.6) * g, location=(x, y, 0.45))
        bpy.context.object.data.materials.append(shrub)
    for x in (PIL_X - 11, PIL_X - 7.5, PIL_X + 7.5, PIL_X + 11):
        h = 4.5 * g
        bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=h, location=(x, py0 - 1.6, h / 2))
        bpy.context.object.data.materials.append(trunk)
        for k in range(7):
            a = k / 7 * 2 * math.pi
            bpy.ops.mesh.primitive_plane_add(size=1, location=(x + 1.1 * math.cos(a) * g, py0 - 1.6 + 1.1 * math.sin(a) * g, h + 0.1))
            leaf = bpy.context.object; leaf.scale = (2.4 * g, 0.45 * g, 1); leaf.rotation_euler = (0, math.radians(-25), a)
            leaf.data.materials.append(shrub)

# far hills: a long low dark-green ridge in the haze, behind the gate (stage 0.6 → 1)
if STAGE > 0.55:
    hills = mat("hills", (0.10, 0.13, 0.14), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 900, 0))
    hp = bpy.context.object; hp.scale = (4000, 1, 1); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.subdivide(number_cuts=80); bpy.ops.object.mode_set(mode="OBJECT")
    for v in hp.data.vertices:
        x = v.co.x
        v.co.z = 0 if v.co.y < 0 else 45 + 30 * math.sin(x / 260) + 18 * math.sin(x / 90 + 1) + 8 * math.sin(x / 37)
        v.co.y = 0
    hp.rotation_euler = (math.radians(90), 0, 0); hp.data.materials.append(hills)

# sky: day (stage 0) → dusk (stage 1), with the sun low behind the camera's left
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; N = w.node_tree.nodes; Lk = w.node_tree.links
sky = N.new("ShaderNodeTexSky")
try: sky.sky_type = "NISHITA"
except Exception: pass
dusk = sub(0.55, 1.0)
sky.sun_elevation = math.radians(35 - 33 * dusk); sky.sun_rotation = math.radians(200 - 110 * dusk)
try: sky.air_density = 1.0 + 1.5 * dusk; sky.dust_density = 1.0 + 3 * dusk
except Exception: pass
bg = N["Background"]; bg.inputs["Strength"].default_value = 0.35 + 0.65 * (1 - dusk)
Lk.new(sky.outputs["Color"], bg.inputs["Color"])
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0 * (1 - dusk) + 0.05; sun.color = (1.0, 0.85 - 0.25 * dusk, 0.7 - 0.35 * dusk)
so = bpy.data.objects.new("sun", sun); so.rotation_euler = (math.radians(90 - (35 - 37 * dusk)), 0, math.radians(200)); sc.collection.objects.link(so)
sc.view_settings.exposure = 0.0 + 0.7 * dusk

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("wrote", OUT)

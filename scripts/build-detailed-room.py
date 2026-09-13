"""Create a beveled room with one non-destructive, UV1 ambient-occlusion atlas.

Run with Blender 5:
  Blender --background --factory-startup --python-exit-code 1 --python scripts/build-detailed-room.py
  Blender --background --factory-startup --python-exit-code 1 --python scripts/build-detailed-room.py -- --skip-ao

The source GLB, material names, base colors, UI textures and UV0 are preserved.
Generated geometry, UV1 and the AO atlas are stored only in the new output GLB.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import tempfile
import time

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
BEVELED_MATERIALS = {"wall", "wall_lower", "floor", "plinth", "edge", "white", "steel", "bin", "pad", "pack"}
UI_MATERIALS = {"ui_tablet", "ui_monitor", "ui_routing"}
AO_UV = "AOAtlas"


def log(label, value):
    print(f"ROOM_BUILD {label}: {json.dumps(value, ensure_ascii=False)}", flush=True)


def glb_document(path):
    data = path.read_bytes()
    json_length = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20 + json_length])


def glb_triangles(document):
    return sum(document["accessors"][primitive["indices"]]["count"] // 3
               for mesh in document["meshes"] for primitive in mesh["primitives"])


def deduplicate_textures(path):
    # Blender 5 emits one identical texture descriptor per material even when
    # all descriptors reference the same image and sampler. Canonicalize them
    # so GLTFLoader also shares the GPU texture, not only its decoded image.
    raw = path.read_bytes()
    length = struct.unpack_from("<I", raw, 12)[0]
    document = json.loads(raw[20:20 + length])
    unique = []
    by_value = {}
    remap = {}
    for index, texture in enumerate(document.get("textures", [])):
        key = json.dumps(texture, sort_keys=True)
        if key not in by_value:
            by_value[key] = len(unique)
            unique.append(texture)
        remap[index] = by_value[key]

    def visit(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key.endswith("Texture") and isinstance(child, dict) and "index" in child:
                    child["index"] = remap[child["index"]]
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(document.get("materials", []))
    document["textures"] = unique
    encoded = json.dumps(document, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((-len(encoded)) % 4)
    binary_chunks = raw[20 + length:]
    header = struct.pack("<III", 0x46546C67, 2, 20 + len(encoded) + len(binary_chunks))
    path.write_bytes(header + struct.pack("<II", len(encoded), 0x4E4F534A) + encoded + binary_chunks)


def verify_materials(source, result):
    original_materials = {material["name"]: material for material in source["materials"]}
    original_used_names = {source["materials"][primitive["material"]]["name"]
                           for mesh in source["meshes"] for primitive in mesh["primitives"]}
    if original_used_names != {material["name"] for material in result["materials"]}:
        raise RuntimeError("Used material names changed")
    for material in result["materials"]:
        original = original_materials[material["name"]]
        before = original.get("pbrMetallicRoughness", {})
        after = material.get("pbrMetallicRoughness", {})
        for property_name, default in [("baseColorFactor", [1, 1, 1, 1]), ("metallicFactor", 1), ("roughnessFactor", 1)]:
            a, b = before.get(property_name, default), after.get(property_name, default)
            difference = max(abs(x - y) for x, y in zip(a, b)) if isinstance(a, list) else abs(a - b)
            if difference > 0.000001:
                raise RuntimeError(f"Material factor changed: {material['name']} {property_name}")
        if material.get("doubleSided", False) != original.get("doubleSided", False):
            raise RuntimeError(f"Material sidedness changed: {material['name']}")


def glb_bounds(document):
    minimum = Vector((math.inf,) * 3)
    maximum = Vector((-math.inf,) * 3)

    def visit(index, parent):
        nonlocal minimum, maximum
        node = document["nodes"][index]
        if "matrix" in node:
            values = node["matrix"]
            local = Matrix(tuple(tuple(values[column * 4 + row] for column in range(4)) for row in range(4)))
        else:
            x, y, z, w = node.get("rotation", [0, 0, 0, 1])
            local = Matrix.LocRotScale(Vector(node.get("translation", [0, 0, 0])), Quaternion((w, x, y, z)), Vector(node.get("scale", [1, 1, 1])))
        world = parent @ local
        if "mesh" in node:
            for primitive in document["meshes"][node["mesh"]]["primitives"]:
                accessor = document["accessors"][primitive["attributes"]["POSITION"]]
                for x in [accessor["min"][0], accessor["max"][0]]:
                    for y in [accessor["min"][1], accessor["max"][1]]:
                        for z in [accessor["min"][2], accessor["max"][2]]:
                            point = world @ Vector((x, y, z))
                            minimum = Vector(tuple(min(a, b) for a, b in zip(minimum, point)))
                            maximum = Vector(tuple(max(a, b) for a, b in zip(maximum, point)))
        for child in node.get("children", []):
            visit(child, world)

    for index in document["scenes"][document.get("scene", 0)]["nodes"]:
        visit(index, Matrix.Identity(4))
    return list(minimum), list(maximum), list(maximum - minimum)


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def add_bevel(obj, remaining_triangles):
    material_names = {material.name for material in obj.data.materials if material}
    if not material_names or not material_names.issubset(BEVELED_MATERIALS):
        return 0, 0

    # glTF duplicates vertices at split normals. Weld positions before detecting
    # true dihedral edges, otherwise the modifier sees disconnected triangles.
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    weights = bm.edges.layers.float.get("bevel_weight_edge") or bm.edges.layers.float.new("bevel_weight_edge")

    # Keep cables, narrow rails and tiny fittings intact even when merged into
    # the same material mesh as large furniture. Test connected pieces locally.
    eligible_vertices = set()
    unvisited = set(bm.verts)
    while unvisited:
        first = unvisited.pop()
        component = [first]
        pending = [first]
        while pending:
            vertex = pending.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in unvisited:
                    unvisited.remove(other)
                    component.append(other)
                    pending.append(other)
        extents = [max(vertex.co[axis] for vertex in component) - min(vertex.co[axis] for vertex in component) for axis in range(3)]
        if min(extents) >= 0.04 and max(extents) >= 0.075:
            eligible_vertices.update(component)

    edge_count = 0
    for edge in bm.edges:
        eligible = (len(edge.link_faces) == 2 and edge.verts[0] in eligible_vertices
                    and edge.calc_length() >= 0.018 and edge.calc_face_angle(0) >= math.radians(32))
        edge[weights] = 1.0 if eligible else 0.0
        edge_count += int(eligible)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if not edge_count:
        return 0, 0

    select_only([obj])
    before = triangle_count(mesh)
    modifier = obj.modifiers.new("Physical edge bevel · 2 segments", "BEVEL")
    modifier.limit_method = "WEIGHT"
    modifier.edge_weight = "bevel_weight_edge"
    modifier.width = 0.012 if material_names & {"wall", "wall_lower", "floor", "plinth"} else 0.009
    modifier.segments = 2
    modifier.profile = 0.5
    modifier.use_clamp_overlap = True
    modifier.harden_normals = True
    modifier.loop_slide = True
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    after = triangle_count(evaluated.data)
    if after - before > remaining_triangles:
        obj.modifiers.remove(modifier)
        log("bevel-budget-skip", {"object": obj.name, "proposedAddedTriangles": after - before})
        return 0, 0
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    normal = obj.modifiers.new("Area weighted surface normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    normal.weight = 50
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return after - before, edge_count


def unwrap_atlas(objects, atlas_size):
    for obj in objects:
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
        if AO_UV in obj.data.uv_layers:
            raise RuntimeError("Source already contains AOAtlas; use the original source GLB")
        obj.data.uv_layers.new(name=AO_UV)
        obj.data.uv_layers.active_index = 1
        obj.data.uv_layers[0].active_render = True
    select_only(objects)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=6 / atlas_size,
                             margin_method="FRACTION", area_weight=0.5, correct_aspect=True, scale_to_bounds=True)
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method="FRACTION", margin=6 / atlas_size, shape_method="CONVEX")
    bpy.ops.object.mode_set(mode="OBJECT")


def bake_ao(objects, size, samples, threads, distance, temp_dir):
    image = bpy.data.images.new("PCHO room contact AO", width=size, height=size, alpha=False, float_buffer=False)
    image.colorspace_settings.name = "Non-Color"
    image.generated_color = (1, 1, 1, 1)
    material = bpy.data.materials.new("Temporary AO bake")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    ambient = nodes.new("ShaderNodeAmbientOcclusion")
    ambient.inputs["Distance"].default_value = distance
    ambient.only_local = False
    soften = nodes.new("ShaderNodeMapRange")
    soften.inputs["From Min"].default_value = 0
    soften.inputs["From Max"].default_value = 1
    soften.inputs["To Min"].default_value = 0.35
    soften.inputs["To Max"].default_value = 1
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    nodes.active = texture
    links = material.node_tree.links
    links.new(ambient.outputs["AO"], soften.inputs["Value"])
    links.new(soften.outputs["Result"], emission.inputs["Color"])
    links.new(emission.outputs["Emission"], output.inputs["Surface"])

    # Bake one temporary joined receiver. Original objects and their materials
    # remain intact, and there is no per-object clearing of the shared image.
    copies = []
    for obj in objects:
        duplicate = obj.copy()
        duplicate.data = obj.data.copy()
        duplicate.parent = None
        duplicate.matrix_world = obj.matrix_world.copy()
        bpy.context.collection.objects.link(duplicate)
        duplicate.data.materials.clear()
        duplicate.data.materials.append(material)
        for polygon in duplicate.data.polygons:
            polygon.material_index = 0
        duplicate.data.uv_layers.active_index = 1
        duplicate.data.uv_layers[1].active_render = True
        copies.append(duplicate)
        obj.hide_render = True
    select_only(copies)
    bpy.ops.object.join()
    receiver = bpy.context.active_object
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = threads
    scene.render.bake.use_selected_to_active = False
    log("bake-start", {"atlas": size, "samples": samples, "threads": threads, "distanceMetres": distance})
    bpy.ops.object.bake(type="EMIT", target="IMAGE_TEXTURES", use_clear=True,
                        margin=4, margin_type="EXTEND", uv_layer=AO_UV)
    image.filepath_raw = str(temp_dir / "pcho-room-ao.png")
    image.file_format = "PNG"
    image.save()
    image.pack()
    bpy.data.objects.remove(receiver, do_unlink=True)
    for obj in objects:
        obj.hide_render = False
    log("bake-finished", {"preview": image.filepath_raw})
    return image


def attach_ao(objects, image):
    from io_scene_gltf2.blender.com.material_helpers import create_settings_group
    group = create_settings_group("glTF Material Output")
    materials = {material for obj in objects for material in obj.data.materials if material}
    for material in materials:
        if material.name in UI_MATERIALS:
            continue
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        settings = nodes.new("ShaderNodeGroup")
        settings.node_tree = group
        uv = nodes.new("ShaderNodeUVMap")
        uv.uv_map = AO_UV
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        texture.label = "Baked contact occlusion · UV1"
        links.new(uv.outputs["UV"], texture.inputs["Vector"])
        links.new(texture.outputs["Color"], settings.inputs["Occlusion"])
    for obj in objects:
        obj.data.uv_layers.active_index = 0
        obj.data.uv_layers[0].active_render = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "public/spatial/models/pcho-3.glb")
    parser.add_argument("--output", type=Path, default=ROOT / "public/spatial/models/pcho-3-detailed.glb")
    parser.add_argument("--atlas", type=int, choices=[1024, 2048], default=2048)
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--max-triangles", type=int, default=150000)
    parser.add_argument("--ao-distance", type=float, default=0.75)
    parser.add_argument("--skip-ao", action="store_true")
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(arguments)
    if args.input.resolve() == args.output.resolve():
        raise RuntimeError("Refusing to overwrite the source model")
    source_hash = hashlib.sha256(args.input.read_bytes()).hexdigest()
    source = glb_document(args.input)
    original_bounds = glb_bounds(source)
    temp_dir = Path(tempfile.mkdtemp(prefix="orm-room-detail-"))
    started = time.monotonic()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.input))
    objects = sorted((obj for obj in bpy.context.scene.objects if obj.type == "MESH"), key=lambda obj: obj.name)
    source_ui_uv = {obj.name: [tuple(loop.uv) for loop in obj.data.uv_layers[0].data]
                    for obj in objects if obj.data.uv_layers}
    total = sum(triangle_count(obj.data) for obj in objects)
    edges = 0
    for obj in objects:
        added, beveled = add_bevel(obj, args.max_triangles - total)
        total += added
        edges += beveled
    log("bevel-finished", {"triangles": total, "beveledEdges": edges})
    if not args.skip_ao:
        unwrap_atlas(objects, args.atlas)
        log("atlas-unwrapped", {"objects": len(objects), "uvLayer": AO_UV})
        image = bake_ao(objects, args.atlas, args.samples, args.threads, args.ao_distance, temp_dir)
        attach_ao(objects, image)
    for obj in objects:
        if obj.name in source_ui_uv:
            current_uv = [tuple(loop.uv) for loop in obj.data.uv_layers[0].data]
            if current_uv != source_ui_uv[obj.name]:
                raise RuntimeError(f"Original UI UV0 changed: {obj.name}")
    select_only(objects)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(args.output), export_format="GLB", use_selection=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_animations=False, export_cameras=False, export_lights=False,
                              export_yup=True, export_image_format="AUTO", export_extras=False,
                              export_vertex_color="NONE", export_apply=False)
    deduplicate_textures(args.output)
    result = glb_document(args.output)
    verify_materials(source, result)
    final_bounds = glb_bounds(result)
    final_triangles = glb_triangles(result)
    if final_triangles > args.max_triangles:
        raise RuntimeError(f"Triangle budget exceeded: {final_triangles}")
    if max(abs(a - b) for before, after in zip(original_bounds[:2], final_bounds[:2]) for a, b in zip(before, after)) > 0.0001:
        raise RuntimeError(f"Room bounds changed: {original_bounds} -> {final_bounds}")
    ao_materials = [material for material in result["materials"] if "occlusionTexture" in material]
    if not args.skip_ao:
        if not ao_materials or any(material["occlusionTexture"].get("texCoord", 0) != 1 for material in ao_materials):
            raise RuntimeError("AO export must reference texCoord 1")
        if len({material["occlusionTexture"]["index"] for material in ao_materials}) != 1:
            raise RuntimeError("AO must use one shared texture")
    if hashlib.sha256(args.input.read_bytes()).hexdigest() != source_hash:
        raise RuntimeError("Source file was modified")
    report = {"input": str(args.input), "output": str(args.output), "beforeBytes": args.input.stat().st_size,
              "afterBytes": args.output.stat().st_size, "beforeTriangles": glb_triangles(source),
              "afterTriangles": final_triangles, "beforeDimensions": original_bounds[2],
              "afterDimensions": final_bounds[2], "aoMaterialCount": len(ao_materials),
              "materialNames": [material["name"] for material in result["materials"]],
              "sourceSha256": source_hash, "seconds": round(time.monotonic() - started, 2), "tempDirectory": str(temp_dir)}
    log("complete", report)


if __name__ == "__main__":
    main()

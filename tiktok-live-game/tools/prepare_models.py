#!/usr/bin/env python3
"""Quaternius (CC0) kaynak paketlerinden oyunun kullandığı küçültülmüş model dosyalarını üretir.
Kullanım: python3 tools/prepare_models.py <kaynak_klasör> public/models
Kaynak: "Universal Base Characters[Standard]" ve "Universal Animation Library[Standard]" paketleri."""
import json, os, shutil, struct, sys

src, out = sys.argv[1], sys.argv[2]
BASE = os.path.join(src, "Universal Base Characters[Standard]", "Universal Base Characters[Standard]")
BODY = os.path.join(BASE, "Base Characters", "Godot - UE")
TEX = os.path.join(BASE, "Base Characters", "Textures")
HAIR = os.path.join(BASE, "Hairstyles", "Rigged to Head Bone", "glTF (Godot -Unreal)")
UAL = os.path.join(src, "Universal Animation Library[Standard]", "Universal Animation Library[Standard]", "Unreal-Godot", "UAL1_Standard.glb")
os.makedirs(out, exist_ok=True)

def slim_gltf(path, dst, skin_tex=None):
    """Yalnızca ten ve göz dokusunu bırak; normal/roughness/saç dokularını çıkar (≈25 MB tasarruf)."""
    d = json.load(open(path))
    for m in d["materials"]:
        for k in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            m.pop(k, None)
        pbr = m.setdefault("pbrMetallicRoughness", {})
        pbr.pop("metallicRoughnessTexture", None)
        if "Hair" in m["name"]:
            pbr.pop("baseColorTexture", None)
        pbr["metallicFactor"] = 0
    for im in d.get("images", []):
        uri = im.get("uri", "")
        if "Superhero" in uri and "Normal" not in uri and "Roughness" not in uri and skin_tex:
            im["uri"] = skin_tex
    json.dump(d, open(dst, "w"), separators=(",", ":"))

for sex, tex in (("Male", "T_Superhero_Male_Ligh.png"), ("Female", "T_Superhero_Female_Light_BaseColor.png")):
    name = f"Superhero_{sex}_FullBody"
    slim_gltf(os.path.join(BODY, name + ".gltf"), os.path.join(out, sex.lower() + ".gltf"), "skin_" + sex.lower() + ".png")
    shutil.copy(os.path.join(BODY, name + ".bin"), os.path.join(out, name + ".bin"))
    shutil.copy(os.path.join(TEX, tex), os.path.join(out, "skin_" + sex.lower() + ".png"))
shutil.copy(os.path.join(BODY, "T_Eye_Brown.png"), os.path.join(out, "T_Eye_Brown.png"))
for h in ("Hair_Buzzed", "Hair_SimpleParted", "Hair_Beard"):
    slim_gltf(os.path.join(HAIR, h + ".gltf"), os.path.join(out, h + ".gltf"))
    shutil.copy(os.path.join(HAIR, h + ".bin"), os.path.join(out, h + ".bin"))

# --- yürüme animasyonunu GLB'den JSON'a çıkar (7.6 MB -> ~100 KB) ---
f = open(UAL, "rb"); f.read(12)
jl, _ = struct.unpack("<II", f.read(8)); g = json.loads(f.read(jl))
bl, _ = struct.unpack("<II", f.read(8)); blob = f.read(bl)
NCOMP = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}
def acc(i):
    a = g["accessors"][i]; bv = g["bufferViews"][a["bufferView"]]
    n = NCOMP[a["type"]] * a["count"]; off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    assert a["componentType"] == 5126 and "byteStride" not in bv
    return [round(v, 5) for v in struct.unpack_from("<%df" % n, blob, off)]
clips = {}
for want in ("Walk_Loop",):
    an = next(a for a in g["animations"] if a["name"] == want)
    tracks = []
    for ch in an["channels"]:
        bone, path = g["nodes"][ch["target"]["node"]]["name"], ch["target"]["path"]
        if path == "scale" or (path == "translation" and bone != "pelvis") or "_0" in bone and bone[:5] in ("index", "middl", "pinky", "ring_", "thumb"):
            continue
        s = an["samplers"][ch["sampler"]]
        tracks.append({"bone": bone, "path": path, "times": acc(s["input"]), "values": acc(s["output"])})
    clips[want] = tracks
json.dump(clips, open(os.path.join(out, "walk.json"), "w"), separators=(",", ":"))
open(os.path.join(out, "LICENSE.txt"), "w").write(
    "3D character models and walk animation by Quaternius (https://quaternius.com)\n"
    "Packs: Universal Base Characters [Standard], Universal Animation Library [Standard]\n"
    "License: CC0 1.0 Universal (Public Domain Dedication) - https://creativecommons.org/publicdomain/zero/1.0/\n")
print("ok")

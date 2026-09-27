import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildMap } from "./map";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("PoE1 skill variants map to their shared base gem art", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-art-map-"));
  temporary.push(dir);
  const bases = {
    "Metadata/Items/Gems/SkillGemSummonRockGolem": {
      name: "Summon Stone Golem",
      release_state: "released",
      visual_identity: { dds_file: "Art/2DItems/Gems/RockGolem.dds" },
    },
    "Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/StormBladeOneHand": {
      name: "Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeOneHand.dds" },
    },
    "Metadata/Items/Weapons/TwoHandWeapons/TwoHandSwords/StormBladeTwoHand": {
      name: "Two Handed Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeTwoHand.dds" },
    },
  };
  const gems = {
    SummonStoneGolemAltY: {
      skill_name: "Summon Stone Golem of Safeguarding",
      base_item: { id: "Metadata/Items/Gems/SkillGemSummonRockGolem" },
    },
  };
  await Bun.write(path.join(dir, "base_items.min.json"), JSON.stringify(bases));
  await Bun.write(path.join(dir, "uniques.min.json"), "[]");
  await Bun.write(path.join(dir, "skill_gems.min.json"), JSON.stringify(gems));
  await Bun.write(path.join(dir, "buff_visuals.min.json"), "{}");
  await Bun.write(path.join(dir, "Art/2DItems/Gems/RockGolem.webp"), "stone golem art");
  await Bun.write(path.join(dir, "Art/StormBladeOneHand.webp"), "one handed energy blade art");
  await Bun.write(path.join(dir, "Art/StormBladeTwoHand.webp"), "two handed energy blade art");

  const { map } = await buildMap("poe1", "test", dir, {});

  expect(map.bases["Summon Stone Golem of Safeguarding"]).toBe("Art/2DItems/Gems/RockGolem.webp");
});

test("buff definitions and unlinked visuals map to exported status art", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-art-map-"));
  temporary.push(dir);
  const bases = {
    "Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/StormBladeOneHand": {
      name: "Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeOneHand.dds" },
    },
    "Metadata/Items/Weapons/TwoHandWeapons/TwoHandSwords/StormBladeTwoHand": {
      name: "Two Handed Storm Blade",
      release_state: "released",
      visual_identity: { dds_file: "Art/StormBladeTwoHand.dds" },
    },
  };
  const visuals = {
    ignited_template: {
      icon: "Art/2DArt/BuffIcons/template-fire.dds",
      sources: { BuffTemplates: [{ id: "IgniteTemplate", buff_id: "ignited" }] },
    },
    ignited: {
      icon: "Art/2DArt/BuffIcons/buffonfire.dds",
      sources: { BuffDefinitions: [{ id: "ignited", name: "Ignited", buff_category: "Debuff" }] },
    },
    rage: {
      icon: "Art/2DArt/BuffIcons/rage.dds",
      sources: { BuffTemplates: [{ id: "RageTemplate", buff_id: "rage", name: "Rage" }] },
    },
    visual_only: { icon: "Art/2DArt/BuffIcons/visual-only.dds", name: "Visual Only" },
    missing: { icon: "Art/2DArt/BuffIcons/missing.dds" },
  };
  await Bun.write(path.join(dir, "base_items.min.json"), JSON.stringify(bases));
  await Bun.write(path.join(dir, "uniques.min.json"), "[]");
  await Bun.write(path.join(dir, "skill_gems.min.json"), "{}");
  await Bun.write(path.join(dir, "buff_visuals.min.json"), JSON.stringify(visuals));
  for (const file of [
    "Art/StormBladeOneHand.webp",
    "Art/StormBladeTwoHand.webp",
    "Art/2DArt/BuffIcons/template-fire.webp",
    "Art/2DArt/BuffIcons/buffonfire.webp",
    "Art/2DArt/BuffIcons/rage.webp",
    "Art/2DArt/BuffIcons/visual-only.webp",
  ]) {
    await Bun.write(path.join(dir, file), file);
  }

  const { map, missing } = await buildMap("poe1", "test", dir, {});

  expect(map.buffs.ignited).toBe("Art/2DArt/BuffIcons/buffonfire.webp");
  expect(map.buffs.rage).toBe("Art/2DArt/BuffIcons/rage.webp");
  expect(map.buffNames.Ignited).toBe("Art/2DArt/BuffIcons/buffonfire.webp");
  expect(map.buffNames.Rage).toBe("Art/2DArt/BuffIcons/rage.webp");
  expect(map.buffNames["Visual Only"]).toBe("Art/2DArt/BuffIcons/visual-only.webp");
  expect(map.buffVisuals.visual_only).toBe("Art/2DArt/BuffIcons/visual-only.webp");
  expect(map.buffs.visual_only).toBeUndefined();
  expect(missing).toContain("Art/2DArt/BuffIcons/missing.dds");
});

test("a buff whose id matches its name owns that name", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-art-map-"));
  temporary.push(dir);
  const visuals = {
    divinity: {
      icon: "Art/2DArt/BuffIcons/Divinity.dds",
      sources: { BuffDefinitions: [{ id: "divinity", name: "Divinity" }] },
    },
    aod_boss_divine_buff: {
      icon: "Art/2DArt/BuffIcons/BossBlessing.dds",
      sources: { BuffDefinitions: [{ id: "aod_boss_divine_buff", name: "Divinity" }] },
    },
    Sanctum_frozen: {
      icon: "Art/2DArt/BuffIcons/SanctumTimeFrozen.dds",
      sources: { BuffDefinitions: [{ id: "Sanctum_frozen", name: "Frozen" }] },
    },
    frozen: { sources: { BuffDefinitions: [{ id: "frozen", name: "Frozen" }] } },
  };
  const bases = {
    "Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/StormBladeOneHand": {
      name: "Storm Blade",
      visual_identity: { dds_file: "Art/StormBladeOneHand.dds" },
    },
    "Metadata/Items/Weapons/TwoHandWeapons/TwoHandSwords/StormBladeTwoHand": {
      name: "Two Handed Storm Blade",
      visual_identity: { dds_file: "Art/StormBladeTwoHand.dds" },
    },
  };
  await Bun.write(path.join(dir, "base_items.min.json"), JSON.stringify(bases));
  await Bun.write(path.join(dir, "uniques.min.json"), "[]");
  await Bun.write(path.join(dir, "skill_gems.min.json"), "{}");
  await Bun.write(path.join(dir, "buff_visuals.min.json"), JSON.stringify(visuals));
  for (const file of [
    "Art/StormBladeOneHand.webp",
    "Art/StormBladeTwoHand.webp",
    "Art/2DArt/BuffIcons/Divinity.webp",
    "Art/2DArt/BuffIcons/BossBlessing.webp",
    "Art/2DArt/BuffIcons/SanctumTimeFrozen.webp",
  ]) {
    await Bun.write(path.join(dir, file), file);
  }

  const { map } = await buildMap("poe2", "test", dir, {});

  expect(map.buffNames.Divinity).toBe("Art/2DArt/BuffIcons/Divinity.webp");
  expect(map.buffNames.Frozen).toBeUndefined();
  expect(map.buffs.Sanctum_frozen).toBe("Art/2DArt/BuffIcons/SanctumTimeFrozen.webp");
});

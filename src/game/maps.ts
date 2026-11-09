export type HidingSpotType =
  | 'trash_bin'
  | 'water_tunnel'
  | 'drainage_entrance'
  | 'large_crate'
  | 'bush'
  | 'storage_container'
  | 'kiosk'
  | 'phone_booth'
  | 'cabinet_wardrobe'
  | 'elevator_shaft'
  | 'curtain_alcove'
  | 'refrigerator_box'
  | 'couch_fort'
  | 'moving_package'
  | ' bathtub_curtain'
  | 'fountain_basin'
  | 'treasure_chest_spot'
  | 'ancient_shrine';

export type CharacterSkinId =
  | 'male_scout'
  | 'female_runner'
  | 'dark_knight'
  | 'toxic_slime'
  | 'void_slime'
  | 'mystic_ranger'
  | 'skeleton_stalker';

export interface HidingSpotConfig {
  id: string;
  type: HidingSpotType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  canInspect: boolean;
  canEliminateOccupant: boolean;
  interactionRange: number;
}

export interface WallRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'building' | 'brick_wall' | 'hedge_wall' | 'water_canal' | 'fence' | 'interior_wall';
  label?: string;
  roofColor?: string;
  wallColor?: string;
}

export interface MapRoad {
  x: number;
  y: number;
  width: number;
  height: number;
  kind:
    | 'asphalt'
    | 'alley'
    | 'plaza'
    | 'dock_planks'
    | 'wood_floor'
    | 'kitchen_tile'
    | 'carpet_blue'
    | 'carpet_red'
    | 'grass_patch'
    | 'autumn_grass'
    | 'bridge_h'
    | 'bridge_v'
    | 'railway';
}

export type PropType =
  | 'tree_green'
  | 'tree_autumn'
  | 'house_red_roof'
  | 'house_beige_roof'
  | 'bed_red'
  | 'bed_yellow'
  | 'bunkbed_green'
  | 'bookshelf'
  | 'couch_blue'
  | 'couch_red'
  | 'coffee_table'
  | 'kitchen_counter'
  | 'kitchen_sink'
  | 'fridge_white'
  | 'bathtub'
  | 'toilet'
  | 'laptop_desk'
  | 'flowerpot'
  | 'fountain'
  | 'shiny_coin'
  | 'exotic_fruit'
  | 'skateboard'
  | 'trophy'
  | 'stairs'
  | 'door_open'
  | 'window_square'
  | 'treasure_chest'
  | 'stone_shrine'
  | 'water_rock';

export interface MapProp {
  id: string;
  type: PropType;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type MapId =
  | 'downtown_plaza'
  | 'harbor_district'
  | 'modern_mall'
  | 'mystic_sanctuary';

export interface MapConfig {
  id: MapId;
  name: string;
  subtitle: string;
  theme: 'urban_interiors' | 'harbor_fantasy' | 'modern_executive' | 'mystic_woods';
  recommendedSeekers: 1 | 2;
  width: number;
  height: number;
  tileSize: number;
  seekerSpawnZone: { x: number; y: number; width: number; height: number };
  seekerSpawns: Array<{ x: number; y: number }>;
  hiderSpawnZone: { x: number; y: number; width: number; height: number };
  hiderSpawns: Array<{ x: number; y: number }>;
  objective: {
    id: string;
    label: string;
    x: number;
    y: number;
    radius: number;
    interactionRange: number;
  };
  /** Optional secondary escape beacons (see EXTRA_OBJECTIVES). */
  extraObjectives?: Array<MapConfig['objective']>;
  roads: MapRoad[];
  walls: WallRect[];
  props: MapProp[];
  hidingSpots: HidingSpotConfig[];
  streetlights: Array<{ x: number; y: number }>;
}

export const CHARACTER_SKINS: Array<{
  id: CharacterSkinId;
  name: string;
  packSource: string;
  description: string;
  roleHint: string;
}> = [
  {
    id: 'male_scout',
    name: 'Leo (Urban Scout)',
    packSource: 'Modern Interiors v2.2 / Adam_16x16.png',
    description: 'Streetwear jacket, blue backpack & sneakers',
    roleHint: 'Hider / All-Rounder',
  },
  {
    id: 'female_runner',
    name: 'Maya (Parkour Runner)',
    packSource: 'Modern Interiors v2.2 / Amelia_16x16.png',
    description: 'Crimson hoodie, ribbon ponytail & green skateboard',
    roleHint: 'Hider / Objective Runner',
  },
  {
    id: 'mystic_ranger',
    name: 'Rowan (Mystic Ranger)',
    packSource: 'Mystic Woods v2.2 / sprites/characters/player.png',
    description: 'Forest tunic, adventurer cloak & woodland boots',
    roleHint: 'Hider / Woods Specialist',
  },
  {
    id: 'toxic_slime',
    name: 'Bloop (Green Slime)',
    packSource: 'Brackeys Platformer / sprites/slime_green.png',
    description: 'Bouncy emerald gelatinous creature with glowing core',
    roleHint: 'Stealth Hider',
  },
  {
    id: 'void_slime',
    name: 'Nyx (Purple Slime)',
    packSource: 'Brackeys Platformer / sprites/slime_purple.png',
    description: 'Shadowy arcane slime with mystic fruit aura',
    roleHint: 'Hider / Seeker',
  },
  {
    id: 'dark_knight',
    name: 'Vanguard (Armored Knight)',
    packSource: 'Brackeys Platformer / sprites/knight.png',
    description: 'Plumed steel helm, crimson cape & broadsword',
    roleHint: 'Default Seeker Skin',
  },
  {
    id: 'skeleton_stalker',
    name: 'Grim (Skeleton Seeker)',
    packSource: 'Mystic Woods v2.2 / sprites/characters/skeleton.png',
    description: 'Ancient guardian skeleton armed with runic blade',
    roleHint: 'Elite Seeker Skin',
  },
];

export const MAPS: Record<MapId, MapConfig> = {
  downtown_plaza: {
    id: 'downtown_plaza',
    name: 'PixelSpaces Metro & Interiors',
    subtitle: 'Cutaway furnished apartments, autumn park, canal bridges & central beacon (18 hiding spots)',
    theme: 'urban_interiors',
    recommendedSeekers: 1,
    width: 1600,
    height: 1120,
    tileSize: 32,
    seekerSpawnZone: { x: 64, y: 64, width: 192, height: 160 },
    seekerSpawns: [
      { x: 136, y: 140 },
      { x: 184, y: 140 },
    ],
    hiderSpawnZone: { x: 680, y: 460, width: 240, height: 200 },
    hiderSpawns: [
      { x: 745, y: 515 },
      { x: 870, y: 500 },
      { x: 730, y: 620 },
      { x: 870, y: 620 },
      { x: 800, y: 485 },
      { x: 800, y: 635 },
    ],
    objective: {
      id: 'beacon_downtown',
      label: 'City-Center Signal Fountain & Beacon',
      x: 800,
      y: 560,
      radius: 36,
      interactionRange: 88,
    },
    roads: [
      // Outdoor Grass & Autumn Park Patches
      { x: 580, y: 360, width: 440, height: 400, kind: 'autumn_grass' },
      // Central Stone Plaza Square
      { x: 636, y: 416, width: 328, height: 288, kind: 'plaza' },
      // Horizontal Boulevards
      { x: 48, y: 240, width: 1504, height: 96, kind: 'asphalt' },
      { x: 48, y: 512, width: 1504, height: 96, kind: 'asphalt' },
      { x: 48, y: 784, width: 1504, height: 96, kind: 'asphalt' },
      // Vertical Avenues
      { x: 256, y: 48, width: 96, height: 1024, kind: 'asphalt' },
      { x: 752, y: 48, width: 96, height: 1024, kind: 'asphalt' },
      { x: 1248, y: 48, width: 96, height: 1024, kind: 'asphalt' },
      // Narrow Alleys
      { x: 512, y: 96, width: 56, height: 928, kind: 'alley' },
      { x: 1032, y: 96, width: 56, height: 928, kind: 'alley' },

      // Cutaway Building Interior Floors (from Pixel_16_interiors_v2_free & PixelSpaces)
      // NW1: Guardhouse Carpet
      { x: 368, y: 80, width: 128, height: 140, kind: 'carpet_blue' },
      // NW2: Metro Bank Vault / Office Wood Floor
      { x: 584, y: 80, width: 148, height: 140, kind: 'wood_floor' },
      // NE1: Arcade Lounge Red Carpet
      { x: 868, y: 80, width: 148, height: 140, kind: 'carpet_red' },
      // NE2: Roastery Kitchen Checkerboard Tile
      { x: 1104, y: 80, width: 128, height: 140, kind: 'kitchen_tile' },
      // NE3: Hotel Lux Bedroom Wood Planks
      { x: 1364, y: 80, width: 156, height: 140, kind: 'wood_floor' },

      // Mid-West Interiors
      { x: 80, y: 356, width: 156, height: 136, kind: 'kitchen_tile' },
      { x: 368, y: 356, width: 128, height: 136, kind: 'carpet_blue' },
      { x: 80, y: 624, width: 156, height: 140, kind: 'wood_floor' },
      { x: 368, y: 624, width: 128, height: 140, kind: 'carpet_red' },

      // Mid-East Interiors (Book Depot, Noodle Kitchen, Hardware, Post Office)
      { x: 1104, y: 356, width: 128, height: 136, kind: 'wood_floor' },
      { x: 1364, y: 356, width: 156, height: 136, kind: 'kitchen_tile' },
      { x: 1104, y: 624, width: 128, height: 140, kind: 'carpet_blue' },
      { x: 1364, y: 624, width: 156, height: 140, kind: 'wood_floor' },

      // South Interiors & Canal Bridges
      { x: 80, y: 900, width: 156, height: 148, kind: 'wood_floor' },
      { x: 368, y: 900, width: 128, height: 148, kind: 'kitchen_tile' },
      { x: 732, y: 944, width: 136, height: 56, kind: 'bridge_h' },
      { x: 1104, y: 900, width: 128, height: 148, kind: 'carpet_blue' },
      { x: 1364, y: 900, width: 156, height: 148, kind: 'wood_floor' },
    ],
    walls: [
      // North-West Precinct Block
      { id: 'w_nw1', x: 368, y: 80, width: 128, height: 140, kind: 'building', label: 'PRECINCT HQ', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'w_nw2', x: 584, y: 80, width: 148, height: 140, kind: 'building', label: 'LIVING LOUNGE', roofColor: '#1E3A5F', wallColor: '#2C4C7E' },
      // North-East Commercial Block
      { id: 'w_ne1', x: 868, y: 80, width: 148, height: 140, kind: 'building', label: 'GAMING LOFT', roofColor: '#312E81', wallColor: '#4338CA' },
      { id: 'w_ne2', x: 1104, y: 80, width: 128, height: 140, kind: 'building', label: 'CAFE KITCHEN', roofColor: '#3F2E21', wallColor: '#5C4028' },
      { id: 'w_ne3', x: 1364, y: 80, width: 156, height: 140, kind: 'building', label: 'HOTEL SUITE', roofColor: '#7F1D1D', wallColor: '#991B1B' },

      // Mid-West Apartment & Bath Block
      { id: 'w_mw1', x: 80, y: 356, width: 156, height: 136, kind: 'building', label: 'BATH & SPA', roofColor: '#1E3A5F', wallColor: '#3B82F6' },
      { id: 'w_mw2', x: 368, y: 356, width: 128, height: 136, kind: 'building', label: 'ELEVATOR LOBBY', roofColor: '#1F2937', wallColor: '#374151' },
      { id: 'w_mw3', x: 80, y: 624, width: 156, height: 140, kind: 'building', label: 'BUNKBED DORM', roofColor: '#3B2F2F', wallColor: '#524141' },
      { id: 'w_mw4', x: 368, y: 624, width: 128, height: 140, kind: 'building', label: 'RED VELVET DEN', roofColor: '#3B1D38', wallColor: '#582952' },

      // Plaza Corner Hedges & Fences (from fantasy_ [fencesAndWalls])
      { id: 'w_pc1', x: 604, y: 376, width: 92, height: 32, kind: 'fence' },
      { id: 'w_pc2', x: 904, y: 376, width: 92, height: 32, kind: 'fence' },
      { id: 'w_pc3', x: 604, y: 712, width: 92, height: 32, kind: 'fence' },
      { id: 'w_pc4', x: 904, y: 712, width: 92, height: 32, kind: 'fence' },

      // Mid-East Market Block
      { id: 'w_me1', x: 1104, y: 356, width: 128, height: 136, kind: 'building', label: 'BOOK LIBRARY', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'w_me2', x: 1364, y: 356, width: 156, height: 136, kind: 'building', label: 'BISTRO KITCHEN', roofColor: '#451A1C', wallColor: '#692629' },
      { id: 'w_me3', x: 1104, y: 624, width: 128, height: 140, kind: 'building', label: 'STUDY OFFICE', roofColor: '#1E3A3A', wallColor: '#285252' },
      { id: 'w_me4', x: 1364, y: 624, width: 156, height: 140, kind: 'building', label: 'PACKAGE DEPOT', roofColor: '#1E293B', wallColor: '#334155' },

      // South Blocks & Canal Drainage
      { id: 'w_sw1', x: 80, y: 900, width: 156, height: 148, kind: 'building', label: 'RED HOUSE', roofColor: '#991B1B', wallColor: '#B91C1C' },
      { id: 'w_sw2', x: 368, y: 900, width: 128, height: 148, kind: 'building', label: 'BEIGE COTTAGE', roofColor: '#92400E', wallColor: '#B45309' },
      { id: 'w_sc1', x: 584, y: 912, width: 148, height: 136, kind: 'water_canal', label: 'SOUTH CANAL' },
      { id: 'w_sc2', x: 868, y: 912, width: 148, height: 136, kind: 'water_canal', label: 'EAST CANAL' },
      { id: 'w_se1', x: 1104, y: 900, width: 128, height: 148, kind: 'building', label: 'GREENHOUSE', roofColor: '#065F46', wallColor: '#047857' },
      { id: 'w_se2', x: 1364, y: 900, width: 156, height: 148, kind: 'building', label: 'TROPHY HALL', roofColor: '#2D2638', wallColor: '#433854' },
    ],
    props: [
      // Interior Furniture Props rendered inside the cutaway buildings
      { id: 'pr_1', type: 'couch_blue', x: 604, y: 100 },
      { id: 'pr_2', type: 'coffee_table', x: 660, y: 110 },
      { id: 'pr_3', type: 'bookshelf', x: 384, y: 92 },
      { id: 'pr_4', type: 'laptop_desk', x: 436, y: 124 },
      { id: 'pr_5', type: 'couch_red', x: 888, y: 100 },
      { id: 'pr_6', type: 'skateboard', x: 954, y: 138 },
      { id: 'pr_7', type: 'kitchen_counter', x: 1118, y: 96 },
      { id: 'pr_8', type: 'fridge_white', x: 1184, y: 92 },
      { id: 'pr_9', type: 'bed_red', x: 1384, y: 98 },
      { id: 'pr_10', type: 'bed_yellow', x: 1452, y: 98 },
      { id: 'pr_11', type: 'bathtub', x: 96, y: 374 },
      { id: 'pr_12', type: 'toilet', x: 176, y: 374 },
      { id: 'pr_13', type: 'stairs', x: 388, y: 372 },
      { id: 'pr_14', type: 'bunkbed_green', x: 98, y: 644 },
      { id: 'pr_15', type: 'couch_red', x: 386, y: 648 },
      { id: 'pr_16', type: 'bookshelf', x: 1120, y: 372 },
      { id: 'pr_17', type: 'bookshelf', x: 1172, y: 372 },
      { id: 'pr_18', type: 'kitchen_sink', x: 1384, y: 374 },
      { id: 'pr_19', type: 'kitchen_counter', x: 1442, y: 374 },
      { id: 'pr_20', type: 'laptop_desk', x: 1126, y: 648 },
      { id: 'pr_21', type: 'trophy', x: 1400, y: 928 },
      { id: 'pr_22', type: 'flowerpot', x: 1130, y: 924 },
      { id: 'pr_23', type: 'flowerpot', x: 1178, y: 924 },

      // Outdoor Trees, Autumn Foliage, Shiny Coins & Exotic Fruits
      { id: 'pr_t1', type: 'tree_green', x: 310, y: 66 },
      { id: 'pr_t2', type: 'tree_autumn', x: 584, y: 364 },
      { id: 'pr_t3', type: 'tree_autumn', x: 984, y: 364 },
      { id: 'pr_t4', type: 'tree_green', x: 584, y: 726 },
      { id: 'pr_t5', type: 'tree_autumn', x: 984, y: 726 },
      { id: 'pr_c1', type: 'shiny_coin', x: 706, y: 454 },
      { id: 'pr_c2', type: 'shiny_coin', x: 894, y: 454 },
      { id: 'pr_f1', type: 'exotic_fruit', x: 706, y: 662 },
      { id: 'pr_f2', type: 'exotic_fruit', x: 894, y: 662 },
    ],
    hidingSpots: [
      { id: 'hs_1', type: 'cabinet_wardrobe', label: 'Precinct Oak Wardrobe', x: 320, y: 226, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_2', type: 'couch_fort', label: 'Lounge Blue Couch Cushions', x: 604, y: 228, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_3', type: 'curtain_alcove', label: 'Gaming Loft Red Curtain', x: 880, y: 228, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_4', type: 'refrigerator_box', label: 'Cafe Large White Fridge', x: 1054, y: 226, width: 34, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_5', type: 'moving_package', label: 'Hotel Moving Package', x: 1316, y: 228, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_6', type: 'elevator_shaft', label: 'Transit Hub Elevator Door', x: 522, y: 326, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_7', type: 'trash_bin', label: 'Spa Alley Blue Bin', x: 248, y: 498, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_8', type: 'bush', label: 'North Plaza Autumn Shrub', x: 648, y: 424, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_9', type: 'bush', label: 'East Plaza Mystic Hedge', x: 928, y: 424, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_10', type: 'kiosk', label: 'Plaza Ticket Kiosk', x: 636, y: 656, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_11', type: 'cabinet_wardrobe', label: 'Library Book Cabinet', x: 1044, y: 498, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_12', type: 'refrigerator_box', label: 'Bistro Walk-In Cooler', x: 1316, y: 498, width: 34, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_13', type: 'moving_package', label: 'Dormitory Blue Storage Box', x: 248, y: 772, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_14', type: 'curtain_alcove', label: 'Cinema Velvet Drapes', x: 512, y: 772, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_15', type: 'elevator_shaft', label: 'Office Service Elevator', x: 1052, y: 772, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_16', type: 'fountain_basin', label: 'West Canal Fountain Basin', x: 530, y: 862, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_17', type: 'fountain_basin', label: 'East Canal Stone Fountain', x: 1032, y: 862, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hs_18', type: 'large_crate', label: 'Trophy Hall Relic Crate', x: 1312, y: 862, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
    ],
    streetlights: [
      { x: 250, y: 236 },
      { x: 746, y: 236 },
      { x: 1242, y: 236 },
      { x: 620, y: 404 },
      { x: 980, y: 404 },
      { x: 620, y: 716 },
      { x: 980, y: 716 },
      { x: 250, y: 780 },
      { x: 1242, y: 780 },
    ],
  },

  harbor_district: {
    id: 'harbor_district',
    name: 'Eldoria Harbor & Railway Docks',
    subtitle: 'Fantasy v2.0 railway tracks, bridges, cavern fountains & furnished dockhouses (20 hiding spots)',
    theme: 'harbor_fantasy',
    recommendedSeekers: 2,
    width: 1760,
    height: 1200,
    tileSize: 32,
    seekerSpawnZone: { x: 64, y: 64, width: 208, height: 176 },
    seekerSpawns: [
      { x: 128, y: 148 },
      { x: 208, y: 148 },
    ],
    hiderSpawnZone: { x: 740, y: 480, width: 280, height: 240 },
    hiderSpawns: [
      { x: 820, y: 545 },
      { x: 970, y: 520 },
      { x: 790, y: 680 },
      { x: 970, y: 680 },
      { x: 880, y: 500 },
      { x: 880, y: 700 },
    ],
    objective: {
      id: 'beacon_harbor',
      label: 'Crystal Fountain & Radio Spire',
      x: 880,
      y: 600,
      radius: 38,
      interactionRange: 88,
    },
    roads: [
      { x: 640, y: 390, width: 480, height: 420, kind: 'grass_patch' },
      { x: 680, y: 430, width: 400, height: 340, kind: 'dock_planks' },
      { x: 48, y: 260, width: 1664, height: 96, kind: 'asphalt' },
      { x: 48, y: 552, width: 1664, height: 96, kind: 'railway' },
      { x: 48, y: 844, width: 1664, height: 96, kind: 'asphalt' },
      { x: 288, y: 48, width: 96, height: 1104, kind: 'asphalt' },
      { x: 832, y: 48, width: 96, height: 1104, kind: 'bridge_v' },
      { x: 1376, y: 48, width: 96, height: 1104, kind: 'asphalt' },
      { x: 560, y: 80, width: 64, height: 1040, kind: 'alley' },
      { x: 1136, y: 80, width: 64, height: 1040, kind: 'alley' },
      // Cutaway Dockhouse Interiors
      { x: 404, y: 88, width: 136, height: 148, kind: 'wood_floor' },
      { x: 644, y: 88, width: 164, height: 148, kind: 'carpet_blue' },
      { x: 948, y: 88, width: 164, height: 148, kind: 'kitchen_tile' },
      { x: 1220, y: 88, width: 136, height: 148, kind: 'wood_floor' },
      { x: 1492, y: 88, width: 176, height: 148, kind: 'carpet_red' },
    ],
    walls: [
      { id: 'h_nw1', x: 404, y: 88, width: 136, height: 148, kind: 'building', label: 'CAPTAIN QUARTERS', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'h_nw2', x: 644, y: 88, width: 164, height: 148, kind: 'building', label: 'CUSTOMS LOUNGE', roofColor: '#1E3A5F', wallColor: '#2C4C7E' },
      { id: 'h_ne1', x: 948, y: 88, width: 164, height: 148, kind: 'building', label: 'MESS GALLEY', roofColor: '#312E81', wallColor: '#4338CA' },
      { id: 'h_ne2', x: 1220, y: 88, width: 136, height: 148, kind: 'building', label: 'MINE DEPOT', roofColor: '#3F2E21', wallColor: '#5C4028' },
      { id: 'h_ne3', x: 1492, y: 88, width: 176, height: 148, kind: 'building', label: 'GUILD HALL', roofColor: '#1E293B', wallColor: '#334155' },

      { id: 'h_mw1', x: 88, y: 380, width: 176, height: 148, kind: 'building', label: 'SHIPYARD WEST', roofColor: '#27272A', wallColor: '#3F3F46' },
      { id: 'h_mw2', x: 404, y: 380, width: 136, height: 148, kind: 'building', label: 'FROZEN IGLOO STORAGE', roofColor: '#1E3A5F', wallColor: '#38BDF8' },
      { id: 'h_mw3', x: 88, y: 672, width: 176, height: 148, kind: 'building', label: 'CAVERN FORGE', roofColor: '#3B2F2F', wallColor: '#524141' },
      { id: 'h_mw4', x: 404, y: 672, width: 136, height: 148, kind: 'building', label: 'TAPESTRY LOFT', roofColor: '#3B1D38', wallColor: '#582952' },

      { id: 'h_pc1', x: 660, y: 400, width: 108, height: 32, kind: 'fence' },
      { id: 'h_pc2', x: 992, y: 400, width: 108, height: 32, kind: 'fence' },
      { id: 'h_pc3', x: 660, y: 768, width: 108, height: 32, kind: 'fence' },
      { id: 'h_pc4', x: 992, y: 768, width: 108, height: 32, kind: 'fence' },

      { id: 'h_me1', x: 1220, y: 380, width: 136, height: 148, kind: 'building', label: 'FREIGHT SHED', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'h_me2', x: 1492, y: 380, width: 176, height: 148, kind: 'building', label: 'SAILORS BUNK', roofColor: '#451A1C', wallColor: '#692629' },
      { id: 'h_me3', x: 1220, y: 672, width: 136, height: 148, kind: 'building', label: 'ALCHEMIST LAB', roofColor: '#1E3A3A', wallColor: '#285252' },
      { id: 'h_me4', x: 1492, y: 672, width: 176, height: 148, kind: 'building', label: 'LIGHTHOUSE HQ', roofColor: '#1E293B', wallColor: '#334155' },

      { id: 'h_sw1', x: 88, y: 964, width: 176, height: 152, kind: 'building', label: 'PIER 9 VAULT', roofColor: '#27272A', wallColor: '#3F3F46' },
      { id: 'h_sw2', x: 404, y: 964, width: 136, height: 152, kind: 'water_canal', label: 'WEST LAGOON' },
      { id: 'h_sc1', x: 644, y: 964, width: 164, height: 152, kind: 'water_canal', label: 'HARBOR BASIN' },
      { id: 'h_sc2', x: 948, y: 964, width: 164, height: 152, kind: 'water_canal', label: 'EAST BASIN' },
      { id: 'h_se1', x: 1220, y: 964, width: 136, height: 152, kind: 'building', label: 'FISHERY KITCHEN', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'h_se2', x: 1492, y: 964, width: 176, height: 152, kind: 'building', label: 'CONTAINER TERMINAL', roofColor: '#2D2638', wallColor: '#433854' },
    ],
    props: [
      { id: 'hp_1', type: 'bed_red', x: 420, y: 108 },
      { id: 'hp_2', type: 'couch_blue', x: 668, y: 108 },
      { id: 'hp_3', type: 'kitchen_counter', x: 968, y: 108 },
      { id: 'hp_4', type: 'fridge_white', x: 1042, y: 104 },
      { id: 'hp_5', type: 'bookshelf', x: 1244, y: 108 },
      { id: 'hp_6', type: 'couch_red', x: 1516, y: 108 },
      { id: 'hp_7', type: 'tree_autumn', x: 648, y: 396 },
      { id: 'hp_8', type: 'tree_green', x: 1076, y: 396 },
      { id: 'hp_9', type: 'shiny_coin', x: 760, y: 490 },
      { id: 'hp_10', type: 'exotic_fruit', x: 1000, y: 490 },
    ],
    hidingSpots: [
      { id: 'hh_1', type: 'cabinet_wardrobe', label: 'Captain Wardrobe Cabinet', x: 350, y: 248, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_2', type: 'moving_package', label: 'Bonded Timber Package', x: 590, y: 248, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_3', type: 'refrigerator_box', label: 'Galley Cold Locker', x: 896, y: 248, width: 34, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_4', type: 'trash_bin', label: 'Mine Depot Ore Bin', x: 1168, y: 248, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_5', type: 'couch_fort', label: 'Guild Hall Plush Sofa', x: 1436, y: 248, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_6', type: 'elevator_shaft', label: 'Shipyard Hoist Shaft', x: 284, y: 336, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_7', type: 'large_crate', label: 'Ice House Insulated Crate', x: 562, y: 336, width: 34, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_8', type: 'bush', label: 'Radio Plaza Mystic Shrub', x: 704, y: 452, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_9', type: 'bush', label: 'East Dock Autumn Bush', x: 1024, y: 452, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_10', type: 'kiosk', label: 'Ferry Ticket Kiosk', x: 704, y: 712, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_11', type: 'curtain_alcove', label: 'Dockworkers Curtain Booth', x: 1024, y: 712, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_12', type: 'drainage_entrance', label: 'Railway Storm Grate', x: 1152, y: 540, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_13', type: 'storage_container', label: 'Sailors Bunk Cargo Box', x: 1436, y: 540, width: 40, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_14', type: 'trash_bin', label: 'Forge Slag Dumpster', x: 284, y: 832, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_15', type: 'curtain_alcove', label: 'Tapestry Velvet Alcove', x: 562, y: 832, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_16', type: 'cabinet_wardrobe', label: 'Alchemist Herb Cabinet', x: 1168, y: 832, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_17', type: 'fountain_basin', label: 'West Lagoon Fountain', x: 350, y: 916, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_18', type: 'fountain_basin', label: 'Harbor Basin Crystal Well', x: 590, y: 916, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_19', type: 'water_tunnel', label: 'East Basin Drainage Tunnel', x: 1144, y: 916, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'hh_20', type: 'moving_package', label: 'Terminal Export Crate', x: 1436, y: 916, width: 40, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
    ],
    streetlights: [
      { x: 280, y: 256 },
      { x: 824, y: 256 },
      { x: 1368, y: 256 },
      { x: 680, y: 430 },
      { x: 1080, y: 430 },
      { x: 680, y: 770 },
      { x: 1080, y: 770 },
      { x: 280, y: 840 },
      { x: 1368, y: 840 },
    ],
  },

  modern_mall: {
    id: 'modern_mall',
    name: 'Modern Interiors Executive Plaza',
    subtitle: 'Luxury studio apartments, tech offices, marble atrium & spa suites (18 hiding spots)',
    theme: 'modern_executive',
    recommendedSeekers: 1,
    width: 1600,
    height: 1120,
    tileSize: 32,
    seekerSpawnZone: { x: 64, y: 64, width: 192, height: 160 },
    seekerSpawns: [
      { x: 136, y: 140 },
      { x: 184, y: 140 },
    ],
    hiderSpawnZone: { x: 680, y: 460, width: 240, height: 200 },
    hiderSpawns: [
      { x: 745, y: 515 },
      { x: 870, y: 500 },
      { x: 730, y: 620 },
      { x: 870, y: 620 },
      { x: 800, y: 485 },
      { x: 800, y: 635 },
    ],
    objective: {
      id: 'beacon_modern',
      label: 'Executive Atrium Signal Spire',
      x: 800,
      y: 560,
      radius: 36,
      interactionRange: 88,
    },
    roads: [
      { x: 580, y: 360, width: 440, height: 400, kind: 'carpet_blue' },
      { x: 636, y: 416, width: 328, height: 288, kind: 'plaza' },
      { x: 48, y: 240, width: 1504, height: 96, kind: 'kitchen_tile' },
      { x: 48, y: 512, width: 1504, height: 96, kind: 'wood_floor' },
      { x: 48, y: 784, width: 1504, height: 96, kind: 'kitchen_tile' },
      { x: 256, y: 48, width: 96, height: 1024, kind: 'asphalt' },
      { x: 752, y: 48, width: 96, height: 1024, kind: 'wood_floor' },
      { x: 1248, y: 48, width: 96, height: 1024, kind: 'asphalt' },
      { x: 512, y: 96, width: 56, height: 928, kind: 'alley' },
      { x: 1032, y: 96, width: 56, height: 928, kind: 'alley' },

      // Cutaway Modern Interiors v2.2 Rooms
      { x: 368, y: 80, width: 128, height: 140, kind: 'carpet_red' },
      { x: 584, y: 80, width: 148, height: 140, kind: 'wood_floor' },
      { x: 868, y: 80, width: 148, height: 140, kind: 'carpet_blue' },
      { x: 1104, y: 80, width: 128, height: 140, kind: 'kitchen_tile' },
      { x: 1364, y: 80, width: 156, height: 140, kind: 'carpet_red' },
      { x: 80, y: 356, width: 156, height: 136, kind: 'kitchen_tile' },
      { x: 368, y: 356, width: 128, height: 136, kind: 'wood_floor' },
      { x: 80, y: 624, width: 156, height: 140, kind: 'carpet_blue' },
      { x: 368, y: 624, width: 128, height: 140, kind: 'carpet_red' },
      { x: 1104, y: 356, width: 128, height: 136, kind: 'carpet_blue' },
      { x: 1364, y: 356, width: 156, height: 136, kind: 'kitchen_tile' },
      { x: 1104, y: 624, width: 128, height: 140, kind: 'wood_floor' },
      { x: 1364, y: 624, width: 156, height: 140, kind: 'carpet_red' },
      { x: 80, y: 900, width: 156, height: 148, kind: 'wood_floor' },
      { x: 368, y: 900, width: 128, height: 148, kind: 'carpet_blue' },
      { x: 732, y: 944, width: 136, height: 56, kind: 'bridge_h' },
      { x: 1104, y: 900, width: 128, height: 148, kind: 'kitchen_tile' },
      { x: 1364, y: 900, width: 156, height: 148, kind: 'wood_floor' },
    ],
    walls: [
      { id: 'm_nw1', x: 368, y: 80, width: 128, height: 140, kind: 'building', label: 'SECURITY OPS', roofColor: '#1E293B', wallColor: '#475569' },
      { id: 'm_nw2', x: 584, y: 80, width: 148, height: 140, kind: 'building', label: 'FOUNDER SUITE', roofColor: '#1E3A8A', wallColor: '#2563EB' },
      { id: 'm_ne1', x: 868, y: 80, width: 148, height: 140, kind: 'building', label: 'STREAMING STUDIO', roofColor: '#4C1D95', wallColor: '#6D28D9' },
      { id: 'm_ne2', x: 1104, y: 80, width: 128, height: 140, kind: 'building', label: 'ESPRESSO BAR', roofColor: '#451A03', wallColor: '#78350F' },
      { id: 'm_ne3', x: 1364, y: 80, width: 156, height: 140, kind: 'building', label: 'VIP PENTHOUSE', roofColor: '#881337', wallColor: '#BE123C' },

      { id: 'm_mw1', x: 80, y: 356, width: 156, height: 136, kind: 'building', label: 'WELLNESS SPA', roofColor: '#0F766E', wallColor: '#14B8A6' },
      { id: 'm_mw2', x: 368, y: 356, width: 128, height: 136, kind: 'building', label: 'SKYLINE FOYER', roofColor: '#1F2937', wallColor: '#4B5563' },
      { id: 'm_mw3', x: 80, y: 624, width: 156, height: 140, kind: 'building', label: 'CAPSULE HOTEL', roofColor: '#1E3A5F', wallColor: '#3B82F6' },
      { id: 'm_mw4', x: 368, y: 624, width: 128, height: 140, kind: 'building', label: 'HOME THEATER', roofColor: '#581C87', wallColor: '#7E22CE' },

      { id: 'm_pc1', x: 604, y: 376, width: 92, height: 32, kind: 'fence' },
      { id: 'm_pc2', x: 904, y: 376, width: 92, height: 32, kind: 'fence' },
      { id: 'm_pc3', x: 604, y: 712, width: 92, height: 32, kind: 'fence' },
      { id: 'm_pc4', x: 904, y: 712, width: 92, height: 32, kind: 'fence' },

      { id: 'm_me1', x: 1104, y: 356, width: 128, height: 136, kind: 'building', label: 'DESIGN ARCHIVE', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'm_me2', x: 1364, y: 356, width: 156, height: 136, kind: 'building', label: 'SUSHI GALLERY', roofColor: '#7C2D12', wallColor: '#9A3412' },
      { id: 'm_me3', x: 1104, y: 624, width: 128, height: 140, kind: 'building', label: 'DEV LAB 404', roofColor: '#064E3B', wallColor: '#047857' },
      { id: 'm_me4', x: 1364, y: 624, width: 156, height: 140, kind: 'building', label: 'COURIER VAULT', roofColor: '#1E293B', wallColor: '#334155' },

      { id: 'm_sw1', x: 80, y: 900, width: 156, height: 148, kind: 'building', label: 'ARTIST LOFT', roofColor: '#991B1B', wallColor: '#DC2626' },
      { id: 'm_sw2', x: 368, y: 900, width: 128, height: 148, kind: 'building', label: 'MUSIC CONSERVATORY', roofColor: '#78350F', wallColor: '#D97706' },
      { id: 'm_sc1', x: 584, y: 912, width: 148, height: 136, kind: 'water_canal', label: 'KOI REFLECTING POOL' },
      { id: 'm_sc2', x: 868, y: 912, width: 148, height: 136, kind: 'water_canal', label: 'ATRIUM WATERFALL' },
      { id: 'm_se1', x: 1104, y: 900, width: 128, height: 148, kind: 'building', label: 'BOTANICAL ATRIUM', roofColor: '#065F46', wallColor: '#10B981' },
      { id: 'm_se2', x: 1364, y: 900, width: 156, height: 148, kind: 'building', label: 'BOARDROOM SUITE', roofColor: '#312E81', wallColor: '#4F46E5' },
    ],
    props: [
      { id: 'mp_1', type: 'laptop_desk', x: 400, y: 108 },
      { id: 'mp_2', type: 'couch_blue', x: 604, y: 100 },
      { id: 'mp_3', type: 'coffee_table', x: 664, y: 112 },
      { id: 'mp_4', type: 'laptop_desk', x: 892, y: 104 },
      { id: 'mp_5', type: 'couch_red', x: 944, y: 104 },
      { id: 'mp_6', type: 'kitchen_counter', x: 1120, y: 98 },
      { id: 'mp_7', type: 'fridge_white', x: 1184, y: 94 },
      { id: 'mp_8', type: 'bed_red', x: 1384, y: 98 },
      { id: 'mp_9', type: 'bed_yellow', x: 1450, y: 98 },
      { id: 'mp_10', type: 'bathtub', x: 98, y: 374 },
      { id: 'mp_11', type: 'toilet', x: 176, y: 374 },
      { id: 'mp_12', type: 'stairs', x: 388, y: 372 },
      { id: 'mp_13', type: 'bunkbed_green', x: 98, y: 644 },
      { id: 'mp_14', type: 'couch_red', x: 388, y: 648 },
      { id: 'mp_15', type: 'bookshelf', x: 1120, y: 372 },
      { id: 'mp_16', type: 'kitchen_sink', x: 1384, y: 374 },
      { id: 'mp_17', type: 'laptop_desk', x: 1126, y: 648 },
      { id: 'mp_18', type: 'trophy', x: 1400, y: 928 },
      { id: 'mp_19', type: 'flowerpot', x: 650, y: 430 },
      { id: 'mp_20', type: 'flowerpot', x: 930, y: 430 },
      { id: 'mp_21', type: 'shiny_coin', x: 706, y: 454 },
      { id: 'mp_22', type: 'shiny_coin', x: 894, y: 454 },
      { id: 'mp_23', type: 'exotic_fruit', x: 706, y: 662 },
      { id: 'mp_24', type: 'exotic_fruit', x: 894, y: 662 },
    ],
    hidingSpots: [
      { id: 'mm_1', type: 'cabinet_wardrobe', label: 'Security Server Closet', x: 320, y: 226, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_2', type: 'couch_fort', label: 'Founder Leather Sofa', x: 604, y: 228, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_3', type: 'curtain_alcove', label: 'Studio Acoustic Curtain', x: 880, y: 228, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_4', type: 'refrigerator_box', label: 'Espresso Cold Fridge', x: 1054, y: 226, width: 34, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_5', type: 'moving_package', label: 'Penthouse Wardrobe Trunk', x: 1316, y: 228, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_6', type: 'elevator_shaft', label: 'Executive Glass Elevator', x: 522, y: 326, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_7', type: 'trash_bin', label: 'Wellness Spa Linen Chute', x: 248, y: 498, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_8', type: 'couch_fort', label: 'Atrium West Lounge Pod', x: 648, y: 424, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_9', type: 'couch_fort', label: 'Atrium East Lounge Pod', x: 928, y: 424, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_10', type: 'kiosk', label: 'Concierge Digital Kiosk', x: 636, y: 656, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_11', type: 'cabinet_wardrobe', label: 'Design Blueprint Cabinet', x: 1044, y: 498, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_12', type: 'refrigerator_box', label: 'Sushi Walk-In Freezer', x: 1316, y: 498, width: 34, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_13', type: 'moving_package', label: 'Capsule Pod Locker', x: 248, y: 772, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_14', type: 'curtain_alcove', label: 'Home Theater Velvet Screen', x: 512, y: 772, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_15', type: 'elevator_shaft', label: 'Dev Lab Freight Lift', x: 1052, y: 772, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_16', type: 'fountain_basin', label: 'Koi Pool Lily Basin', x: 530, y: 862, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_17', type: 'fountain_basin', label: 'Atrium Waterfall Basin', x: 1032, y: 862, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'mm_18', type: 'treasure_chest_spot', label: 'Boardroom Vault Chest', x: 1312, y: 862, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
    ],
    streetlights: [
      { x: 250, y: 236 },
      { x: 746, y: 236 },
      { x: 1242, y: 236 },
      { x: 620, y: 404 },
      { x: 980, y: 404 },
      { x: 620, y: 716 },
      { x: 980, y: 716 },
      { x: 250, y: 780 },
      { x: 1242, y: 780 },
    ],
  },

  mystic_sanctuary: {
    id: 'mystic_sanctuary',
    name: 'Mystic Woods & Ancient Ruins',
    subtitle: 'Enchanted forest glades, ancient stone shrines, treasure chests & lily streams (20 hiding spots)',
    theme: 'mystic_woods',
    recommendedSeekers: 2,
    width: 1760,
    height: 1200,
    tileSize: 32,
    seekerSpawnZone: { x: 64, y: 64, width: 208, height: 176 },
    seekerSpawns: [
      { x: 128, y: 148 },
      { x: 208, y: 148 },
    ],
    hiderSpawnZone: { x: 740, y: 480, width: 280, height: 240 },
    hiderSpawns: [
      { x: 820, y: 545 },
      { x: 970, y: 520 },
      { x: 790, y: 680 },
      { x: 970, y: 680 },
      { x: 880, y: 500 },
      { x: 880, y: 700 },
    ],
    objective: {
      id: 'beacon_mystic',
      label: 'Ancient Runic Sanctuary Altar',
      x: 880,
      y: 600,
      radius: 38,
      interactionRange: 88,
    },
    roads: [
      { x: 580, y: 360, width: 600, height: 480, kind: 'grass_patch' },
      { x: 680, y: 430, width: 400, height: 340, kind: 'plaza' },
      { x: 48, y: 260, width: 1664, height: 96, kind: 'autumn_grass' },
      { x: 48, y: 552, width: 1664, height: 96, kind: 'dock_planks' },
      { x: 48, y: 844, width: 1664, height: 96, kind: 'autumn_grass' },
      { x: 288, y: 48, width: 96, height: 1104, kind: 'asphalt' },
      { x: 832, y: 48, width: 96, height: 1104, kind: 'bridge_v' },
      { x: 1376, y: 48, width: 96, height: 1104, kind: 'asphalt' },
      { x: 560, y: 80, width: 64, height: 1040, kind: 'alley' },
      { x: 1136, y: 80, width: 64, height: 1040, kind: 'alley' },
      // Ancient Ruin Chambers
      { x: 404, y: 88, width: 136, height: 148, kind: 'wood_floor' },
      { x: 644, y: 88, width: 164, height: 148, kind: 'carpet_red' },
      { x: 948, y: 88, width: 164, height: 148, kind: 'wood_floor' },
      { x: 1220, y: 88, width: 136, height: 148, kind: 'carpet_blue' },
      { x: 1492, y: 88, width: 176, height: 148, kind: 'wood_floor' },
    ],
    walls: [
      { id: 'ms_nw1', x: 404, y: 88, width: 136, height: 148, kind: 'building', label: 'RANGER LODGE', roofColor: '#14532D', wallColor: '#166534' },
      { id: 'ms_nw2', x: 644, y: 88, width: 164, height: 148, kind: 'building', label: 'ELDER SHRINE', roofColor: '#312E81', wallColor: '#4338CA' },
      { id: 'ms_ne1', x: 948, y: 88, width: 164, height: 148, kind: 'building', label: 'DRUID APOTHECARY', roofColor: '#065F46', wallColor: '#047857' },
      { id: 'ms_ne2', x: 1220, y: 88, width: 136, height: 148, kind: 'building', label: 'RUNIC CRYPT', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'ms_ne3', x: 1492, y: 88, width: 176, height: 148, kind: 'building', label: 'WOODLAND KEEP', roofColor: '#451A03', wallColor: '#78350F' },

      { id: 'ms_mw1', x: 88, y: 380, width: 176, height: 148, kind: 'building', label: 'MOSSY WATCHTOWER', roofColor: '#1E293B', wallColor: '#334155' },
      { id: 'ms_mw2', x: 404, y: 380, width: 136, height: 148, kind: 'water_canal', label: 'MYSTIC SPRING' },
      { id: 'ms_mw3', x: 88, y: 672, width: 176, height: 148, kind: 'building', label: 'BLACKSMITH RUIN', roofColor: '#3B2F2F', wallColor: '#524141' },
      { id: 'ms_mw4', x: 404, y: 672, width: 136, height: 148, kind: 'building', label: 'ORACLE TEMPLE', roofColor: '#4C1D95', wallColor: '#6D28D9' },

      { id: 'ms_pc1', x: 660, y: 400, width: 108, height: 32, kind: 'fence' },
      { id: 'ms_pc2', x: 992, y: 400, width: 108, height: 32, kind: 'fence' },
      { id: 'ms_pc3', x: 660, y: 768, width: 108, height: 32, kind: 'fence' },
      { id: 'ms_pc4', x: 992, y: 768, width: 108, height: 32, kind: 'fence' },

      { id: 'ms_me1', x: 1220, y: 380, width: 136, height: 148, kind: 'water_canal', label: 'LILY PAD POND' },
      { id: 'ms_me2', x: 1492, y: 380, width: 176, height: 148, kind: 'building', label: 'HUNTER CABIN', roofColor: '#451A1C', wallColor: '#692629' },
      { id: 'ms_me3', x: 1220, y: 672, width: 136, height: 148, kind: 'building', label: 'POTION CELLAR', roofColor: '#1E3A3A', wallColor: '#285252' },
      { id: 'ms_me4', x: 1492, y: 672, width: 176, height: 148, kind: 'building', label: 'SUNKEN OBELISK', roofColor: '#1E293B', wallColor: '#334155' },

      { id: 'ms_sw1', x: 88, y: 964, width: 176, height: 152, kind: 'building', label: 'SOUTH GATEHOUSE', roofColor: '#27272A', wallColor: '#3F3F46' },
      { id: 'ms_sw2', x: 404, y: 964, width: 136, height: 152, kind: 'water_canal', label: 'ENCHANTED STREAM' },
      { id: 'ms_sc1', x: 644, y: 964, width: 164, height: 152, kind: 'water_canal', label: 'MIRROR LAGOON' },
      { id: 'ms_sc2', x: 948, y: 964, width: 164, height: 152, kind: 'water_canal', label: 'CRYSTAL BROOK' },
      { id: 'ms_se1', x: 1220, y: 964, width: 136, height: 152, kind: 'building', label: 'HERBALIST HUT', roofColor: '#14532D', wallColor: '#166534' },
      { id: 'ms_se2', x: 1492, y: 964, width: 176, height: 152, kind: 'building', label: 'RELIC VAULT', roofColor: '#2D2638', wallColor: '#433854' },
    ],
    props: [
      { id: 'msp_1', type: 'tree_green', x: 340, y: 90 },
      { id: 'msp_2', type: 'tree_autumn', x: 600, y: 370 },
      { id: 'msp_3', type: 'tree_green', x: 1120, y: 370 },
      { id: 'msp_4', type: 'tree_green', x: 600, y: 780 },
      { id: 'msp_5', type: 'tree_autumn', x: 1120, y: 780 },
      { id: 'msp_6', type: 'treasure_chest', x: 430, y: 114 },
      { id: 'msp_7', type: 'stone_shrine', x: 684, y: 110 },
      { id: 'msp_8', type: 'stone_shrine', x: 988, y: 110 },
      { id: 'msp_9', type: 'treasure_chest', x: 1250, y: 114 },
      { id: 'msp_10', type: 'water_rock', x: 446, y: 430 },
      { id: 'msp_11', type: 'water_rock', x: 1260, y: 430 },
      { id: 'msp_12', type: 'shiny_coin', x: 760, y: 490 },
      { id: 'msp_13', type: 'shiny_coin', x: 1000, y: 490 },
      { id: 'msp_14', type: 'exotic_fruit', x: 760, y: 700 },
      { id: 'msp_15', type: 'exotic_fruit', x: 1000, y: 700 },
    ],
    hidingSpots: [
      { id: 'ms_h1', type: 'treasure_chest_spot', label: 'Ranger Ironbound Chest', x: 350, y: 248, width: 34, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h2', type: 'ancient_shrine', label: 'Elder Runic Pillar', x: 590, y: 248, width: 36, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h3', type: 'bush', label: 'Apothecary Briar Thicket', x: 896, y: 248, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h4', type: 'treasure_chest_spot', label: 'Crypt Golden Coffer', x: 1168, y: 248, width: 34, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h5', type: 'cabinet_wardrobe', label: 'Keep Oak Armoury', x: 1436, y: 248, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h6', type: 'ancient_shrine', label: 'Watchtower Stone Monolith', x: 284, y: 336, width: 36, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h7', type: 'fountain_basin', label: 'Mystic Spring Well', x: 562, y: 336, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h8', type: 'bush', label: 'Sanctuary West Fern', x: 704, y: 452, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h9', type: 'bush', label: 'Sanctuary East Grove', x: 1024, y: 452, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h10', type: 'ancient_shrine', label: 'South Glade Stone Altar', x: 704, y: 712, width: 36, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h11', type: 'treasure_chest_spot', label: 'Sanctuary Relic Chest', x: 1024, y: 712, width: 34, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h12', type: 'fountain_basin', label: 'Lily Pond Basin', x: 1152, y: 540, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h13', type: 'large_crate', label: 'Hunter Timber Crate', x: 1436, y: 540, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h14', type: 'trash_bin', label: 'Blacksmith Quench Barrel', x: 284, y: 832, width: 32, height: 32, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h15', type: 'curtain_alcove', label: 'Oracle Tapestry Veil', x: 562, y: 832, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h16', type: 'cabinet_wardrobe', label: 'Potion Cellar Hutch', x: 1168, y: 832, width: 34, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h17', type: 'fountain_basin', label: 'Enchanted Stream Basin', x: 350, y: 916, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h18', type: 'fountain_basin', label: 'Mirror Lagoon Well', x: 590, y: 916, width: 38, height: 38, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h19', type: 'water_tunnel', label: 'Crystal Brook Culvert', x: 1144, y: 916, width: 36, height: 36, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
      { id: 'ms_h20', type: 'treasure_chest_spot', label: 'Relic Vault Royal Chest', x: 1436, y: 916, width: 38, height: 34, capacity: 1, canInspect: true, canEliminateOccupant: true, interactionRange: 68 },
    ],
    streetlights: [
      { x: 280, y: 256 },
      { x: 824, y: 256 },
      { x: 1368, y: 256 },
      { x: 680, y: 430 },
      { x: 1080, y: 430 },
      { x: 680, y: 770 },
      { x: 1080, y: 770 },
      { x: 280, y: 840 },
      { x: 1368, y: 840 },
    ],
  },
};


export type ObjectiveConfig = MapConfig['objective'];

/**
 * Secondary escape beacons. Hiders can transmit from ANY beacon, which forces seekers to
 * split their attention between the central plaza and a far-corner relay.
 * Positions were picked with a nav-clearance scan (60px wall-free radius, away from hiding spots).
 */
const EXTRA_OBJECTIVES: Record<MapId, ObjectiveConfig[]> = {
  downtown_plaza: [
    { id: 'relay_downtown_se', label: 'SE Rooftop Radio Relay', x: 1480, y: 840, radius: 30, interactionRange: 80 },
  ],
  harbor_district: [
    { id: 'relay_harbor_se', label: 'Dockside Lighthouse Relay', x: 1640, y: 900, radius: 30, interactionRange: 80 },
  ],
  modern_mall: [
    { id: 'relay_modern_se', label: 'Parking Deck Antenna Relay', x: 1480, y: 840, radius: 30, interactionRange: 80 },
  ],
  mystic_sanctuary: [
    { id: 'relay_mystic_se', label: 'Moonstone Waystone Relay', x: 1640, y: 900, radius: 30, interactionRange: 80 },
  ],
};

for (const id of Object.keys(EXTRA_OBJECTIVES) as MapId[]) {
  MAPS[id].extraObjectives = EXTRA_OBJECTIVES[id];
}

/** All escape beacons on a map: the central beacon first, then relays. */
export function getMapObjectives(map: MapConfig): ObjectiveConfig[] {
  return map.extraObjectives && map.extraObjectives.length > 0
    ? [map.objective, ...map.extraObjectives]
    : [map.objective];
}

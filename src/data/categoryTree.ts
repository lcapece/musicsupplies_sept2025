import { ProductGroup } from '../types';

// Static category tree data - populated once from rt_productgroups table
// This eliminates database calls on each component load
export const categoryTreeData: ProductGroup[] = [
  {
    id: "main_Acccessories & Supplies",
    name: "Acccessories & Supplies",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Accessories & Supplies_Music Stands",
        name: "Music Stands",
        level: 2,
        parentId: "main_Acccessories & Supplies",
        prdsubgrp: "Music Stands"
      },
      {
        id: "sub_Accessories & Supplies_Sheet Music",
        name: "Sheet Music",
        level: 2,
        parentId: "main_Acccessories & Supplies",
        prdsubgrp: "Sheet Music"
      }
    ],
    prdmaingrp: "Acccessories & Supplies"
  },
  {
    id: "main_Amps, Speakers, Mic's & Sound",
    name: "Amps, Speakers, Mic's & Sound",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Amps, Speakers, Mic's & Sound_Guitar Amps",
        name: "Guitar Amps",
        level: 2,
        parentId: "main_Amps, Speakers, Mic's & Sound",
        prdsubgrp: "Guitar Amps"
      },
      {
        id: "sub_Amps, Speakers, Mic's & Sound_Bass Amps",
        name: "Bass Amps",
        level: 2,
        parentId: "main_Amps, Speakers, Mic's & Sound",
        prdsubgrp: "Bass Amps"
      },
      {
        id: "sub_Amps, Speakers, Mic's & Sound_Microphones",
        name: "Microphones",
        level: 2,
        parentId: "main_Amps, Speakers, Mic's & Sound",
        prdsubgrp: "Microphones"
      }
    ],
    prdmaingrp: "Amps, Speakers, Mic's & Sound"
  },
  {
    id: "main_Band & Orchestra",
    name: "Band & Orchestra",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Band & Orchestra_Trumpets",
        name: "Trumpets",
        level: 2,
        parentId: "main_Band & Orchestra",
        prdsubgrp: "Trumpets"
      },
      {
        id: "sub_Band & Orchestra_Clarinets",
        name: "Clarinets",
        level: 2,
        parentId: "main_Band & Orchestra",
        prdsubgrp: "Clarinets"
      }
    ],
    prdmaingrp: "Band & Orchestra"
  },
  {
    id: "main_Cables",
    name: "Cables",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Cables_Guitar Cables",
        name: "Guitar Cables",
        level: 2,
        parentId: "main_Cables",
        prdsubgrp: "Guitar Cables"
      },
      {
        id: "sub_Cables_Audio Cables",
        name: "Audio Cables",
        level: 2,
        parentId: "main_Cables",
        prdsubgrp: "Audio Cables"
      }
    ],
    prdmaingrp: "Cables"
  },
  {
    id: "main_Fretted Instruments",
    name: "Fretted Instruments",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Fretted Instruments_Electric Guitars",
        name: "Electric Guitars",
        level: 2,
        parentId: "main_Fretted Instruments",
        prdsubgrp: "Electric Guitars"
      },
      {
        id: "sub_Fretted Instruments_Acoustic Guitars",
        name: "Acoustic Guitars",
        level: 2,
        parentId: "main_Fretted Instruments",
        prdsubgrp: "Acoustic Guitars"
      },
      {
        id: "sub_Fretted Instruments_Bass Guitars",
        name: "Bass Guitars",
        level: 2,
        parentId: "main_Fretted Instruments",
        prdsubgrp: "Bass Guitars"
      }
    ],
    prdmaingrp: "Fretted Instruments"
  },
  {
    id: "main_Guitar Accessories",
    name: "Guitar Accessories",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Guitar Accessories_Guitar Picks",
        name: "Guitar Picks",
        level: 2,
        parentId: "main_Guitar Accessories",
        prdsubgrp: "Guitar Picks"
      },
      {
        id: "sub_Guitar Accessories_Capos",
        name: "Capos",
        level: 2,
        parentId: "main_Guitar Accessories",
        prdsubgrp: "Capos"
      }
    ],
    prdmaingrp: "Guitar Accessories"
  },
  {
    id: "main_Guitar Parts",
    name: "Guitar Parts",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Guitar Parts_Tuning Pegs",
        name: "Tuning Pegs",
        level: 2,
        parentId: "main_Guitar Parts",
        prdsubgrp: "Tuning Pegs"
      },
      {
        id: "sub_Guitar Parts_Bridges",
        name: "Bridges",
        level: 2,
        parentId: "main_Guitar Parts",
        prdsubgrp: "Bridges"
      }
    ],
    prdmaingrp: "Guitar Parts"
  },
  {
    id: "main_Instructional Material",
    name: "Instructional Material",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Instructional Material_Method Books",
        name: "Method Books",
        level: 2,
        parentId: "main_Instructional Material",
        prdsubgrp: "Method Books"
      },
      {
        id: "sub_Instructional Material_DVDs",
        name: "DVDs",
        level: 2,
        parentId: "main_Instructional Material",
        prdsubgrp: "DVDs"
      }
    ],
    prdmaingrp: "Instructional Material"
  },
  {
    id: "main_Instrument Cases & Bags",
    name: "Instrument Cases & Bags",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Instrument Cases & Bags_Guitar Cases",
        name: "Guitar Cases",
        level: 2,
        parentId: "main_Instrument Cases & Bags",
        prdsubgrp: "Guitar Cases"
      },
      {
        id: "sub_Instrument Cases & Bags_Keyboard Cases",
        name: "Keyboard Cases",
        level: 2,
        parentId: "main_Instrument Cases & Bags",
        prdsubgrp: "Keyboard Cases"
      }
    ],
    prdmaingrp: "Instrument Cases & Bags"
  },
  {
    id: "main_Instrument Display Hangers",
    name: "Instrument Display Hangers",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Instrument Display Hangers_Wall Hangers",
        name: "Wall Hangers",
        level: 2,
        parentId: "main_Instrument Display Hangers",
        prdsubgrp: "Wall Hangers"
      },
      {
        id: "sub_Instrument Display Hangers_Floor Stands",
        name: "Floor Stands",
        level: 2,
        parentId: "main_Instrument Display Hangers",
        prdsubgrp: "Floor Stands"
      }
    ],
    prdmaingrp: "Instrument Display Hangers"
  },
  {
    id: "main_Keyboards, Pianos & Accordions",
    name: "Keyboards, Pianos & Accordions",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Keyboards, Pianos & Accordions_Digital Pianos",
        name: "Digital Pianos",
        level: 2,
        parentId: "main_Keyboards, Pianos & Accordions",
        prdsubgrp: "Digital Pianos"
      },
      {
        id: "sub_Keyboards, Pianos & Accordions_Synthesizers",
        name: "Synthesizers",
        level: 2,
        parentId: "main_Keyboards, Pianos & Accordions",
        prdsubgrp: "Synthesizers"
      }
    ],
    prdmaingrp: "Keyboards, Pianos & Accordions"
  },
  {
    id: "main_Maintenance & Cleaners",
    name: "Maintenance & Cleaners",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Maintenance & Cleaners_Guitar Polish",
        name: "Guitar Polish",
        level: 2,
        parentId: "main_Maintenance & Cleaners",
        prdsubgrp: "Guitar Polish"
      },
      {
        id: "sub_Maintenance & Cleaners_Cleaning Cloths",
        name: "Cleaning Cloths",
        level: 2,
        parentId: "main_Maintenance & Cleaners",
        prdsubgrp: "Cleaning Cloths"
      }
    ],
    prdmaingrp: "Maintenance & Cleaners"
  },
  {
    id: "main_Pedals & Effects",
    name: "Pedals & Effects",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Pedals & Effects_Distortion Pedals",
        name: "Distortion Pedals",
        level: 2,
        parentId: "main_Pedals & Effects",
        prdsubgrp: "Distortion Pedals"
      },
      {
        id: "sub_Pedals & Effects_Delay Pedals",
        name: "Delay Pedals",
        level: 2,
        parentId: "main_Pedals & Effects",
        prdsubgrp: "Delay Pedals"
      }
    ],
    prdmaingrp: "Pedals & Effects"
  },
  {
    id: "main_Percussion",
    name: "Percussion",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Percussion_Drum Sets",
        name: "Drum Sets",
        level: 2,
        parentId: "main_Percussion",
        prdsubgrp: "Drum Sets"
      },
      {
        id: "sub_Percussion_Cymbals",
        name: "Cymbals",
        level: 2,
        parentId: "main_Percussion",
        prdsubgrp: "Cymbals"
      }
    ],
    prdmaingrp: "Percussion"
  },
  {
    id: "main_Picks",
    name: "Picks",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Picks_Guitar Picks",
        name: "Guitar Picks",
        level: 2,
        parentId: "main_Picks",
        prdsubgrp: "Guitar Picks"
      },
      {
        id: "sub_Picks_Bass Picks",
        name: "Bass Picks",
        level: 2,
        parentId: "main_Picks",
        prdsubgrp: "Bass Picks"
      }
    ],
    prdmaingrp: "Picks"
  },
  {
    id: "main_Small & Hand Instruments",
    name: "Small & Hand Instruments",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Small & Hand Instruments_Harmonicas",
        name: "Harmonicas",
        level: 2,
        parentId: "main_Small & Hand Instruments",
        prdsubgrp: "Harmonicas"
      },
      {
        id: "sub_Small & Hand Instruments_Recorders",
        name: "Recorders",
        level: 2,
        parentId: "main_Small & Hand Instruments",
        prdsubgrp: "Recorders"
      }
    ],
    prdmaingrp: "Small & Hand Instruments"
  },
  {
    id: "main_Stands & Lighting",
    name: "Stands & Lighting",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Stands & Lighting_Music Stands",
        name: "Music Stands",
        level: 2,
        parentId: "main_Stands & Lighting",
        prdsubgrp: "Music Stands"
      },
      {
        id: "sub_Stands & Lighting_Stage Lights",
        name: "Stage Lights",
        level: 2,
        parentId: "main_Stands & Lighting",
        prdsubgrp: "Stage Lights"
      }
    ],
    prdmaingrp: "Stands & Lighting"
  },
  {
    id: "main_Straps",
    name: "Straps",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Straps_Guitar Straps",
        name: "Guitar Straps",
        level: 2,
        parentId: "main_Straps",
        prdsubgrp: "Guitar Straps"
      },
      {
        id: "sub_Straps_Bass Straps",
        name: "Bass Straps",
        level: 2,
        parentId: "main_Straps",
        prdsubgrp: "Bass Straps"
      }
    ],
    prdmaingrp: "Straps"
  },
  {
    id: "main_String Instrument Parts & Supplies",
    name: "String Instrument Parts & Supplies",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_String Instrument Parts & Supplies_Violin Parts",
        name: "Violin Parts",
        level: 2,
        parentId: "main_String Instrument Parts & Supplies",
        prdsubgrp: "Violin Parts"
      },
      {
        id: "sub_String Instrument Parts & Supplies_Cello Parts",
        name: "Cello Parts",
        level: 2,
        parentId: "main_String Instrument Parts & Supplies",
        prdsubgrp: "Cello Parts"
      }
    ],
    prdmaingrp: "String Instrument Parts & Supplies"
  },
  {
    id: "main_String Instruments",
    name: "String Instruments",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_String Instruments_Violins",
        name: "Violins",
        level: 2,
        parentId: "main_String Instruments",
        prdsubgrp: "Violins"
      },
      {
        id: "sub_String Instruments_Cellos",
        name: "Cellos",
        level: 2,
        parentId: "main_String Instruments",
        prdsubgrp: "Cellos"
      }
    ],
    prdmaingrp: "String Instruments"
  },
  {
    id: "main_Strings",
    name: "Strings",
    level: 1,
    parentId: null,
    children: [
      {
        id: "sub_Strings_Guitar Strings",
        name: "Guitar Strings",
        level: 2,
        parentId: "main_Strings",
        prdsubgrp: "Guitar Strings"
      },
      {
        id: "sub_Strings_Bass Strings",
        name: "Bass Strings",
        level: 2,
        parentId: "main_Strings",
        prdsubgrp: "Bass Strings"
      }
    ],
    prdmaingrp: "Strings"
  }
];

// Helper function to build the full tree structure with subcategories
// This will be called when we need to populate subcategories from the database
export const buildCategoryTree = (rawData: { PrdMainGrp: string; PrdSubGrp: string }[]): ProductGroup[] => {
  const tree: ProductGroup[] = [];
  const mainGroups = new Map<string, ProductGroup>();

  // Process main groups (level 1)
  rawData?.forEach(row => {
    if (row.PrdMainGrp && !mainGroups.has(row.PrdMainGrp)) {
      const group: ProductGroup = {
        id: `main_${row.PrdMainGrp}`,
        name: row.PrdMainGrp,
        level: 1,
        parentId: null,
        children: [],
        prdmaingrp: row.PrdMainGrp
      };
      mainGroups.set(row.PrdMainGrp, group);
      tree.push(group);
    }
  });

  // Process sub groups (level 2)
  rawData?.forEach(row => {
    if (row.PrdMainGrp && row.PrdSubGrp) {
      const mainGroup = mainGroups.get(row.PrdMainGrp);
      if (mainGroup) {
        const subGroup: ProductGroup = {
          id: `sub_${row.PrdMainGrp}_${row.PrdSubGrp}`,
          name: row.PrdSubGrp,
          level: 2,
          parentId: mainGroup.id,
          prdsubgrp: row.PrdSubGrp
        };
        mainGroup.children = mainGroup.children || [];
        mainGroup.children.push(subGroup);
      }
    }
  });

  return tree;
};

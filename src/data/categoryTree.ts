import { ProductGroup } from '../types';

// Static category tree data - populated once from rt_productgroups table
// This eliminates database calls on each component load
export const categoryTreeData: ProductGroup[] = [
  {
    id: "main_Acccessories & Supplies",
    name: "Acccessories & Supplies",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Acccessories & Supplies"
  },
  {
    id: "main_Amps, Speakers, Mic's & Sound",
    name: "Amps, Speakers, Mic's & Sound",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Amps, Speakers, Mic's & Sound"
  },
  {
    id: "main_Band & Orchestra",
    name: "Band & Orchestra",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Band & Orchestra"
  },
  {
    id: "main_Cables",
    name: "Cables",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Cables"
  },
  {
    id: "main_Fretted Instruments",
    name: "Fretted Instruments",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Fretted Instruments"
  },
  {
    id: "main_Guitar Accessories",
    name: "Guitar Accessories",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Guitar Accessories"
  },
  {
    id: "main_Guitar Parts",
    name: "Guitar Parts",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Guitar Parts"
  },
  {
    id: "main_Instructional Material",
    name: "Instructional Material",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Instructional Material"
  },
  {
    id: "main_Instrument Cases & Bags",
    name: "Instrument Cases & Bags",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Instrument Cases & Bags"
  },
  {
    id: "main_Instrument Display Hangers",
    name: "Instrument Display Hangers",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Instrument Display Hangers"
  },
  {
    id: "main_Keyboards, Pianos & Accordions",
    name: "Keyboards, Pianos & Accordions",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Keyboards, Pianos & Accordions"
  },
  {
    id: "main_Maintenance & Cleaners",
    name: "Maintenance & Cleaners",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Maintenance & Cleaners"
  },
  {
    id: "main_Pedals & Effects",
    name: "Pedals & Effects",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Pedals & Effects"
  },
  {
    id: "main_Percussion",
    name: "Percussion",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Percussion"
  },
  {
    id: "main_Picks",
    name: "Picks",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Picks"
  },
  {
    id: "main_Small & Hand Instruments",
    name: "Small & Hand Instruments",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Small & Hand Instruments"
  },
  {
    id: "main_Stands & Lighting",
    name: "Stands & Lighting",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Stands & Lighting"
  },
  {
    id: "main_Straps",
    name: "Straps",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "Straps"
  },
  {
    id: "main_String Instrument Parts & Supplies",
    name: "String Instrument Parts & Supplies",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "String Instrument Parts & Supplies"
  },
  {
    id: "main_String Instruments",
    name: "String Instruments",
    level: 1,
    parentId: null,
    children: [],
    prdmaingrp: "String Instruments"
  },
  {
    id: "main_Strings",
    name: "Strings",
    level: 1,
    parentId: null,
    children: [],
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

import { Race } from "@prisma/client";

export const MEMBER_RACE_OPTIONS = [Race.ACCRETIA, Race.CORA, Race.BELLATO] as const;

const BASE_CLASS_OPTIONS = ["Ranger", "Warrior", "Specialist"] as const;
const MAGIC_CLASS_OPTIONS = [...BASE_CLASS_OPTIONS, "Mage"] as const;

export function getClassOptionsForRace(race: Race) {
  return race === Race.ACCRETIA ? [...BASE_CLASS_OPTIONS] : [...MAGIC_CLASS_OPTIONS];
}

export function isValidClassForRace(race: Race, className: string) {
  return getClassOptionsForRace(race).includes(className as (typeof MAGIC_CLASS_OPTIONS)[number]);
}

/**
 * Daily missions for the hens. One per day, picked deterministically so the
 * whole party sees the same mission on the same day.
 *
 * Aim for: specific, cheeky, accomplishable in a Dublin bar, family-rated.
 */
export const MISSIONS: string[] = [
  "Compliment a stranger's outfit, properly.",
  "Toast Mark — in his absence.",
  "Find the bar with the best wallpaper.",
  "Order the bartender's pick.",
  "Get a photo with a Garda.",
  "Sing one full song. Badly is allowed.",
  "Tip the barman unreasonably.",
  "Locate the room with the best mirror.",
  "Make a friend at the bar; learn their name.",
  "Walk Grafton Street arm-in-arm with someone new.",
  "Find the oldest pub still standing.",
  "Refuse one drink, mysteriously.",
  "Buy Grace a flower from a stranger.",
  "Order the dessert nobody else has tried.",
  "Find a bartender who claims to know Mark.",
  "Demand the most martini-shaped martini in the city.",
  "Vote for the most outrageous toast of the night.",
  "Convince a passing Dub to predict the wedding venue.",
  "Discover the second-best Negroni in Dublin.",
  "Persuade someone to dance, without music.",
  "Send Mark exactly one photo. No more.",
  "Buy a round you wouldn't normally.",
  "Find a song that makes Grace cry — in a good way.",
  "Successfully whistle for a taxi.",
  "Memorise the cocktail menu of the most-difficult bar.",
  "Convince the table beside you that you're celebrities.",
  "Trade a sash for a story from a stranger.",
  "Photograph the back of every doorman's head.",
];

export function pickMissionForDate(date: Date = new Date()): string {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return MISSIONS[Math.abs(hash) % MISSIONS.length];
}

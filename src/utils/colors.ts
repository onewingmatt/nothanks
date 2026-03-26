/**
 * Maps a card value (3-35) to a pleasing, tactile HSL color gradient.
 * Moving from a deep, warm red at 3, through magenta, to a deep navy blue at 35.
 * We keep saturation relatively high and lightness relatively low (dark, premium inks).
 */
export function getCardColor(value: number): string {
  const minVal = 3;
  const maxVal = 35;
  const clamped = Math.max(minVal, Math.min(maxVal, value));
  
  // Normalize value between 0 and 1
  const pct = (clamped - minVal) / (maxVal - minVal);
  
  // Hue ranges roughly from 5 (Deep Red) to 240 (Navy)
  const startHue = 5; 
  const endHue = 240; 
  
  const hue = startHue + pct * (endHue - startHue);
  
  // Dark, authoritative jewel tones — slightly lighter for white card backgrounds
  const sat = 82; 
  const light = 32; 

  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

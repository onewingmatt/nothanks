import { getCardColor } from './colors.ts';

const errors: string[] = [];

function assertEquals(desc: string, actual: any, expected: any) {
  if (actual !== expected) {
    errors.push(`FAIL: ${desc} -> Expected '${expected}', got '${actual}'`);
  } else {
    console.log(`PASS: ${desc} -> '${actual}'`);
  }
}

console.log("--- Testing getCardColor ---");

// Boundary values
assertEquals("Value 3 (min boundary)", getCardColor(3), "hsl(5, 85%, 25%)");
assertEquals("Value 35 (max boundary)", getCardColor(35), "hsl(240, 85%, 25%)");

// Below min
assertEquals("Value 0 (below min)", getCardColor(0), "hsl(5, 85%, 25%)");
assertEquals("Value -10 (below min)", getCardColor(-10), "hsl(5, 85%, 25%)");

// Above max
assertEquals("Value 36 (above max)", getCardColor(36), "hsl(240, 85%, 25%)");
assertEquals("Value 100 (above max)", getCardColor(100), "hsl(240, 85%, 25%)");

// Within range
// 19 is exactly in the middle of 3 and 35: (19-3)/(35-3) = 16/32 = 0.5
// Hue = 5 + 0.5 * (240 - 5) = 5 + 117.5 = 122.5
assertEquals("Value 19 (middle)", getCardColor(19), "hsl(122.5, 85%, 25%)");

// Value 11: pct = (11-3)/32 = 8/32 = 0.25
// Hue = 5 + 0.25 * 235 = 5 + 58.75 = 63.75
assertEquals("Value 11 (quarter)", getCardColor(11), "hsl(63.75, 85%, 25%)");

if (errors.length > 0) {
  console.error("\n--- FAILURES ---");
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED SUCCESSFULLY!");
}

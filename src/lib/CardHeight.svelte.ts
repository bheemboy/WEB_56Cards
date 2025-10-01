import { setContext } from "svelte";

export const ASPECT_RATIO: number = 140 / 190;

// Define a unique key for the context
export const cardHeightContextKey = Symbol("cardHeightContext");
export interface CardHeightContext {
  h: number;
}
const deckCardHeightContext: CardHeightContext = $state({ h: 0 });

export function setDeckCardHeight(h: number) {
  deckCardHeightContext.h = h;
  setContext(cardHeightContextKey, deckCardHeightContext);
}

// Helper function to convert degrees to radians
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the height 'h' based on the final rightmost X-coordinate,
 * where translation is a fraction of the width.
 * @param rotationDegrees - Clockwise rotation in degrees (< 45).
 * @param translationFraction - Translation distance 'p' as a fraction of the width (e.g., 0.6 for 60%).
 * @param X - The X-coordinate of the rightmost point after transformations.
 * @returns The calculated height 'h'.
 */
function getHeightFromX_Fractional(rotationDegrees: number, translationFraction: number, X: number): number {
  if (X === 0) return 0; // Handle trivial case or case where object might be on Y axis
  if (translationFraction < 0) {
    console.warn("translationFraction is typically non-negative.");
  }

  const p = translationFraction;
  const thetaRad = degreesToRadians(rotationDegrees);
  const cosTheta = Math.cos(thetaRad);
  const sinTheta = Math.sin(thetaRad);

  const denominator = ASPECT_RATIO * (0.5 + p) * cosTheta + sinTheta;

  if (Math.abs(denominator) < 1e-10) {
    console.error("Error in getHeightFromX_Fractional: Denominator is too close to zero. Check inputs.");
    return NaN; // Avoid division by zero
  }

  const h = X / denominator;
  return h >= 0 ? h : NaN; // Height cannot be negative
}

/**
 * Calculates the height 'h' based on the final bottommost Y-coordinate,
 * where translation is a fraction of the width.
 * @param rotationDegrees - Clockwise rotation in degrees (< 45).
 * @param translationFraction - Translation distance 'p' as a fraction of the width (e.g., 0.6 for 60%).
 * @param Y - The Y-coordinate of the bottommost point after transformations.
 * @returns The calculated height 'h'.
 */
function getHeightFromY_Fractional(rotationDegrees: number, translationFraction: number, Y: number): number {
  if (Y === 0) return 0; // Handle trivial case where object might be on X axis
  if (translationFraction < 0) {
    console.warn("translationFraction is typically non-negative.");
  }

  const p = translationFraction;
  const thetaRad = degreesToRadians(rotationDegrees);
  const sinTheta = Math.sin(thetaRad);

  const denominator = 1 + ASPECT_RATIO * (0.5 + p) * sinTheta;

  if (Math.abs(denominator) < 1e-10) {
    // Denominator should be > 1 for typical inputs
    console.error("Error in getHeightFromY_Fractional: Denominator is too close to zero. Check inputs.");
    return NaN;
  }

  const h = -Y / denominator;
  return h >= 0 ? h : NaN; // Height cannot be negative
}

/**
 * Calculates the card height 'h' using the minimum of the heights derived
 * from X and Y, assuming fractional translation.
 * @param rotationDegrees - Clockwise rotation in degrees (< 45).
 * @param translationFraction - Translation distance 'p' as a fraction of the width (e.g., 0.6 for 60%).
 * @param X - The X-coordinate of the rightmost point after transformations.
 * @param Y - The Y-coordinate of the bottommost point after transformations.
 * @returns The calculated height 'h', or NaN if calculation fails.
 */
export function getCardHeight_Fractional(rotationDegrees: number, translationFraction: number, X: number, Y: number): number {
  const hFromX = getHeightFromX_Fractional(rotationDegrees, translationFraction, X);
  const hFromY = getHeightFromY_Fractional(rotationDegrees, translationFraction, Y);

  // console.log(` Intermediate hFromX: ${hFromX?.toFixed(6)}, hFromY: ${hFromY?.toFixed(6)}`);

  // Check if either calculation resulted in NaN
  if (isNaN(hFromX) && isNaN(hFromY)) {
    console.error("Both height calculations failed.");
    return NaN;
  }
  if (isNaN(hFromX)) {
    console.warn("getHeightFromX failed, using hFromY.");
    return hFromY;
  }
  if (isNaN(hFromY)) {
    console.warn("getHeightFromY failed, using hFromX.");
    return hFromX;
  }

  // If X and Y are perfectly consistent, hFromX and hFromY should be almost identical.
  // Taking the minimum provides some robustness, but averaging might also be reasonable.
  // Let's stick with minimum for consistency with the original request.
  //  if (Math.abs(hFromX - hFromY) > 1e-6 * Math.max(Math.abs(hFromX), Math.abs(hFromY))) {
  //      console.warn(`Significant difference between hFromX (${hFromX}) and hFromY (${hFromY}). Inputs X/Y might be inconsistent for the given rotation/translationFraction.`);
  //  }

  return Math.min(hFromX, hFromY);
}

// // ----- Updated Test Scenarios -----

// // Function to calculate theoretical X and Y for given parameters (using fractional translation)
// function calculateTheoreticalXY_Fractional(h: number, rotationDegrees: number, translationFraction: number): { X: number; Y: number } {
//     const w = ASPECT_RATIO * h;
//     const p = translationFraction;
//     // const t = p * w; // effective absolute distance (not directly needed for final formula)
//     const thetaRad = degreesToRadians(rotationDegrees);
//     const cosTheta = Math.cos(thetaRad);
//     const sinTheta = Math.sin(thetaRad);

//     // Use the combined formulas derived in Step 1
//     const X = h * (ASPECT_RATIO * (0.5 + p) * cosTheta + sinTheta);
//     const Y = h * (-1 - ASPECT_RATIO * (0.5 + p) * sinTheta);

//     return { X, Y };
// }

// console.log("--- Starting Test Scenarios (Fractional Translation) ---");

// const testRotationFrac = 40; // degrees
// const testTranslationFrac = 0.6; // 60% of width
// const testHeightsFrac = [50, 100, 200, 300];

// testHeightsFrac.forEach((testH) => {
//   console.log(`\n--- Testing with Height = ${testH} ---`);
//   const { X: theoreticalX, Y: theoreticalY } = calculateTheoreticalXY_Fractional(testH, testRotationFrac, testTranslationFrac);
//   const width = ASPECT_RATIO * testH;
//   const effectiveT = testTranslationFrac * width;

//   console.log(` Theoretical Width: ${width.toFixed(4)}`);
//   console.log(` Effective Translation Distance (t): ${effectiveT.toFixed(4)}`);
//   console.log(` Theoretical X (Rightmost): ${theoreticalX.toFixed(4)}`);
//   console.log(` Theoretical Y (Bottommost): ${theoreticalY.toFixed(4)}`);

//   const calculatedH = getCardHeight_Fractional(testRotationFrac, testTranslationFrac, theoreticalX, theoreticalY);

//   console.log(` Calculated Height: ${calculatedH.toFixed(4)}`);
//   console.log(` Original Height:   ${testH.toFixed(4)}`);
//   console.log(` Difference:        ${Math.abs(calculatedH - testH).toFixed(10)}`);

//   // Sanity Checks
//    if (!isNaN(calculatedH)) {
//       const { X: checkX, Y: checkY } = calculateTheoreticalXY_Fractional(calculatedH, testRotationFrac, testTranslationFrac);
//       console.log(` Sanity Check: calculated X matches theoretical X? ${Math.abs(checkX - theoreticalX) < 1e-9}`);
//       console.log(` Sanity Check: calculated Y matches theoretical Y? ${Math.abs(checkY - theoreticalY) < 1e-9}`);

//       // Check |Y| > h?
//       console.log(` Check |Y| > h? ${Math.abs(theoreticalY).toFixed(4)} > ${calculatedH.toFixed(4)}? ${Math.abs(theoreticalY) > calculatedH}`);

//    } else {
//        console.log(" Height calculation failed, skipping sanity checks.");
//    }
// });
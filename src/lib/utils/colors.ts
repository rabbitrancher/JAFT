/**
 * Generates a color palette based on a primary color.
 *
 * The palette will consist of a specified number of colors, with the primary color at the start and
 * gradually fading towards white.
 *
 * @param {string} primary The primary color in hexadecimal format (e.g., "#ffffff").
 * @param {number} length The number of colors to generate in the palette.
 * @returns {string[]} An array of colors in the palette, represented as RGB strings (e.g., "rgb(255, 0, 0)").
 */
export function generatePalette(primary: string, length: number): string[] {
	const { r, g, b } = hexToRgb(primary);

	return Array.from({ length }, (_, i) => {
		// Fade toward white as the index increases.
		const factor = i / Math.max(length - 1, 1);

		const nr = Math.round(r + (255 - r) * factor * 0.65);
		const ng = Math.round(g + (255 - g) * factor * 0.65);
		const nb = Math.round(b + (255 - b) * factor * 0.65);

		return `rgb(${nr}, ${ng}, ${nb})`;
	});
}

/**
 * Converts a hexadecimal color to an RGB object.
 *
 * @param {string} hex The hexadecimal color (e.g., "#ffffff").
 * @returns {Object} An object with the properties r, g, and b, representing the red, green, and blue color values, respectively.
 */
export function hexToRgb(hex: string) {
	const clean = hex.replace("#", "");

	const bigint = parseInt(clean, 16);

	return {
		r: (bigint >> 16) & 255,
		g: (bigint >> 8) & 255,
		b: bigint & 255,
	};
}

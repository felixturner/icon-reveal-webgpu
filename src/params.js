// Tuned defaults for the glass shape, refraction and icon. The timeline tweens
// some of these (halfSize, shapePow, depth, ior, iconWidth) every frame.
export const params = {
  // glass shape
  halfSize: 0.262,
  depth: 0.104, // half thickness of the slab
  shapePow: 4.69, // superellipse exponent: 2 = circle, ~5 = squircle
  edgeRound: 0.24, // profile exponent: 1 = dome, small = flat slab with rounded edge
  // refraction
  refraction: 'custom', // 'custom' spectral node or 'three' built-in transmission
  ior: 1.807,
  thickness: 0.574,
  dispersion: -20, // negative = blue inside, red on the outer edge (like the ref)
  hue: 0,
  spectrumRange: 0.667, // red / green / blue at low / mid / high ior, like three
  bandSharpness: 3.64, // narrows each tap's colour band = more saturated fringes
  saturation: 1.43,
  hueDirAmount: 0, // hue offset by edge facing direction
  hueDirAngle: 30, // degrees; edges facing this way get +amount, opposite side -amount
  edgeThin: 1, // 0 = constant thickness, 1 = thickness falls to 0 at the rim (no icon outline)
  fresnel: 0, // how much refraction fades out at grazing angles (0 = never, keeps edges light)
  // icon
  iconWidth: 0.5,
  mode: 'WB', // 'WB' black on white, 'BW' white on black
};

// Per-mode look: BW flips the dispersion colours, less specular, brighter icon
export const modeSettings = {
  WB: { dispersionSign: -1, specularIntensity: 0.79, brightness: -0.475 },
  BW: { dispersionSign: 1, specularIntensity: 0.15, brightness: 0.1 },
};

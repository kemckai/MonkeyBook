const FUR_COLORS = [
  '#8B4513', '#A0522D', '#6B3A2A', '#D2691E', '#CD853F',
  '#4A2C17', '#2F1B0E', '#C4A35A', '#E8C07A', '#7A5230',
  '#3D3D3D', '#F5DEB3', '#B87333', '#A67B5B', '#5C4033'
];

const FACE_COLORS = [
  '#FFDAB9', '#F5C99E', '#E8B887', '#D4A574', '#C49A6C',
  '#F0D5A8', '#FFE4C4', '#DEB887', '#EECD9A', '#E6C08A'
];

const EXPRESSIONS = ['neutral', 'angry', 'smirk', 'manic', 'scowl', 'sneer'];

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateAvatarSVG(seed) {
  const rng = seededRandom(seed);
  const furColor = pick(FUR_COLORS, rng);
  const faceColor = pick(FACE_COLORS, rng);
  const expression = pick(EXPRESSIONS, rng);
  const earSize = 14 + Math.floor(rng() * 8);
  const hasSpot = rng() > 0.6;
  const spotX = 25 + Math.floor(rng() * 15);
  const spotY = 15 + Math.floor(rng() * 10);

  let mouthPath;
  switch (expression) {
    case 'angry':
      mouthPath = '<path d="M 28 52 Q 36 48 44 52" stroke="#3D2817" stroke-width="2" fill="none"/>';
      break;
    case 'smirk':
      mouthPath = '<path d="M 30 50 Q 38 56 44 49" stroke="#3D2817" stroke-width="2" fill="none"/>';
      break;
    case 'manic':
      mouthPath = '<path d="M 27 49 Q 36 60 45 49" stroke="#3D2817" stroke-width="2" fill="none"/><path d="M 30 52 L 32 50 L 34 52 L 36 50 L 38 52 L 40 50 L 42 52" stroke="#FFF" stroke-width="1" fill="none"/>';
      break;
    case 'scowl':
      mouthPath = '<path d="M 29 53 Q 36 47 43 53" stroke="#3D2817" stroke-width="2.5" fill="none"/>';
      break;
    case 'sneer':
      mouthPath = '<path d="M 30 50 Q 34 54 38 50 Q 42 54 44 51" stroke="#3D2817" stroke-width="2" fill="none"/>';
      break;
    default:
      mouthPath = '<path d="M 30 51 L 42 51" stroke="#3D2817" stroke-width="2" fill="none"/>';
  }

  let eyebrowAngle = '';
  if (['angry', 'scowl'].includes(expression)) {
    eyebrowAngle = '<line x1="26" y1="32" x2="32" y2="34" stroke="#3D2817" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="34" x2="46" y2="32" stroke="#3D2817" stroke-width="2" stroke-linecap="round"/>';
  } else if (expression === 'manic') {
    eyebrowAngle = '<line x1="26" y1="34" x2="32" y2="31" stroke="#3D2817" stroke-width="2" stroke-linecap="round"/><line x1="40" y1="31" x2="46" y2="34" stroke="#3D2817" stroke-width="2" stroke-linecap="round"/>';
  }

  const spot = hasSpot ? `<circle cx="${spotX}" cy="${spotY}" r="6" fill="${faceColor}" opacity="0.4"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <circle cx="36" cy="36" r="34" fill="${furColor}"/>
  ${spot}
  <circle cx="${36 - earSize}" cy="18" r="${earSize - 2}" fill="${furColor}" stroke="${faceColor}" stroke-width="2"/>
  <circle cx="${36 + earSize}" cy="18" r="${earSize - 2}" fill="${furColor}" stroke="${faceColor}" stroke-width="2"/>
  <circle cx="${36 - earSize}" cy="18" r="${earSize - 7}" fill="${faceColor}"/>
  <circle cx="${36 + earSize}" cy="18" r="${earSize - 7}" fill="${faceColor}"/>
  <ellipse cx="36" cy="42" rx="18" ry="20" fill="${faceColor}"/>
  <circle cx="30" cy="38" r="3" fill="#1a1a1a"/>
  <circle cx="42" cy="38" r="3" fill="#1a1a1a"/>
  <circle cx="31" cy="37" r="1" fill="#FFF"/>
  <circle cx="43" cy="37" r="1" fill="#FFF"/>
  <ellipse cx="36" cy="45" rx="5" ry="3.5" fill="#3D2817" opacity="0.6"/>
  <circle cx="34" cy="44" r="1.2" fill="#1a1a1a"/>
  <circle cx="38" cy="44" r="1.2" fill="#1a1a1a"/>
  ${eyebrowAngle}
  ${mouthPath}
</svg>`;
}

module.exports = { generateAvatarSVG };

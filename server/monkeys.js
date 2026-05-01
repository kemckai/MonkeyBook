const adjectives = [
  'Grumpy', 'Snarky', 'Chaotic', 'Cranky', 'Surly',
  'Salty', 'Moody', 'Savage', 'Shady', 'Petty',
  'Bitter', 'Feral', 'Unhinged', 'Dramatic', 'Reckless',
  'Ruthless', 'Vicious', 'Wicked', 'Sneaky', 'Devious',
  'Brooding', 'Spiteful', 'Rowdy', 'Menacing', 'Toxic',
  'Rabid', 'Maniacal', 'Vengeful', 'Diabolical', 'Volatile'
];

const species = [
  'Capuchin', 'Howler', 'Mandrill', 'Baboon', 'Macaque',
  'Tamarin', 'Gibbon', 'Marmoset', 'Langur', 'Tarsier',
  'Lemur', 'Chimp', 'Gorilla', 'Orangutan', 'Bonobo',
  'Colobus', 'Vervet', 'Uakari', 'Saki', 'Gelada'
];

const emojis = ['🐒', '🐵', '🙈', '🙉', '🙊', '🦍', '🦧'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMonkeyIdentity() {
  return {
    name: `${pick(adjectives)} ${pick(species)}`,
    emoji: pick(emojis)
  };
}

module.exports = { generateMonkeyIdentity };

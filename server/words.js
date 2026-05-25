const words = [
  // Animals
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'snake',
  'rabbit', 'horse', 'lion', 'monkey', 'fish', 'bird', 'spider', 'frog', 'whale',
  'turtle', 'chicken', 'dinosaur', 'shark', 'octopus', 'bear', 'cow', 'pig',

  // Food
  'pizza', 'hamburger', 'ice cream', 'banana', 'apple', 'cake', 'cookie', 'sandwich',
  'spaghetti', 'hotdog', 'watermelon', 'popcorn', 'egg', 'cheese', 'bread', 'carrot',
  'chocolate', 'pancake', 'donut', 'taco',

  // Objects
  'house', 'car', 'bicycle', 'airplane', 'umbrella', 'guitar', 'piano', 'camera',
  'computer', 'telephone', 'television', 'clock', 'lamp', 'chair', 'table', 'bed',
  'book', 'key', 'scissors', 'glasses', 'hat', 'shoe', 'balloon', 'candle', 'ladder',
  'hammer', 'sword', 'crown', 'rocket', 'robot',

  // Nature
  'sun', 'moon', 'star', 'rainbow', 'mountain', 'tree', 'flower', 'cloud',
  'volcano', 'island', 'river', 'waterfall', 'snowflake', 'lightning', 'tornado',
  'cactus', 'mushroom', 'leaf',

  // People & body
  'baby', 'witch', 'pirate', 'ninja', 'zombie', 'ghost', 'angel', 'mermaid',
  'eye', 'hand', 'heart', 'brain', 'skeleton',

  // Activities
  'swimming', 'skiing', 'dancing', 'fishing', 'camping', 'surfing', 'bowling',
  'skateboarding', 'painting', 'cooking',

  // Places
  'beach', 'castle', 'hospital', 'school', 'church', 'prison', 'lighthouse',
  'pyramid', 'igloo', 'tent',
];

export function getRandomWords(count = 3) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default words;

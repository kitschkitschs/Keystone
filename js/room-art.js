// room-art.js: the placeholder art that comes with the app, and the cat's
// standard sprite sheet layout.
//
// room-art/starter.png and room-art/cat.png are drawn for Keystone, so they're
// free to keep in the public repo. Your own art never goes in the repo: it's
// saved on the phone (and in your backup file) when you add it in the app.

const TILE = 16;

// What kind of thing a piece is. This decides where it can go.
const PIECE_TYPES = [
  ['furniture', 'Furniture', 'Stands on the floor. Nothing else can stand in its tiles.'],
  ['small', 'Small thing', 'Goes on a table (or any surface), or on the floor.'],
  ['rug', 'Rug', 'Lies on the floor, under furniture.'],
  ['wall', 'On the wall', 'Hangs on the wall: windows, pictures, shelves.'],
  ['wallpaper', 'Wallpaper', 'Repeats across the whole wall.'],
  ['floor', 'Floor', 'Repeats across the whole floor.'],
];

// The pieces cut from room-art/starter.png, for "Add the starter pieces".
// box: [x, y, width, height] in pixels. w and d: how many tiles wide and deep
// the piece stands on. A piece with several boxes can be turned.
const STARTER_PIECES = [
  { name: 'Bookshelf', type: 'furniture', boxes: [[0, 0, 32, 48]], w: 2, d: 1 },
  { name: 'Bed', type: 'furniture', boxes: [[32, 0, 32, 48]], w: 2, d: 2, catSpot: true, catLift: 6 },
  { name: 'Table', type: 'furniture', boxes: [[64, 0, 32, 32]], w: 2, d: 1, surface: true, lift: 19 },
  { name: 'Armchair', type: 'furniture', boxes: [[96, 0, 32, 32]], w: 2, d: 1, catSpot: true, catLift: 8 },
  { name: 'Chair', type: 'furniture', boxes: [[128, 0, 16, 32], [144, 0, 16, 32]], w: 1, d: 1, count: 2 },
  { name: 'Tall plant', type: 'furniture', boxes: [[160, 0, 16, 32]], w: 1, d: 1 },
  { name: 'Window', type: 'wall', boxes: [[176, 0, 32, 32]], w: 2, d: 2 },
  { name: 'Picture', type: 'wall', boxes: [[208, 0, 16, 16]], w: 1, d: 1 },
  { name: 'Lamp', type: 'small', boxes: [[224, 0, 16, 16]], w: 1, d: 1, light: true },
  { name: 'Teacup', type: 'small', boxes: [[240, 0, 16, 16]], w: 1, d: 1 },
  { name: 'Little plant', type: 'small', boxes: [[208, 16, 16, 16]], w: 1, d: 1 },
  { name: 'Books', type: 'small', boxes: [[224, 16, 16, 16]], w: 1, d: 1 },
  { name: 'Ball of yarn', type: 'small', boxes: [[240, 16, 16, 16]], w: 1, d: 1, toy: true },
  { name: 'Rose rug', type: 'rug', boxes: [[64, 32, 48, 32]], w: 3, d: 2 },
  { name: 'Sage stripes', type: 'wallpaper', boxes: [[112, 32, 16, 48]], w: 1, d: 3 },
  { name: 'Cream flowers', type: 'wallpaper', boxes: [[128, 32, 16, 48]], w: 1, d: 3 },
  { name: 'Wood planks', type: 'floor', boxes: [[144, 32, 16, 16]], w: 1, d: 1 },
  { name: 'Sage check', type: 'floor', boxes: [[160, 32, 16, 16]], w: 1, d: 1 },
];

// The cat's animations. Frames are counted from 0, left to right, then row by
// row, like reading. The numbers below fit Stardew Valley's pet sheets:
// 4 frames across, 32 x 32 pixels each.
const CAT_ANIMS = [
  { key: 'walkDown', name: 'Walking down', start: 0, count: 4, fps: 6 },
  { key: 'walkRight', name: 'Walking right', start: 4, count: 4, fps: 6 },
  { key: 'walkUp', name: 'Walking up', start: 8, count: 4, fps: 6 },
  { key: 'walkLeft', name: 'Walking left', start: 12, count: 4, fps: 6, canFlip: true },
  { key: 'sitDown', name: 'Sitting down', start: 16, count: 4, fps: 6, once: true },
  { key: 'groom', name: 'Washing', start: 20, count: 4, fps: 4 },
  { key: 'lieDown', name: 'Lying down', start: 24, count: 4, fps: 5, once: true },
  { key: 'sleep', name: 'Sleeping', start: 28, count: 2, fps: 1.5 },
];

function defaultCat() {
  const anims = {};
  for (const a of CAT_ANIMS) anims[a.key] = { start: a.start, count: a.count, fps: a.fps, flip: false };
  return { id: 'cat', kind: 'cat', day: '', name: 'Pip', src: 'room-art/cat.png', fw: 32, fh: 32, anims };
}

// --- Picture helpers, shared by the room, the piece cutter and the cat page ---

function loadPicture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That picture could not be opened.'));
    img.src = src;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// A picture on a canvas, so we can cut from it and read its pixels.
function pictureCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

// Cuts one box out of a canvas, as a PNG.
function cutBox(canvas, [x, y, w, h]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return c.toDataURL('image/png');
}

// The smallest box inside `box` that still holds every visible pixel.
function trimBox(canvas, [x, y, w, h]) {
  const d = canvas.getContext('2d').getImageData(x, y, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (d[(j * w + i) * 4 + 3] > 0) { x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i); y1 = Math.max(y1, j); }
  }
  if (x1 < 0) return [x, y, w, h];
  return [x + x0, y + y0, x1 - x0 + 1, y1 - y0 + 1];
}

// Adds the starter pieces you don't have yet (by name). Returns how many it added.
async function addStarterPieces() {
  const sheet = pictureCanvas(await loadPicture('room-art/starter.png'));
  const have = new Set((await getAllItems()).filter((i) => i.kind === 'piece' && !i.deleted).map((i) => i.name));
  let added = 0;
  for (const p of STARTER_PIECES) {
    if (have.has(p.name)) continue;
    const views = p.boxes.map((box, i) => ({
      src: cutBox(sheet, box), pw: box[2], ph: box[3],
      // A turned piece swaps how wide and deep it stands.
      w: i % 2 ? p.d : p.w, d: i % 2 ? p.w : p.d,
    }));
    await putItem({
      id: newId('piece'), kind: 'piece', day: '', name: p.name, type: p.type, views,
      count: p.count || 1, surface: Boolean(p.surface), lift: p.lift || 16, light: Boolean(p.light),
      catSpot: Boolean(p.catSpot), catLift: p.catLift ?? 8, toy: Boolean(p.toy), createdAt: Date.now(),
    });
    added++;
  }
  return added;
}

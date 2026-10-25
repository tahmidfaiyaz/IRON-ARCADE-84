/* Original, resolution-independent pixel illustration. No external art assets. */
(() => {
  'use strict';

  const W = 800;
  const H = 440;
  const ink = '#160f27';
  const skin = '#ec9479';
  const light = '#ffc096';
  const shade = '#b85c68';
  const deep = '#813b57';

  function box(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);
  }

  function poly(c, points, color, outline, width = 4) {
    c.beginPath();
    points.forEach(([x, y], i) => {
      x = Math.round(x / 2) * 2;
      y = Math.round(y / 2) * 2;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    if (outline) {
      c.strokeStyle = outline;
      c.lineWidth = width;
      c.lineJoin = 'miter';
      c.stroke();
    }
    c.fillStyle = color;
    c.fill();
  }

  function line(c, x1, y1, x2, y2, color, width = 2) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  function plate(c, x, y, width, height, color, highlight) {
    poly(c, [[x + 4, y], [x + width - 4, y], [x + width, y + 6],
      [x + width, y + height - 6], [x + width - 4, y + height],
      [x + 4, y + height], [x, y + height - 6], [x, y + 6]], color, ink, 4);
    box(c, x + 4, y + 5, 3, height - 10, highlight);
    box(c, x + width - 5, y + 8, 3, height - 16, '#24233f');
  }

  class ArcadeScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.canvas.width = W;
      this.canvas.height = H;
      this.context = canvas.getContext('2d');
      this.context.imageSmoothingEnabled = false;
      // Painting at half resolution gives every diagonal a real pixel edge.
      this.surface = document.createElement('canvas');
      this.surface.width = W / 2;
      this.surface.height = H / 2;
      this.ctx = this.surface.getContext('2d');
      this.ctx.scale(0.5, 0.5);
      this.background = document.createElement('canvas');
      this.background.width = W / 2;
      this.background.height = H / 2;
      const bg = this.background.getContext('2d');
      bg.scale(0.5, 0.5);
      this.paintBackground(bg);
    }

    paintBackground(c) {
      box(c, 0, 0, W, H, '#161127');
      box(c, 0, 0, W, 22, '#21172f');
      box(c, 0, 24, W, 4, '#422443');
      box(c, 0, 28, W, 288, '#1c142e');

      // Exposed brick at the sides of the gym.
      for (let row = 0; row < 10; row++) {
        const y = 42 + row * 27;
        line(c, 0, y, 130, y, '#302039');
        line(c, 670, y, 800, y, '#302039');
        for (let col = 0; col < 3; col++) {
          const x = col * 58 + (row % 2 ? 28 : 0);
          line(c, x, y, x, y + 26, '#302039');
          line(c, 674 + x, y, 674 + x, y + 26, '#302039');
        }
      }

      // Panoramic window and a hand-drawn striped sunset.
      box(c, 130, 36, 540, 262, '#0e1227');
      box(c, 138, 44, 524, 246, '#1a1734');
      const sky = c.createLinearGradient(0, 44, 0, 284);
      sky.addColorStop(0, '#17152e');
      sky.addColorStop(0.6, '#342043');
      sky.addColorStop(1, '#572542');
      box(c, 138, 44, 524, 246, sky);

      for (let i = 0; i < 34; i++) {
        const x = 145 + ((i * 79 + i * i * 13) % 506);
        const y = 52 + ((i * 43) % 142);
        box(c, x, y, i % 6 === 0 ? 4 : 2, 2, i % 3 ? '#796182' : '#8abbcb');
        if (i % 8 === 0) box(c, x + 2, y - 2, 2, 6, '#ad9dbe');
      }

      const sunset = ['#ffca87', '#ffbd7c', '#ffac77', '#ff9879', '#fa807e', '#ef6388', '#e84d93', '#d33d99', '#b72a92'];
      for (let y = 55; y < 250; y += 4) {
        const dy = y - 153;
        const half = Math.sqrt(Math.max(0, 98 * 98 - dy * dy));
        const band = Math.floor((y - 55) / 22);
        const cut = y > 155 && ((y - 155) % 22 < (y - 155) / 13 + 2);
        if (!cut) box(c, 400 - Math.floor(half / 2) * 2, y, Math.floor(half / 2) * 4, 4, sunset[Math.min(8, band)]);
      }

      // Mountain ranges and the skyline, with little lit windows.
      poly(c, [[138, 259], [180, 221], [200, 231], [238, 189], [290, 233], [329, 203],
        [381, 253], [423, 220], [457, 235], [518, 185], [552, 225], [580, 213],
        [619, 246], [662, 222], [662, 290], [138, 290]], '#332044');
      poly(c, [[138, 271], [205, 242], [251, 259], [298, 240], [355, 273], [405, 253],
        [463, 266], [523, 231], [596, 258], [662, 249], [662, 290], [138, 290]], '#241c3b');
      const buildings = [[148, 228, 20], [178, 246, 24], [211, 232, 31], [255, 253, 18],
        [280, 225, 26], [317, 247, 24], [464, 248, 22], [495, 227, 28], [533, 241, 22],
        [563, 214, 32], [603, 234, 23], [637, 250, 23]];
      for (const [x, y, w] of buildings) {
        box(c, x, y, w, 290 - y, '#15182e');
        box(c, x + 4, y - 4, w - 8, 4, '#15182e');
        for (let j = 0; j < 4; j++) {
          if (j % 2 === 0) box(c, x + 5, y + 8 + j * 9, 3, 4, '#646178');
          box(c, x + w - 8, y + 8 + j * 9, 3, 4, j % 2 ? '#623657' : '#ba6a7a');
        }
      }
      box(c, 132, 36, 536, 6, '#625069');
      box(c, 130, 38, 8, 260, '#45314c');
      box(c, 662, 38, 8, 260, '#45314c');
      box(c, 134, 288, 532, 8, '#59415b');
      box(c, 264, 42, 6, 246, '#35283d');
      box(c, 530, 42, 6, 246, '#35283d');
      box(c, 138, 183, 524, 5, '#35283d');
      box(c, 126, 48, 3, 242, '#ed4a94');
      box(c, 672, 48, 3, 242, '#5acbd2');

      // Pink and blue fluorescent fixtures, attached to the ceiling.
      box(c, 180, 0, 3, 16, '#696078');
      box(c, 286, 0, 3, 16, '#696078');
      box(c, 168, 14, 132, 13, '#372746');
      box(c, 174, 16, 120, 5, '#ff77bb');
      box(c, 174, 21, 120, 2, '#9e3e7c');
      box(c, 515, 0, 3, 16, '#696078');
      box(c, 619, 0, 3, 16, '#696078');
      box(c, 504, 14, 132, 13, '#2a354c');
      box(c, 510, 16, 120, 5, '#9af5ef');
      box(c, 510, 21, 120, 2, '#3898ad');

      // Gym floor: a perspective grid under the rubber lifting platform.
      box(c, 0, 309, W, 131, '#20162e');
      box(c, 0, 307, W, 4, '#74415b');
      for (const y of [321, 338, 361, 391, 432]) line(c, 0, y, W, y, '#41223e', 2);
      for (let x = -440; x < 1400; x += 120) line(c, 400 + (x - 400) * 0.12, 309, x, 440, '#41223e', 2);
      poly(c, [[269, 334], [531, 334], [596, 419], [204, 419]], '#161424', '#493449', 2);
      poly(c, [[282, 344], [518, 344], [563, 406], [237, 406]], '#1b192b');
      line(c, 239, 409, 561, 409, '#a23b74', 2);
      box(c, 314, 395, 172, 8, '#121221');
      box(c, 336, 389, 128, 12, '#121221');

      this.paintRack(c);
      this.paintDumbbells(c);

      // Loose bumper plate with stepped edges, water bottle and towel.
      poly(c, [[202, 320], [224, 320], [236, 332], [236, 355], [224, 367], [202, 367],
        [190, 355], [190, 332]], '#63354e', ink, 4);
      poly(c, [[206, 327], [220, 327], [229, 336], [229, 351], [220, 360], [206, 360],
        [197, 351], [197, 336]], '#a55372');
      box(c, 208, 338, 10, 10, '#20182d');
      box(c, 211, 340, 4, 6, '#86809c');
      box(c, 585, 344, 13, 30, '#326a82');
      box(c, 588, 339, 7, 7, '#8cd7d7');
      box(c, 587, 351, 9, 12, '#76cfcd');
      box(c, 588, 345, 2, 26, '#9ee9d9');
      poly(c, [[620, 375], [658, 375], [665, 382], [635, 388], [613, 383]], '#8a6a8c');
      line(c, 624, 379, 651, 380, '#b195b4', 2);

      // Small in-world neon sign, carefully separated from the game HUD.
      box(c, 704, 51, 65, 45, '#111326');
      box(c, 706, 53, 61, 2, '#b6467c');
      box(c, 706, 92, 61, 2, '#b6467c');
      c.font = 'bold 18px monospace';
      c.textAlign = 'center';
      c.fillStyle = '#f779b0';
      c.fillText('GYM', 736, 75);
      c.font = '7px monospace';
      c.fillStyle = '#a9d8d6';
      c.fillText('OPEN 24 HRS', 736, 86);
      c.textAlign = 'left';
    }

    paintRack(c) {
      // Uprights and hook positions on an old-school squat stand.
      box(c, 51, 124, 12, 211, '#3e415b');
      box(c, 55, 126, 3, 204, '#818397');
      box(c, 173, 124, 12, 211, '#3e415b');
      box(c, 177, 126, 3, 204, '#818397');
      box(c, 51, 122, 134, 9, '#55516b');
      box(c, 38, 333, 45, 8, '#4d4b64');
      box(c, 160, 333, 39, 8, '#4d4b64');
      for (let y = 145; y < 292; y += 21) {
        box(c, 57, y, 4, 5, '#171728');
        box(c, 175, y, 4, 5, '#171728');
      }
      box(c, 31, 178, 172, 5, '#8c8e9d');
      plate(c, 38, 160, 10, 39, '#40577d', '#7893ba');
      plate(c, 49, 151, 15, 57, '#74415f', '#ba6085');
      plate(c, 168, 151, 15, 57, '#74415f', '#ba6085');
      plate(c, 184, 160, 10, 39, '#40577d', '#7893ba');
      // Bench and feet.
      poly(c, [[70, 285], [154, 285], [177, 302], [59, 302]], '#7d3459', ink, 4);
      box(c, 60, 298, 117, 10, '#4b2443');
      line(c, 74, 307, 65, 345, '#77758a', 7);
      line(c, 160, 307, 171, 345, '#77758a', 7);
      box(c, 53, 344, 27, 6, '#4f4b64');
      box(c, 157, 344, 28, 6, '#4f4b64');
      box(c, 61, 290, 88, 3, '#b3597e');
    }

    paintDumbbells(c) {
      box(c, 615, 258, 8, 104, '#625c75');
      box(c, 751, 258, 8, 104, '#625c75');
      box(c, 608, 284, 157, 7, '#6f667b');
      box(c, 608, 324, 157, 7, '#6f667b');
      box(c, 604, 359, 28, 7, '#413b56');
      box(c, 741, 359, 28, 7, '#413b56');
      for (let row = 0; row < 2; row++) {
        const y = 272 + row * 40;
        for (let i = 0; i < 3; i++) {
          const x = 619 + i * 46;
          box(c, x, y + 2, 32, 5, '#9b96ab');
          plate(c, x, y - 7, 10, 24, '#354158', '#6c8c9d');
          plate(c, x + 25, y - 7, 10, 24, '#354158', '#6c8c9d');
        }
      }
    }

    paintAthlete(c, lift, bob) {
      c.save();
      c.translate(0, bob);
      const barY = 257 - lift * 127;
      const elbowY = 248 - lift * 69;

      // Legs behind shorts: broad thighs, angled calves, socks and trainers.
      poly(c, [[361, 303], [394, 303], [392, 344], [380, 376], [352, 376], [354, 344]], skin, ink, 6);
      poly(c, [[406, 303], [439, 303], [446, 344], [448, 376], [420, 376], [408, 344]], skin, ink, 6);
      poly(c, [[360, 325], [373, 324], [374, 345], [365, 372], [354, 372]], light);
      poly(c, [[428, 324], [437, 325], [443, 371], [431, 371], [425, 345]], light);
      poly(c, [[382, 323], [393, 318], [389, 345], [381, 372], [373, 373]], shade);
      poly(c, [[406, 318], [417, 323], [426, 372], [419, 373], [410, 346]], shade);
      box(c, 351, 366, 29, 15, '#bfbbc2');
      box(c, 421, 366, 29, 15, '#bfbbc2');
      box(c, 352, 369, 27, 4, '#df528e');
      box(c, 422, 369, 27, 4, '#df528e');
      poly(c, [[350, 378], [378, 378], [381, 394], [338, 394], [338, 386]], '#4aadb6', ink, 5);
      poly(c, [[422, 378], [450, 378], [462, 386], [462, 394], [419, 394]], '#4aadb6', ink, 5);
      box(c, 340, 390, 39, 4, '#d8d5d9');
      box(c, 422, 390, 38, 4, '#d8d5d9');
      box(c, 351, 382, 20, 3, '#a5ede0');
      box(c, 430, 382, 18, 3, '#a5ede0');

      // Far arms. Joint positions track the same barbell height as the hands.
      const leftArm = [[343, 198], [323, 201], [294, elbowY - 19], [285, elbowY],
        [288, elbowY + 12], [307, elbowY + 15], [333, 235], [351, 218]];
      const rightArm = leftArm.map(([x, y]) => [800 - x, y]);
      poly(c, leftArm, skin, ink, 7);
      poly(c, rightArm, skin, ink, 7);
      poly(c, [[323, 205], [339, 203], [338, 217], [307, elbowY + 4], [297, elbowY - 4]], light);
      poly(c, [[477, 205], [461, 203], [462, 217], [493, elbowY + 4], [503, elbowY - 4]], light);
      line(c, 309, elbowY + 7, 327, 225, shade, 5);
      line(c, 491, elbowY + 7, 473, 225, shade, 5);

      // Back / trapezius, dramatically wider than the waist.
      poly(c, [[378, 182], [422, 182], [436, 195], [456, 200], [465, 221],
        [447, 258], [431, 288], [432, 306], [368, 306], [369, 288], [353, 258],
        [335, 221], [344, 200], [364, 195]], skin, ink, 7);
      poly(c, [[343, 215], [353, 232], [366, 267], [375, 286], [372, 300], [367, 288],
        [354, 259], [337, 222]], shade);
      poly(c, [[457, 215], [447, 232], [434, 267], [425, 286], [428, 300], [433, 288],
        [446, 259], [463, 222]], shade);
      poly(c, [[368, 196], [380, 188], [389, 196], [388, 212], [350, 218], [351, 208]], light);
      poly(c, [[432, 196], [420, 188], [411, 196], [412, 212], [450, 218], [449, 208]], light);

      // Pectoral shading and stepped abdominal highlights.
      poly(c, [[349, 217], [367, 211], [393, 217], [393, 237], [381, 245], [358, 239]], light);
      poly(c, [[407, 217], [433, 211], [451, 217], [442, 239], [419, 245], [407, 237]], light);
      poly(c, [[358, 239], [381, 244], [393, 237], [393, 244], [382, 251], [362, 246]], shade);
      poly(c, [[407, 237], [419, 244], [442, 239], [438, 246], [418, 251], [407, 244]], shade);
      box(c, 397, 216, 5, 28, deep);
      box(c, 371, 229, 5, 3, deep);
      box(c, 424, 229, 5, 3, deep);
      for (let i = 0; i < 3; i++) {
        const y = 252 + i * 14;
        poly(c, [[382 + i, y], [395, y - 2], [395, y + 8], [384 + i, y + 9]], light);
        poly(c, [[405, y - 2], [418 - i, y], [416 - i, y + 9], [405, y + 8]], light);
        box(c, 385 + i, y + 10, 10 - i, 3, shade);
        box(c, 405, y + 10, 10 - i, 3, shade);
      }
      box(c, 398, 254, 4, 35, shade);
      box(c, 398, 288, 4, 3, deep);
      // Neon rim lights from the gym fixtures.
      line(c, 344, 201, 335, 219, '#f48db2', 3);
      line(c, 456, 201, 465, 219, '#81cbc5', 3);

      // Old-school high-waist lifting shorts and a wide belt.
      poly(c, [[367, 297], [433, 297], [443, 329], [408, 335], [400, 324], [392, 335],
        [357, 329]], '#392b54', ink, 6);
      box(c, 366, 296, 68, 10, '#db528b');
      box(c, 370, 298, 60, 3, '#ff85b6');
      box(c, 392, 295, 16, 13, '#a2bec8');
      box(c, 397, 299, 6, 5, '#3b3451');
      poly(c, [[359, 319], [391, 325], [391, 333], [357, 328]], '#5ad7d4');
      poly(c, [[409, 325], [441, 319], [443, 328], [409, 333]], '#5ad7d4');
      line(c, 400, 310, 400, 323, '#746284', 3);

      // Neck, head, strong jaw and a very eighties headband.
      poly(c, [[382, 174], [418, 174], [419, 193], [407, 204], [393, 204], [381, 193]], shade, ink, 4);
      poly(c, [[380, 141], [418, 141], [425, 153], [422, 180], [412, 191], [389, 191],
        [378, 180], [375, 155]], skin, ink, 6);
      box(c, 372, 158, 7, 15, shade);
      box(c, 422, 158, 7, 15, shade);
      poly(c, [[380, 152], [392, 150], [392, 175], [399, 181], [389, 182], [382, 175]], light);
      poly(c, [[414, 152], [421, 153], [420, 177], [411, 185], [392, 185], [392, 190], [411, 190],
        [423, 178]], shade);
      poly(c, [[373, 147], [373, 135], [382, 128], [414, 128], [424, 137], [426, 150],
        [416, 149], [410, 142], [387, 143], [381, 151]], '#3d2638', ink, 4);
      box(c, 383, 130, 26, 4, '#875153');
      box(c, 378, 136, 19, 4, '#65404a');
      box(c, 377, 146, 47, 6, '#ee619d');
      box(c, 378, 147, 43, 2, '#ff9bc4');
      box(c, 424, 149, 9, 5, '#ee619d');
      poly(c, [[427, 151], [431, 151], [438, 165], [433, 163]], '#bb417c');
      box(c, 383, 157, 10, 3, '#613b48');
      box(c, 407, 157, 10, 3, '#613b48');
      box(c, 386, 160, 7, 4, '#fff0cb');
      box(c, 407, 160, 7, 4, '#fff0cb');
      box(c, 390, 160, 3, 4, '#291e31');
      box(c, 407, 160, 3, 4, '#291e31');
      line(c, 400, 161, 397, 172, '#bf6f68', 3);
      box(c, 397, 173, 7, 3, shade);
      box(c, 392, 180, 16, 3, '#7a3d4e');
      box(c, 396, 184, 9, 2, light);

      // Forearms travel from elbows to the bar. Outline stays chunky and crisp.
      const arm = (x, direction) => {
        const handX = x + direction * 8;
        poly(c, [[x - 13, elbowY], [x + 13, elbowY], [handX + 11, barY - 1],
          [handX - 11, barY - 1]], skin, ink, 6);
        line(c, x - 7, elbowY - 2, handX - 5, barY, light, 6);
        line(c, x + 8, elbowY - 2, handX + 7, barY, shade, 4);
        box(c, handX - 12, barY + (elbowY > barY ? 8 : -13), 24, 7, '#44304e');
      };
      arm(300, 1);
      arm(500, -1);

      // A chrome Olympic bar, four thick plates and the hands over its knurling.
      box(c, 228, barY - 3, 344, 9, ink);
      box(c, 228, barY - 2, 344, 5, '#9292ac');
      box(c, 230, barY - 2, 340, 2, '#e0e1e4');
      for (let x = 316; x < 488; x += 8) box(c, x, barY, 2, 3, '#53566f');
      plate(c, 248, barY - 34, 22, 68, '#343450', '#888eaf');
      plate(c, 530, barY - 34, 22, 68, '#343450', '#888eaf');
      plate(c, 236, barY - 24, 12, 48, '#47667d', '#79b0bb');
      plate(c, 552, barY - 24, 12, 48, '#47667d', '#79b0bb');
      box(c, 254, barY - 25, 4, 18, '#b870a1');
      box(c, 536, barY - 25, 4, 18, '#b870a1');
      box(c, 275, barY - 5, 6, 13, '#aeb6bc');
      box(c, 519, barY - 5, 6, 13, '#aeb6bc');
      for (const x of [308, 492]) {
        poly(c, [[x - 11, barY - 7], [x + 9, barY - 7], [x + 12, barY - 3],
          [x + 10, barY + 8], [x - 10, barY + 8]], skin, ink, 3);
        box(c, x - 8, barY - 5, 16, 4, light);
        for (let i = 0; i < 3; i++) line(c, x - 5 + i * 5, barY + 1, x - 5 + i * 5, barY + 6, shade, 2);
      }
      c.restore();
    }

    draw({ time = 0, lift = 0, mood = 'ready', reducedMotion = false } = {}) {
      const c = this.ctx;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.background, 0, 0);
      c.restore();
      const frozen = reducedMotion || mood === 'paused';
      const bob = frozen ? 0 : Math.round(Math.sin(time / 480) * 1.3) * 2;
      this.paintAthlete(c, Math.max(0, Math.min(1, lift)), bob);
      // A few drifting dust motes in the neon light, away from the athlete.
      if (!frozen) {
        for (let i = 0; i < 10; i++) {
          const x = 158 + ((i * 53 + time / 110) % 483);
          const y = 92 + ((i * 41 - time / 190 + 100000) % 196);
          if (x < 285 || x > 515) box(c, x, y, 2, 2, i % 2 ? '#927b9c' : '#768c9a');
        }
      }
      this.context.clearRect(0, 0, W, H);
      this.context.drawImage(this.surface, 0, 0, W, H);
    }
  }

  window.ArcadeScene = ArcadeScene;
})();

function drawDebug() {
  drawFPS();

  drawGrid();
}

function debug(loadFromStorage = false) {
  if (!loadFromStorage) debugging = (debugging + 1) % 3;
  if (localStorage) localStorage.setItem("debug", debugging);

  switch (debugging) {
    default:
    case 0:
      document.getElementById("debugBtn").textContent = "debug off";
      break;
    case 1:
      document.getElementById("debugBtn").textContent = "debug grid";
      break;
    case 2:
      document.getElementById("debugBtn").textContent = "debug all";
      break;
  }
}

function resistanceToggle() {
  linearFriction = !linearFriction;
  if (localStorage) localStorage.setItem("linearFriction", linearFriction);
  if (document.getElementById("linearFrictionBtn"))
    document.getElementById("linearFrictionBtn").textContent = linearFriction
      ? "air resistance"
      : "linear friction";
  console.log(
    linearFriction ? "linear friction turned on" : "air resistance turned on"
  );
}

function toggleOptimization() {
  if (spatialHash.cellSize < 800) {
    spatialHash.cellSize = 800;
  } else {
    spatialHash.cellSize = parseInt(document.getElementById("cellsize").value);
  }
}

function loadStorageValues() {
  if (localStorage) {
    //loads negative values and then toggles them
    debugging = parseInt(localStorage.getItem("debug"));
    linearFriction = localStorage.getItem("linearFriction") === "false";
    debug(true);
    resistanceToggle();
  }
}

function drawFPS() {
  fps = 1000 / (performance.now() - lastLoopTime);
  ctx.fillText(~~fps + " fps", 10, 26);
}

function drawColCount() {
  const totalColCheck = spatialHash.objects.length ** 2;
  ctx.fillText(
    colCount + " / " + totalColCheck + " collisions checked",
    10,
    56
  );
  const savedPercent = 100 - (colCount / totalColCheck) * 100;
  ctx.fillText(savedPercent.toFixed(1) + "% saved", 10, 86);
}

function unhash(a) {
  const sqrta = Math.floor(Math.sqrt(a));
  const sqa = sqrta * sqrta;
  return a - sqa >= sqrta ? [sqrta, a - sqa - sqrta] : [a - sqa, sqrta];
}

function drawGrid() {
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = maincolor;
  ctx.beginPath();
  for (var i = 0; i <= ~~(width / spatialHash.cellSize); i++) {
    ctx.moveTo(i * spatialHash.cellSize, 0);
    ctx.lineTo(i * spatialHash.cellSize, height);
  }
  for (var j = 0; j <= ~~(height / spatialHash.cellSize); j++) {
    ctx.moveTo(0, j * spatialHash.cellSize);
    ctx.lineTo(width, j * spatialHash.cellSize);
  }
  ctx.stroke();
  for (const h in spatialHash.cells) {
    const [rectX, rectY] = unhash(h);

    ctx.fillStyle = intToRgb(spatialHash.cells[h].length);
    ctx.fillRect(rectX, rectY, spatialHash.cellSize, spatialHash.cellSize);
  }
}

function intToRgb(num, max = 5) {
  num = clamp(num, 0, max);
  ratio = (num / max) * 255;
  return ["rgba(", ratio, ",", 255 - ratio, ",0,.20)"].join("");
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function arrow(context, fromx, fromy, tox, toy) {
  var headlen = 10; // length of head in pixels
  var dx = tox - fromx;
  var dy = toy - fromy;
  var angle = Math.atan2(dy, dx);
  ctx.beginPath();
  context.moveTo(fromx, fromy);
  context.lineTo(tox, toy);
  context.lineTo(
    tox - headlen * Math.cos(angle - Math.PI / 6),
    toy - headlen * Math.sin(angle - Math.PI / 6)
  );
  context.moveTo(tox, toy);
  context.lineTo(
    tox - headlen * Math.cos(angle + Math.PI / 6),
    toy - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

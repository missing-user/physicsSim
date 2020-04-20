function drawDebug() {
	drawFPS()
	drawGrid()
}

function drawFPS() {
	fps = 1000 / (performance.now() - lastLoopTime)
	ctx.fillText(~~fps + " fps", 10, 26)
}

function drawGrid() {
	ctx.beginPath()
	ctx.lineWidth = 0.5
	ctx.strokeStyle = '#000'
	for (var i = 0; i < ~~(width / particles.cellSize); i++) {
		ctx.moveTo(i * particles.cellSize, 0)
		ctx.lineTo(i * particles.cellSize, height)
	}
	for (var j = 0; j < ~~(height / particles.cellSize); j++) {
		ctx.moveTo(0, j * particles.cellSize)
		ctx.lineTo(width, j * particles.cellSize)
	}
	ctx.stroke();
	for (h in particles.cells) {
		coords = h.split(';')
		ctx.fillStyle = intToRgb(particles.cells[h].length)
		ctx.fillRect(coords[0], coords[1], particles.cellSize, particles.cellSize)
	}
}

function intToRgb(num, max = 5) {
	num = clamp(num, 0, max)
	ratio = num / max * 255
	return ['rgba(', ratio, ',', 255 - ratio, ',0,.20)'].join('')
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
	context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
	context.moveTo(tox, toy);
	context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
	ctx.stroke();
}
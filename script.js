var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext("2d"),
	width = canvas.width,
	height = canvas.height,
	fps = 0,
	lastLoopTime = 0,
	dt = 1,
	paused = false,
	debugging = false,
	timefactor = 1,
	maincolor = '#333',
	gravity = 15,
	springstrength = 10;
var particles = new SpatialHash(20),
	statics = []

function draw() {
	ctx.clearRect(0, 0, width, height);
	ctx.strokeStyle = "#F00"
	for (s of statics) {
		ctx.beginPath()
		ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI)
		ctx.stroke()
	}
	ctx.strokeStyle = maincolor
	ctx.fillStyle = maincolor
	ctx.lineWidth = 1
	for (p of particles.objects) {
		if ('w' in p && 'h' in p) ctx.fillRect(p.x, p.y, p.w, p.h)
		else if ('r' in p) {
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI)
			ctx.stroke()
		} else ctx.fillRect(p.x, p.y, 2, 2)
	}
	if (debugging) drawDebug()
}

function loop() {
	draw()
	dt = (performance.now() - lastLoopTime) / 1000
	dt /= timefactor
	if (dt > 0.1) {
		console.log('frametimeSpike, limiting timestep', dt)
		dt = 0.1
	}
	lastLoopTime = performance.now()
	for (p of particles.objects) {
		p.x = p.x + p.vx * dt
		p.y = p.y + p.vy * dt
		//physics
		p.collisionNormal = null
		p.vy += gravity * dt //gravity
		getCollisions(p)
		//repulsion(p)
		//friction
		friction(p)
		//bounce off walls
		if ('w' in p && 'h' in p) {
			if (p.x < 0) p.vx = Math.abs(p.vx)
			if (p.y < 0) p.vy = Math.abs(p.vy)
			if (p.x + p.w > width) p.vx = -Math.abs(p.vx)
			if (p.y + p.h > height) p.vy = -Math.abs(p.vy)
		} else if ('r' in p) {
			if (p.x - p.r < 0) p.vx = Math.abs(p.vx)
			if (p.y - p.r < 0) p.vy = Math.abs(p.vy)
			if (p.x + p.r > width) p.vx = -Math.abs(p.vx)
			if (p.y + p.r > height) p.vy = -Math.abs(p.vy)
		} else {
			if (p.x < 0) p.vx = Math.abs(p.vx)
			if (p.y < 0) p.vy = Math.abs(p.vy)
			if (p.x > width) p.vx = -Math.abs(p.vx)
			if (p.y > height) p.vy = -Math.abs(p.vy)
		}
	}
	particles.rebuild()
	if (!paused) requestAnimationFrame(loop)
}

function getCollisions(p) {
	for (var c of particles.getCandidates(p)) {
		if ('w' in p && 'h' in p) {
			if ('w' in c && 'h' in c) {
				p.collisionNormal = AABB_AABB_intersection(p, c)
			} else if ('r' in c) {
				p.collisionNormal = AABB_circle_intersection(p, c, true)
			} else {
				p.collisionNormal = AABB_point_intersection(p, c)
			}
		} else if ('r' in p) {
			if ('w' in c && 'h' in c) {
				p.collisionNormal = AABB_circle_intersection(c, p)
			} else if ('r' in c) {
				p.collisionNormal = circle_circle_intersection(p, c)
			} else {
				p.collisionNormal = circle_point_intersection(p, c)
			}
		} else {
			if ('w' in c && 'h' in c) {
				p.collisionNormal = AABB_point_intersection(c, p, true)
			} else if ('r' in c) {
				p.collisionNormal = circle_point_intersection(c, p, true)
			}
		}
		if (debugging && p.collisionNormal) {
			ctx.strokeStyle = (p.collisionNormal.x > 0 || (p.collisionNormal.x == 0 && p.collisionNormal.y > 0)) ? "#F00" : "#0020F6"
			arrow(ctx, p.x, p.y, p.x + p.collisionNormal.x * 2, p.y + p.collisionNormal.y * 2)
			ctx.strokeStyle = maincolor
		}
		if (p.collisionNormal) softCollision(p, c, p.collisionNormal)
	}
}

function circle_circle_intersection(a, b) {
	dx = a.x - b.x
	dy = a.y - b.y
	r2 = dx * dx + dy * dy
	if (r2 < (a.r + b.r) * (a.r + b.r)) {
		dist = Math.sqrt(r2)
		return {
			x: (a.r + b.r - dist) * dx / dist,
			y: (a.r + b.r - dist) * dy / dist
		}
	}
	return null
}

function circle_point_intersection(a, b, flipDirection = false) {
	dx = a.x - b.x
	dy = a.y - b.y
	if (flipDirection) {
		dx = -dx
		dy = -dy
	}
	r2 = dx * dx + dy * dy
	if (r2 < a.r * a.r) {
		dist = Math.sqrt(r2)
		return {
			x: (a.r - dist) * dx / dist,
			y: (a.r - dist) * dy / dist
		}
	}
	return null
}

function AABB_AABB_intersection(a, b) {
	if (a.x - b.x > b.w) return null
	if (a.y - b.y > b.h) return null
	if (b.x - a.x > a.w) return null
	if (b.y - a.y > a.h) return null
	// We have an overlap
	// NOTE: differentiates between the four cases (nw, ne, sw, se)
	xr = (b.x - a.x < (a.w - b.w) / 2) ? b.w + b.x - a.x : -a.x + b.x - a.w
	yr = (b.y - a.y < (a.h - b.h) / 2) ? b.h + b.y - a.y : -a.y + b.y - a.h
	// NOTE: only push out of the minimal axis, prevents tiny overlaps on
	//x creating huge forces in the y direction
	if (Math.abs(yr) > Math.abs(xr)) return {
		x: xr,
		y: 0
	}
	else return {
		x: 0,
		y: yr
	}
}

function AABB_point_intersection(a, p, flipDirection = false) {
	if (p.x - a.x > a.w) return null
	if (p.y - a.y > a.h) return null
	if (p.x < a.x) return null
	if (p.y < a.y) return null
	// We have an overlap
	// NOTE: differentiates between the four cases (nw, ne, sw, se)
	xr = (p.x - a.x < a.w / 2) ? a.x - p.x : a.x + a.w - p.x
	yr = (p.y - a.y < a.h / 2) ? a.y - p.y : a.y + a.h - p.y
	return {
		x: flipDirection ? xr : -xr,
		y: flipDirection ? yr : -yr
	}
}

function AABB_circle_intersection(b, c, flipDirection = false) {
	//check if circle center is inside
	centerCheck = AABB_point_intersection(b, c, true)
	if (centerCheck) {
		centerCheck.x += c.r * Math.sign(centerCheck.x)
		centerCheck.y += c.r * Math.sign(centerCheck.y)
		if (flipDirection) {
			centerCheck.x = -centerCheck.x
			centerCheck.y = -centerCheck.y
		}
		return centerCheck
	}
	//clamp the coordinates to find the closest point on the box
	closestx = b.x
	closesty = b.y
	dx = c.x - b.x
	if (dx > 0) closestx = b.x + Math.min(dx, b.w)
	dy = c.y - b.y
	if (dy > 0) closesty = b.y + Math.min(dy, b.h)
	return circle_point_intersection(c, {
		x: closestx,
		y: closesty
	}, flipDirection)
}

function hardCollision(a, b) {
	// BUG: Basically the entire thing is broken, probably
	//because both partners are doing the calc, but only one is necessary?
	// NOTE: checks if they are moving towards another and aborts otherwise
	if (a.x > b.x)
		if (b.vx < a.vx) return false
	if (a.x < b.x)
		if (b.vx > a.vx) return false
	if (a.y > b.y)
		if (b.vy < a.vy) return false
	if (a.y < b.y)
		if (b.vy > a.vy) return false
	f1 = 2 * a.m / (a.m + b.m)
	f2 = (a.m - b.m) / (a.m + b.m)
	b.vx = f1 * a.vx - f2 * b.vx
	b.vy = f1 * a.vy - f2 * b.vy
	a.vx = f2 * a.vx + f1 * b.vx
	a.vy = f2 * a.vy + f1 * b.vy
	return true
}

function softCollision(a, b, normal) {
	//spring force euqation
	k = springstrength / (1 / a.k + 1 / b.k)
	a.vx += normal.x * dt * k / a.m
	a.vy += normal.y * dt * k / a.m
}

function friction(p) {
	//air resistance or linear friction
	if (false) {
		p.vx -= 20 * dt * p.vx / p.m
		p.vy -= 20 * dt * p.vy / p.m
	} else {
		v2 = p.vx * p.vx + p.vy * p.vy
		if (v2 > 0) {
			p.vx -= 0.002 * p.A * p.vx / Math.sqrt(v2) * dt * v2 / p.m
			p.vy -= 0.002 * p.A * p.vy / Math.sqrt(v2) * dt * v2 / p.m
		}
	}
}

function initialize() {
	//set the colorscheme
	if (window.matchMedia) {
		window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
			maincolor = e.matches ? '#d3d7cf' : '#333';
			console.log('theme change detected, setting color to', maincolor);
		});
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) maincolor = '#d3d7cf'
	}
	//add the elements
	for (var i = 0; i < 50; i++) {
		gen = {
			x: canvas.width * Math.random(),
			y: canvas.height * Math.random(),
			w: 20 + 20 * Math.random(),
			h: 20 + 20 * Math.random(),
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			k: 8000,
			get m() {
				return this.w * this.h;
			},
			get A() {
				return this.w + this.h
			}
		}
		particles.add(gen)
	}
	for (var i = 0; i < 50; i++) {
		gen = {
			x: canvas.width * Math.random(),
			y: canvas.height * Math.random(),
			r: 5 + 20 * Math.random(),
			k: 8000,
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			get m() {
				return this.r * this.r * Math.PI;
			},
			get A() {
				return this.r * 2
			}
		}
		particles.add(gen)
	}
	for (var i = 0; i < 0; i++) {
		gen = {
			x: canvas.width * Math.random(),
			y: canvas.height * Math.random(),
			r: 5 + 35 * Math.random(),
			k: -5000,
			vx: 0,
			vy: 0,
			get m() {
				return this.r * this.r * Math.PI
			},
			get A() {
				return this.r * 2
			}
		}
		statics.push(gen)
	}
	for (var i = 0; i < 200; i++) {
		gen = {
			x: canvas.width * Math.random(),
			y: canvas.height * Math.random(),
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			m: 10,
			k: 100,
			A: 1,
		}
		particles.add(gen)
	}
	console.log('objects', particles.objects);
	console.log('cells', particles.cells);
	loop()
}
initialize()
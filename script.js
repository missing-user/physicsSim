var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext("2d"),
	width = canvas.width,
	height = canvas.height,
	fps = 0,
	lastLoopTime = 0,
	dt = 1,
	paused = false
var particles = new SpatialHash(15),
	statics = []

function draw() {
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "#292929"
	ctx.lineWidth = 1
	for (p of particles.objects) {
		ctx.fillStyle = p.collisionDepth > 0 ? "#292929" : "#9F9F9F"
		ctx.fillText(~~(p.collisionDepth * 10), p.x, p.y)
		if ('w' in p && 'h' in p) ctx.fillRect(p.x, p.y, p.w, p.h)
		else if ('r' in p) {
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI)
			ctx.stroke()
		} else ctx.fillRect(p.x, p.y, 2, 2)
	}
	ctx.strokeStyle = "#F00"
	for (s of statics) {
		ctx.beginPath()
		ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI)
		ctx.stroke()
	}
	ctx.strokeStyle = "#292929"
	drawDebug()
}

function loop() {
	draw()
	dt = (performance.now() - lastLoopTime) / 1000
	if (dt > 0.1) {
		console.log('frametimeSpike, limiting timestep', dt)
		dt = 0.1
	}
	lastLoopTime = performance.now()
	for (p of particles.objects) {
		p.x = p.x + p.vx * dt
		p.y = p.y + p.vy * dt
		//physics
		p.collisionDepth = 0
		p.vy += 10 * dt //gravity
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
	for (s of statics) {
		getCollisions(s)
	}
	particles.rebuild()
	if (!paused) requestAnimationFrame(loop)
}

function repulsion(target) {
	ctx.beginPath()
	for (var c of particles.getCandidates(target)) {
		r2 = (target.x - c.x) * (target.x - c.x) + (target.y - c.y) * (target.y - c.y)
		if ('r' in c)
			if (r2 < (target.r + c.r) * (target.r + c.r)) {
				xVec = (target.x - c.x) / Math.sqrt(r2)
				yVec = (target.y - c.y) / Math.sqrt(r2)
				//spring force euqation
				k = 10
				force = k * (target.r + c.r - Math.sqrt(r2))
				ctx.lineWidth = force / k / 5
				target.vx += xVec * dt * force / target.m
				target.vy += yVec * dt * force / target.m
				//ctx.moveTo(target.x, target.y)
				//ctx.lineTo(c.x, c.y)
			}
		if ('w' in c && 'h' in c) {
			console.log('rectangle collision missing');
		}
	}
	ctx.stroke()
}

function getCollisions(p) {
	for (var c of particles.getCandidates(p)) {
		if ('w' in p && 'h' in p) {
			if ('w' in c && 'h' in c) {
				p.collisionDepth += AABB_AABB_intersection(p, c)
			} else if ('r' in c) {
				p.collisionDepth = AABB_circle_intersection(p, c)
			} else {
				p.collisionDepth = AABB_point_intersection(p, c)
			}
		} else if ('r' in p) {
			if ('w' in c && 'h' in c) {
				p.collisionDepth = AABB_circle_intersection(c, p)
			} else if ('r' in c) {
				p.collisionDepth = circle_circle_intersection(p, c)
			} else {
				p.collisionDepth = circle_point_intersection(p, c)
			}
		} else {
			if ('w' in c && 'h' in c) {
				p.collisionDepth = AABB_point_intersection(c, p)
			} else if ('r' in c) {
				p.collisionDepth = circle_point_intersection(c, p)
			}
		}
		if (p.collisionDepth) softCollision(p, c, p.collisionDepth)
	}
}

function circle_circle_intersection(a, b) {
	r2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)
	if (r2 < (a.r + b.r) * (a.r + b.r)) return a.r + b.r - Math.sqrt(r2)
	return null
}

function circle_point_intersection(a, b) {
	r2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)
	if (r2 < a.r * a.r) return a.r - Math.sqrt(r2)
	return null
}

function AABB_AABB_intersection(a, b) {
	if (a.x - b.x > b.w) return null
	if (a.y - b.y > b.h) return null
	if (b.x - a.x > a.w) return null
	if (b.y - a.y > a.h) return null
	// We have an overlap
	return b.x - a.x + b.y - a.y;
}

function AABB_point_intersection(a, p) {
	if (p.x - a.x > a.w) return false
	if (p.y - a.y > a.h) return false
	if (p.x < a.x) return false
	if (p.y < a.y) return false
	// We have an overlap
	return true;
}

function AABB_circle_intersection(b, c) {
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
	})
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

function softCollision(a, b, depth) {
	ctx.beginPath()
	r2 = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)
	xVec = (a.x - b.x) / Math.sqrt(r2)
	yVec = (a.y - b.y) / Math.sqrt(r2)
	//spring force euqation
	k = 1 / (1 / a.k + 1 / b.k)
	force = k * depth
	ctx.lineWidth = force / k / 5
	a.vx += xVec * dt * force / a.m
	a.vy += yVec * dt * force / a.m
	ctx.moveTo(a.x, a.y)
	ctx.lineTo(b.x, b.y)
	ctx.stroke()
}

function friction(p) {
	//air resistance or linear friction
	if (false) {
		p.vx -= 20 * dt * p.vx / p.m
		p.vy -= 20 * dt * p.vy / p.m
	} else {
		v2 = p.vx * p.vx + p.vy * p.vy
		if (v2 > 0) {
			p.vx -= 0.1 * p.vx / Math.sqrt(v2) * dt * v2 / p.m
			p.vy -= 0.1 * p.vy / Math.sqrt(v2) * dt * v2 / p.m
		}
	}
}

function initialize() {
	for (var i = 0; i < 0; i++) {
		gen = {
			x: 600 * Math.random(),
			y: 600 * Math.random(),
			w: 30 * Math.random(),
			h: 30 * Math.random(),
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			get m() {
				return 100
				return this.w * this.h;
			}
		}
		particles.add(gen)
	}
	for (var i = 0; i < 200; i++) {
		gen = {
			x: 600 * Math.random(),
			y: 600 * Math.random(),
			r: 5 + 5 * Math.random(),
			k: 100000,
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			get m() {
				return 100
				return this.r * this.r * Math.PI;
			}
		}
		particles.add(gen)
	}
	for (var i = 0; i < 15; i++) {
		gen = {
			x: 600 * Math.random(),
			y: 600 * Math.random(),
			r: 55 + 25 * Math.random(),
			k: -10000,
			vx: 0,
			vy: 0,
			get m() {
				return 100
				return this.r * this.r * Math.PI;
			}
		}
		statics.push(gen)
	}
	for (var i = 0; i < 0; i++) {
		gen = {
			x: 600 * Math.random(),
			y: 600 * Math.random(),
			vx: Math.random() * 50 - 25,
			vy: Math.random() * 50 - 25,
			m: 100
		}
		particles.add(gen)
	}
	console.log('objects', particles.objects);
	console.log('cells', particles.cells);
	loop()
}
initialize()
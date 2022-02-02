var canvas = document.getElementById("canvas"),
  ctx = canvas.getContext("2d"),
  width = canvas.width,
  height = canvas.height,
  fps = 0,
  lastLoopTime = 0,
  dt = 1,
  paused = false,
  debugging = 0,
  linearFriction = false,
  resistance = 10,
  timefactor = 1,
  maincolor = "#333",
  gravity = 15,
  springstrength = 30,
  colCount = 0,
  mouse = { x: 0, y: 0 };
var spatialHash = new SpatialHash(25);

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = maincolor;
  ctx.fillStyle = maincolor;
  ctx.lineWidth = 1;
  for (const p of spatialHash.objects) {
    if ("w" in p && "h" in p) ctx.fillRect(p.x, p.y, p.w, p.h);
    else if ("r" in p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.stroke();
    } else ctx.fillRect(p.x, p.y, 2, 2);
  }

  //draw the text info
  drawColCount();
  if (debugging > 0) drawDebug();
}
canvas.addEventListener("mousemove", onmousemove, { passive: true });
canvas.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches) onmousemove(e.touches[0]);
  },
  { passive: true }
);

function onmousemove(event) {
  let rect = canvas.getBoundingClientRect();
  let x = event.clientX - rect.left;
  x *= canvas.width / rect.width;
  let y = event.clientY - rect.top;
  y *= canvas.height / rect.height;

  mouse.x = x;
  mouse.y = y;
}

function leapfrogStep(p) {
  // Update half step velocity
  vhx[i] += ax[i] * dt;
  vhy[i] += ay[i] * dt;

  // Update velocity
  vx[i] = vhx[i] + (ax[i] * dt) / 2;
  vy[i] = vhy[i] + (ay[i] * dt) / 2;

  // Update position
  x[i] += vhx[i] * dt;
  y[i] += vhy[i] * dt;
}

function eulerIntegrate(p) {
  p.vx = p.vx + p.ax * dt;
  p.vy = p.vy + p.ay * dt;

  p.x = p.x + p.vx * dt;
  p.y = p.y + p.vy * dt;

  // handle boundaries
  if (p.x - (p.r ?? 0) < 0) {
    // west wall
    p.vx = Math.abs(p.vx);
    p.x = Math.max(p.x, p.r ?? 0); //moves the objects out of walls, even if their velocity is 0
  }
  if (p.y - (p.r ?? 0) < 0) {
    // north wall
    p.vy = Math.abs(p.vy);
    p.y = Math.max(p.y, (p.h ?? 0) + (p.r ?? 0));
  }
  if (p.x + (p.w ?? 0) + (p.r ?? 0) > width) {
    // east wall
    p.vx = -Math.abs(p.vx);
    p.x = Math.min(p.x, width - (p.w ?? 0) - (p.r ?? 0));
  }
  if (p.y + (p.h ?? 0) + (p.r ?? 0) > height) {
    // south wall
    p.vy = -Math.abs(p.vy);
    p.y = Math.min(p.y, height - (p.h ?? 0) - (p.r ?? 0));
  }
}

function loop() {
  draw();
  colCount = 0;
  dt = (performance.now() - lastLoopTime) / 1000;
  dt /= timefactor;
  if (dt > 0.1) {
    console.log("frametimeSpike, limiting timestep", dt);
    dt = 0.1;
  }
  lastLoopTime = performance.now();

  spatialHash.objects[0].x = mouse.x;
  spatialHash.objects[0].y = mouse.y;

  for (const p of spatialHash.objects) {
    //physics
    p.collisionNormal = null;
    p.ax = 0;
    p.ay = gravity * 2; //gravity
    getCollisions(p);
    friction(p); //either air resist or linear friction
    //bounce off walls  (no case differentiation, using fallback values with ??)
  }

  for (const p of spatialHash.objects) {
    eulerIntegrate(p);
  }

  //if NaN has been calculated somewhere, print warning and discard the object
  if (0 in spatialHash.cells) {
    let nanCounter = 0;
    for (const entries of spatialHash.cells[0]) {
      if (
        isNaN(entries.x) ||
        isNaN(entries.y) ||
        isNaN(entries.vx) ||
        isNaN(entries.vy)
      ) {
        nanCounter++;
        entries.x = 0;
        entries.y = 0;
        entries.vx = 0;
        entries.vy = 0;
      }
    }
    if (nanCounter > 0)
      console.warn("NaN detected, resetting " + nanCounter + " objects");
  }

  spatialHash.rebuild();
  if (!paused) requestAnimationFrame(loop);
}

function getCollisions(c) {
  for (const p of spatialHash.getCandidates(c)) {
    if ("w" in p && "h" in p) {
      if ("w" in c && "h" in c) {
        p.collisionNormal = AABB_AABB_intersection(p, c);
      } else if ("r" in c) {
        p.collisionNormal = AABB_circle_intersection(p, c, true);
      } else {
        p.collisionNormal = AABB_point_intersection(p, c);
      }
    } else if ("r" in p) {
      if ("w" in c && "h" in c) {
        p.collisionNormal = AABB_circle_intersection(c, p);
      } else if ("r" in c) {
        p.collisionNormal = circle_circle_intersection(p, c);
      } else {
        p.collisionNormal = circle_point_intersection(p, c);
      }
    } else {
      if ("w" in c && "h" in c) {
        p.collisionNormal = AABB_point_intersection(c, p, true);
      } else if ("r" in c) {
        p.collisionNormal = circle_point_intersection(c, p, true);
      }
    }

    //debugging arrows
    if (debugging > 1 && p.collisionNormal) {
      ctx.strokeStyle =
        p.collisionNormal.x > 0 ||
        (p.collisionNormal.x == 0 && p.collisionNormal.y > 0)
          ? "#F00"
          : "#0020F6";
      arrow(
        ctx,
        p.x,
        p.y,
        p.x + p.collisionNormal.x * 2,
        p.y + p.collisionNormal.y * 2
      );
      ctx.strokeStyle = maincolor;
    }
    if (p.collisionNormal) softCollision(p, c, p.collisionNormal);

    colCount++;
  }
}

function circle_circle_intersection(a, b) {
  dx = a.x - b.x;
  dy = a.y - b.y;
  r2 = dx * dx + dy * dy;
  if (r2 < (a.r + b.r) * (a.r + b.r)) {
    dist = Math.sqrt(r2);
    return {
      x: ((a.r + b.r - dist) * dx) / dist,
      y: ((a.r + b.r - dist) * dy) / dist,
    };
  }
  return null;
}

function circle_point_intersection(a, b, flipDirection = false) {
  dx = a.x - b.x;
  dy = a.y - b.y;
  if (flipDirection) {
    dx = -dx;
    dy = -dy;
  }
  r2 = dx * dx + dy * dy;
  if (r2 < a.r * a.r) {
    dist = Math.sqrt(r2);
    return {
      x: ((a.r - dist) * dx) / dist,
      y: ((a.r - dist) * dy) / dist,
    };
  }
  return null;
}

function AABB_AABB_intersection(a, b) {
  if (a.x - b.x > b.w) return null;
  if (a.y - b.y > b.h) return null;
  if (b.x - a.x > a.w) return null;
  if (b.y - a.y > a.h) return null;
  // We have an overlap
  // NOTE: differentiates between the four cases (nw, ne, sw, se)
  xr = b.x - a.x < (a.w - b.w) / 2 ? b.w + b.x - a.x : -a.x + b.x - a.w;
  yr = b.y - a.y < (a.h - b.h) / 2 ? b.h + b.y - a.y : -a.y + b.y - a.h;
  // NOTE: only push out of the minimal axis, prevents tiny overlaps on
  //x creating huge forces in the y direction
  if (Math.abs(yr) > Math.abs(xr))
    return {
      x: xr,
      y: 0,
    };
  else
    return {
      x: 0,
      y: yr,
    };
}

function AABB_point_intersection(a, p, flipDirection = false) {
  if (p.x - a.x > a.w) return null;
  if (p.y - a.y > a.h) return null;
  if (p.x < a.x) return null;
  if (p.y < a.y) return null;
  // We have an overlap
  // NOTE: differentiates between the four cases (nw, ne, sw, se)

  let xr = a.x + a.w / 2 - p.x;
  let yr = a.y + a.h / 2 - p.y;
  let delta = Math.sqrt(xr * xr + yr * yr);

  if (Math.abs(xr) > Math.abs(yr)) {
    return {
      x: flipDirection ^ (xr < 0) ? -delta : delta,
      y: 0,
    };
  } else {
    return {
      x: 0,
      y: flipDirection ^ (yr < 0) ? -delta : delta, //XOR sign flip and which side of the center we are on to determine which direction to push
    };
  }
}

function AABB_circle_intersection(b, c, flipDirection = false) {
  //check if circle center is inside
  centerCheck = AABB_point_intersection(b, c, true);
  if (centerCheck) {
    centerCheck.x += c.r * Math.sign(centerCheck.x);
    centerCheck.y += c.r * Math.sign(centerCheck.y);
    if (flipDirection) {
      centerCheck.x = -centerCheck.x;
      centerCheck.y = -centerCheck.y;
    }
    return centerCheck;
  }
  //clamp the coordinates to find the closest point on the box
  closestx = b.x;
  closesty = b.y;
  dx = c.x - b.x;
  if (dx > 0) closestx = b.x + Math.min(dx, b.w);
  dy = c.y - b.y;
  if (dy > 0) closesty = b.y + Math.min(dy, b.h);
  return circle_point_intersection(
    c,
    {
      x: closestx,
      y: closesty,
    },
    flipDirection
  );
}

function softCollision(a, b, normal) {
  //spring force euqation
  k = springstrength / (1 / a.k + 1 / b.k);
  a.ax += (normal.x * k) / a.m;
  a.ay += (normal.y * k) / a.m;

  b.ax -= (normal.x * k) / b.m;
  b.ay -= (normal.y * k) / b.m;
}

function friction(p) {
  //air resistance or linear friction
  if (linearFriction) {
    p.ax -= (resistance * p.vx) / p.m;
    p.ay -= (resistance * p.vy) / p.m;
  } else {
    v2 = p.vx * p.vx + p.vy * p.vy;
    if (v2 > 0.002) {
      p.ax -= (((0.002 * resistance * p.A * p.vx) / Math.sqrt(v2)) * v2) / p.m;
      p.ay -= (((0.002 * resistance * p.A * p.vy) / Math.sqrt(v2)) * v2) / p.m;
    }
  }
}

function initialize() {
  //set the colorscheme
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        maincolor = e.matches ? "#d3d7cf" : "#333";
        console.log("theme change detected, setting color to", maincolor);
      });
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      maincolor = "#d3d7cf";
  }

  ctx.font = "20px sans-serif";

  //add the elements
  //circles
  for (var i = 0; i < 500; i++) {
    gen = {
      x: canvas.width * Math.random(),
      y: canvas.height * Math.random(),
      r: 5 + 10 * Math.random(),
      k: 5,
      vx: Math.random() * 50 - 25,
      vy: Math.random() * 50 - 25,
      get m() {
        return (this.r * this.r * Math.PI) / 1e3;
      },
      get A() {
        return (this.r * this.r * Math.PI) / 1e3;
      },
    };
    spatialHash.add(gen);
  }
  //rectangles
  for (var i = 0; i < 100; i++) {
    gen = {
      x: canvas.width * Math.random(),
      y: canvas.height * Math.random(),
      w: 10 + 20 * Math.random(),
      h: 10 + 20 * Math.random(),
      vx: Math.random() * 50 - 25,
      vy: Math.random() * 50 - 25,
      k: 18,
      get m() {
        return (this.w * this.h) / 1e2;
      },
      get A() {
        return (this.w * this.h) / 1e3;
      },
    };
    spatialHash.add(gen);
  }
  //points
  for (var i = 0; i < 200; i++) {
    gen = {
      x: canvas.width * Math.random(),
      y: canvas.height * Math.random(),
      vx: Math.random() * 50 - 25,
      vy: Math.random() * 50 - 25,
      m: 0.05,
      k: 1,
      A: 0.02,
    };
    spatialHash.add(gen);
  }

  spatialHash.objects[0].r = 70;
  spatialHash.objects[0].k = 50;

  loop();
}
initialize();

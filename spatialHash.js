class SpatialHash {
  constructor(cs = 25) {
    this.cellSize = cs;
    this.cells = {};
    this.objects = [];
    this.sqrt2 = Math.sqrt(2);
  }
  getHash(x, y) {
    return [
      ~~(x / this.cellSize) * this.cellSize,
      ~~(y / this.cellSize) * this.cellSize,
    ].join(";");
  }
  add(obj) {
    if ("x" in obj && "y" in obj) {
      this.objects.push(obj);
      this.addToCells(obj);
    }
  }
  addToCells(obj) {
    if ("w" in obj && "h" in obj) this.addRect(obj);
    else if ("r" in obj) this.addCirc(obj);
    else this.addPoint(obj);
  }
  closestCell(rawNumber) {
    return ~~(rawNumber / this.cellSize) * this.cellSize;
  }
  addRect(obj) {
    for (
      var i = this.closestCell(obj.x);
      i <= this.closestCell(obj.x + obj.w);
      i += this.cellSize
    )
      for (
        var j = this.closestCell(obj.y);
        j <= this.closestCell(obj.y + obj.h);
        j += this.cellSize
      ) {
        let hash = [i, j].join(";");
        console.log("added rectangle to cell: " + hash);

        if (!(hash in this.cells)) {
          this.cells[hash] = [];
        }
        this.cells[hash].push(obj);
      }
  }
  addCirc(obj) {
    //radius + cellDiagonal squared
    let cellDiag = (this.sqrt2 * this.cellSize) / 2;
    let maxDiag = cellDiag + obj.r;
    maxDiag *= maxDiag;
    for (
      var i = this.closestCell(obj.x - obj.r);
      i <= this.closestCell(obj.x + obj.r);
      i += this.cellSize
    )
      for (
        var j = this.closestCell(obj.y - obj.r);
        j <= this.closestCell(obj.y + obj.r);
        j += this.cellSize
      ) {
        let cx = i + this.cellSize / 2 - obj.x;
        let cy = j + this.cellSize / 2 - obj.y;
        if (cx * cx + cy * cy < maxDiag) {
          let hash = [i, j].join(";");
          if (!(hash in this.cells)) {
            this.cells[hash] = [];
          }
          this.cells[hash].push(obj);
        }
      }
  }
  addPoint(obj) {
    let hash = this.getHash(obj.x, obj.y);
    if (hash in this.cells) {
      this.cells[hash].push(obj);
    } else {
      this.cells[hash] = [];
      this.cells[hash].push(obj);
    }
  }
  remove(obj) {
    if ("w" in obj && "h" in obj && "x" in obj && "y" in obj) {
      this.objects = this.objects.filter((item) => {
        return item != obj;
      });
      for (
        var i = this.closestCell(obj.x);
        i <= this.closestCell(obj.x + obj.w);
        i += this.cellSize
      )
        for (
          var j = this.closestCell(obj.y);
          j <= this.closestCell(obj.y + obj.h);
          j += this.cellSize
        ) {
          let hash = [i, j].join(";");
          this.cells[hash] = this.cells[hash].filter((item) => {
            return item != obj;
          });
          if (this.cells[hash].length == 0) delete this.cells[hash];
        }
    } else {
      // TODO: add circleand point removal
      console.log("circle and point removal not yet implemented");
    }
  }
  getCandidates(obj) {
    if ("w" in obj && "h" in obj) return this.getRect(obj);
    else if ("r" in obj) return this.getCirc(obj);
    else return this.getPoint(obj);
  }
  getPoint(obj) {
    let hash = this.getHash(obj.x, obj.y);
    if (hash in this.cells) return this.cells[hash];
    return [];
  }
  getCirc(obj) {
    let returnBuffer = [];
    //radius + cellDiagonal squared
    let cellDiag = (this.sqrt2 * this.cellSize) / 2;
    let maxDiag = cellDiag + obj.r;
    maxDiag *= maxDiag;
    for (
      var i = this.closestCell(obj.x - obj.r);
      i <= this.closestCell(obj.x + obj.r);
      i += this.cellSize
    )
      for (
        var j = this.closestCell(obj.y - obj.r);
        j <= this.closestCell(obj.y + obj.r);
        j += this.cellSize
      ) {
        let cx = i + this.cellSize / 2 - obj.x;
        let cy = j + this.cellSize / 2 - obj.y;
        if (cx * cx + cy * cy < maxDiag) {
          let hash = [i, j].join(";");
          if (hash in this.cells)
            returnBuffer = returnBuffer.concat(this.cells[hash]);
        }
      }
    return returnBuffer.filter((v, i, a) => a.indexOf(v) === i && v != obj);
  }
  getRect(obj) {
    let returnBuffer = [];
    for (
      var i = this.closestCell(obj.x);
      i <= this.closestCell(obj.x + obj.w);
      i += this.cellSize
    ) {
      for (
        var j = this.closestCell(obj.y);
        j <= this.closestCell(obj.y + obj.h);
        j += this.cellSize
      ) {
        let hash = [i, j].join(";");
        if (hash in this.cells)
          returnBuffer = returnBuffer.concat(this.cells[hash]);
      }
    }
    return returnBuffer.filter((v, i, a) => a.indexOf(v) === i && v != obj);
  }
  rebuild() {
    this.cells = {};
    for (let o of this.objects) this.addToCells(o);
  }
}

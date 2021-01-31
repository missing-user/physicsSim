# Physics Simulation

My attempt at implementing a spatial hashing algorithm for 2D physics in JS. The algorithms uses circles, points and axis aligned rectangles as primitives and detects overlaps efficiently. 
Currently only simple spring forces are supported for the primitives. 
The solver is a semi implicit Euler implementation, so energy isn't perfectly conserved due to rounding errors

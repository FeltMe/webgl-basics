

// Vertex shader
const vertexShaderSource = `
attribute vec3 vertex;
uniform mat4 ModelViewProjectionMatrix;

void main() {
    gl_Position = ModelViewProjectionMatrix * vec4(vertex,1.0);
}`;


// Fragment shader
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

uniform vec4 color;
void main() {
    gl_FragColor = color;
}`;
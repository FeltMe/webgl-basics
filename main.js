'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let Radius = 1;

let lightSource;
let texturePoint = [0, 0]

let CameraPosition = [0, 0, -10];

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

let isAnimating = false;
let reqAnim;
let currentAnimationTime = 0;
let animationSpeed = 1;
let textureScale = 1;

window.onkeydown = (e) => {
    switch (e.keyCode) {
        case 65:
            texturePoint[0] += 0.01;
            break;
        case 68:
            texturePoint[0] -= 0.01;
            break;
        case 87:
            texturePoint[1] += 0.01;
            break;
        case 83:
            texturePoint[1] -= 0.01;
            break;
    }
    texturePoint[1] = Math.max(0.001, Math.min(texturePoint[1], 0.999))

    if(texturePoint[0] >= 1){
        texturePoint[0] = 0.001;
    }
    else if(texturePoint[0] <= 0){
        texturePoint[0] = 0.99;
    }
    draw();
}

function SwitchAnimation(){

    isAnimating = !isAnimating;
    if(!isAnimating){
        window.cancelAnimationFrame(reqAnim);
    }
    else{
        ExecuteAnimation();
    }

}

function ExecuteAnimation(){
    if(!isAnimating){
        return;
    }
    let deltaTime = 1000 / 60 ;
    let x = surface.Position[0] + (Math.cos(currentAnimationTime / 500) * 2 * Radius);
    let y = surface.Position[1] + (Math.sin(currentAnimationTime / 500) * 2 * Radius);
    let z = surface.Position[2] + (Math.sin(currentAnimationTime / 500) * 2 * Radius);

    lightSource.SetPosition([x, y, z]);
    draw();
    currentAnimationTime += deltaTime;
    setTimeout(() => {
        reqAnim = window.requestAnimationFrame(ExecuteAnimation);    
    }, deltaTime);
}



function LightSource(shProgram){
    this.Ambient = [0.1, 0.1, 0.1];
    this.Diffuse = [1, 1, 1];
    this.Specular = [1, 1, 1];
    this.Model = m4.translation([0, 0, 0]);
    this.ProjectionView = [];
    this.shProgram = shProgram;
    this.Visualization = new Model('Surface', shProgram);
    this.Visualization.AmbientColor = [1, 1, 1];
    this.Visualization.scale = 0.2;

    this.shProgram.iAttribVertex = gl.getAttribLocation(this.shProgram.prog, "vertex");
    this.shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(this.shProgram.prog, "ModelViewProjectionMatrix");

    this.Initialize = function(){

        let data = CreateKnotClover();
        this.Visualization.BufferData(data[0], data[1]);

    }

    this.SetPosition = function(Position) {
        this.Model[12] = Position[0];
        this.Model[13] = Position[1];
        this.Model[14] = Position[2];

        this.Visualization.Position = Position;
    };

    this.Draw = function(projectionView){
        //this.shProgram.Use();
        this.ProjectionView = projectionView;
        //this.Visualization.Draw(projectionView);
    }

    this.SetX = function(Value) {
        this.SetPosition([Value, this.Model[13], this.Model[14]]);
    };

    this.SetY = function(Value) {
        this.SetPosition([this.Model[12], Value, this.Model[14]]);
    };

    this.SetZ = function(Value) {
        this.SetPosition([this.Model[12], this.Model[13], Value]);
    };

    this.GetWorldPosition = function() {
        let mvp = m4.multiply(this.ProjectionView, this.Model);
        return [mvp[12], mvp[13], mvp[14]];
    };
}


// Constructor
function Model(name, shProgram) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.shProgram = shProgram;
    this.Position = [0, 0, 0];
    this.scale = 1;

    this.AmbientColor = [0.1, 0.1, 0.1];
    this.DiffuseColor = [1, 1, 1];
    this.SpecularColor = [0.4, 0.4, 0.4];

    this.shProgram.iAttribVertex = gl.getAttribLocation(this.shProgram.prog, "vertex");
    this.shProgram.iNormalVertex = gl.getAttribLocation(this.shProgram.prog, "normal");

    this.shProgram.iWorldInverseTranspose = gl.getUniformLocation(this.shProgram.prog, "WorldInverseTranspose");
    this.shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(this.shProgram.prog, "ModelViewProjectionMatrix");

    this.shProgram.iMatAmbientColor = gl.getUniformLocation(this.shProgram.prog, "matAmbientColor");
    this.shProgram.iMatDiffuseColor = gl.getUniformLocation(this.shProgram.prog, "matDiffuseColor");
    this.shProgram.iMatSpecularColor = gl.getUniformLocation(this.shProgram.prog, "matSpecularColor");
    this.shProgram.iMatShininess = gl.getUniformLocation(this.shProgram.prog, "matShininess");

    this.shProgram.iLightAmbientColor = gl.getUniformLocation(this.shProgram.prog, "lightAmbientColor");
    this.shProgram.iLightDiffuseColor = gl.getUniformLocation(this.shProgram.prog, "lightDiffuseColor");
    this.shProgram.iLightSpecularColor = gl.getUniformLocation(this.shProgram.prog, "lightSpecularColor");

    this.shProgram.iLightPosition = gl.getUniformLocation(this.shProgram.prog, "LightPosition");
    this.shProgram.iCamWorldPosition = gl.getUniformLocation(this.shProgram.prog, "CamWorldPosition");

    this.shProgram.iTextureCoord = gl.getAttribLocation(this.shProgram.prog, "textureCoord");
    this.shProgram.iTMU = gl.getUniformLocation(this.shProgram.prog, "tmu");
    this.shProgram.iPointVizualizationPosition = gl.getUniformLocation(this.shProgram.prog, "pointPosition");
    this.shProgram.iScalePoint = gl.getUniformLocation(this.shProgram.prog, "scalePoint");
    this.shProgram.iScaleValue = gl.getUniformLocation(this.shProgram.prog, "textureScale");

    this.BufferData = function (vertices, normals, textureCoords) 
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }



    this.Draw = function (projectionView) {

        this.shProgram.Use();
        
        let modelView = spaceball.getViewMatrix();

        let scaleMat = m4.scale(modelView, this.scale, this.scale, this.scale);
    
        let WorldMatrix = m4.translation(this.Position[0],this.Position[1], this.Position[2]);
    
        let matAccum0 = m4.multiply(scaleMat, modelView);
        let matAccum2 = m4.multiply(WorldMatrix, matAccum0);
            
        let modelViewProjection = m4.multiply(projectionView, matAccum2 );
        
        var worldInverseMatrix = m4.inverse(scaleMat);
        var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
        gl.uniformMatrix4fv(this.shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
        gl.uniformMatrix4fv(shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);
    
        gl.uniform3fv(this.shProgram.iMatAmbientColor, this.AmbientColor);
        gl.uniform3fv(this.shProgram.iMatDiffuseColor, this.DiffuseColor);
        gl.uniform3fv(this.shProgram.iMatSpecularColor, this.SpecularColor);
        gl.uniform1f(this.shProgram.iMatShininess, 8);
    
        gl.uniform3fv(this.shProgram.iLightAmbientColor, lightSource.Ambient);
        gl.uniform3fv(this.shProgram.iLightDiffuseColor, lightSource.Diffuse);
        gl.uniform3fv(this.shProgram.iLightSpecularColor, lightSource.Specular);
    
        gl.uniform3fv(this.shProgram.iCamWorldPosition, CameraPosition);
        let pos = lightSource.GetWorldPosition();
        gl.uniform3fv(this.shProgram.iLightPosition, pos);

        let point = CalculateKnotClover(map(texturePoint[0], 0, 1,0, uMax), map(texturePoint[1], 0, 1,0, vMax));
        gl.uniform3fv(shProgram.iPointVizualizationPosition, [point.x, point.y, point.z]);
        gl.uniform2fv(shProgram.iScalePoint, texturePoint);
        gl.uniform1f(shProgram.iScaleValue, textureScale);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iTextureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTextureCoord);

        gl.uniform1i(shProgram.iTMU, 0);
        gl.enable(gl.TEXTURE_2D);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iTextureCoord = -1;
    this.iTMU = -1;

    this.iAttribVertex = -1;
    this.iNormalVertex = -1;

    this.iModelViewProjectionMatrix = -1;
    this.iWorldInverseTranspose = -1;

    this.iLightAmbientColor = -1;
    this.iLightDiffuseColor = -1;
    this.iLightSpecularColor = -1;

    this.iMatAmbientColor = -1;
    this.iMatDiffuseColor = -1;
    this.iMatSpecularColor = -1;
    this.iMatShininess = -1;

    this.iLightPosition = -1;
    this.iCamWorldPosition = -1;

    this.iScalePoint = -1;
    this.iPointVizualizationPosition = -1;
    this.iScaleValue = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(1.2, 1, 2, 30); 

    let view = m4.lookAt(CameraPosition, [0, 0, 0], [0, 1, 0]);

    let projectionView = m4.multiply(projection, view);

    lightSource.Draw(projectionView);
    surface.Draw(projectionView);
}

let uMax = Math.PI * 12
let vMax = Math.PI * 2
function CreateKnotClover(R)
{
    let vertexList = [];
    let normalsList = [];
    let texture = [];
    let uStep = uMax / 100;
    let vStep = vMax / 100;

    for (let u = 0; u <= uMax; u += uStep) {
        for (let v = 0; v <= vMax; v += vStep) {
            let vert = CalculateKnotClover(u, v)
            let n1 = CalcAnalyticNormal(u, v, vert)
            let avert = CalculateKnotClover(u + uStep, v)
            let n2 = CalcAnalyticNormal(u + uStep, v, avert)
            let bvert = CalculateKnotClover(u, v + vStep)
            let n3 = CalcAnalyticNormal(u, v + vStep, bvert)
            let cvert = CalculateKnotClover(u + uStep, v + vStep)
            let n4 = CalcAnalyticNormal(u + uStep, v + vStep, cvert)

            let u1 = map(u, 0, uMax, 0, 6)
            let v1 = map(v, 0, vMax, 0, 6)
            texture.push(u1, v1)
            u1 = map(u + uStep, 0, uMax, 0, 6)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 6)
            v1 = map(v + vStep, 0, vMax, 0, 6)
            texture.push(u1, v1)
            u1 = map(u + uStep, 0, uMax, 0, 6)
            v1 = map(v, 0, vMax, 0, 6)
            texture.push(u1, v1)
            v1 = map(v + vStep, 0, vMax, 0, 6)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 6)
            v1 = map(v + vStep, 0, vMax, 0, 6)
            texture.push(u1, v1)

            vertexList.push(vert.x, vert.y, vert.z)
            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)

            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)

            normalsList.push(n1.x, n1.y, n1.z)
            normalsList.push(n2.x, n2.y, n2.z)
            normalsList.push(n3.x, n3.y, n3.z)

            normalsList.push(n2.x, n2.y, n2.z)
            normalsList.push(n4.x, n4.y, n4.z)
            normalsList.push(n3.x, n3.y, n3.z)
        }
    }
    return [vertexList, normalsList, texture];
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function CalcAnalyticNormal(u, v, xyz)
{
    let DeltaU = 0.0001;
    let DeltaV = 0.0001;
    let uTangent = CalcDerivativeU(u, v, DeltaU, xyz)
    vec3Normalize(uTangent);
    let vTangent = CalcDerivativeV(u, v, DeltaV, xyz);
    vec3Normalize(vTangent);
    return vec3Cross(vTangent, uTangent);
}


function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}
function vec3Cross(a, b) {
    let x = a[1] * b[2] - b[1] * a[2];
    let y = a[2] * b[0] - b[2] * a[0];
    let z = a[0] * b[1] - b[0] * a[1];
    return { x: x, y: y, z: z }
}

function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}

function CalcDerivativeU(u, v, DeltaU, xyz) {
    let Dxyz = CalculateKnotClover(u + DeltaU, v);

    let Dxdu = (Dxyz.x - xyz.x) / deg2rad(DeltaU);
    let Dydu = (Dxyz.y - xyz.y) / deg2rad(DeltaU);
    let Dzdu = (Dxyz.z - xyz.z) / deg2rad(DeltaU);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(u, v, DeltaV, xyz) {
    let Dxyz = CalculateKnotClover(u, v + DeltaV);

    let Dxdv = (Dxyz.x - xyz.x) / deg2rad(DeltaV);
    let Dydv = (Dxyz.y - xyz.y) / deg2rad(DeltaV);
    let Dzdv = (Dxyz.z - xyz.z) / deg2rad(DeltaV);

    return [Dxdv, Dydv, Dzdv];
}

function CalculateKnotClover(u, v,) {
    let a = 0.5;
    let x = ((Radius + (a * Math.cos(u / 2))) * (Math.cos(u / 3))) + (a * Math.cos(u / 3) * Math.cos(v - Math.PI));
    let y = ((Radius + (a * Math.cos(u / 2))) * (Math.sin(u / 3))) + (a * Math.sin(u / 3) * Math.cos(v - Math.PI));
    let z = a + Math.sin(u / 2) + (a * Math.sin(v - Math.PI));
    return { x: x, y: y, z: z }
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    LoadTexture();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    canvas.onmousewheel = function (event) {
        if (+(surface.scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) < 0.0 || +(surface.scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) > 2.0) {
            return false;
        }
        surface.scale -= ((event.wheelDelta / 150) / 10.0);
        document.getElementById("scale").value = +surface.scale.toFixed(1);
        document.getElementById("scale_text").innerHTML = +surface.scale.toFixed(1);
        draw();
        return false;
    };
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/FeltMe/webgl-basics/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        let modelProg = createProgram(gl, vertexShaderSource, fragmentShaderSource);

        shProgram = new ShaderProgram('Basic', modelProg);
        shProgram.Use();
        surface = new Model('Surface', shProgram);
        let data = CreateKnotClover();
        surface.BufferData(data[0], data[1], data[2]);
    
        let lsProg = createProgram(gl, vertexShaderSource, fragmentShaderSource);
        let lsShProgram = new ShaderProgram('LightSource', lsProg);
        lsShProgram.Use();
        lightSource = new LightSource(lsShProgram);
        lightSource.SetPosition([0, 0, -2]);
        lightSource.Initialize();


        draw()
    }
}

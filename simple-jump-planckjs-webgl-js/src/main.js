import * as pl from "planck-js";
import { mat4, vec3 } from "gl-matrix";
import { gl, initWebGLContext } from "./webgl-context.js";
import Keyboard from "./keyboard.js";
import createShaderProgram from "./shader-program.js";

const groundPos = vec3.fromValues(200, 370, 0);
const groundSize = vec3.fromValues(390, 50, 1);

// Platforms
const platformPos = [];
const platformSize = [];
// Platform 0
platformPos.push(vec3.fromValues(100, 200, 0));
platformSize.push(vec3.fromValues(100, 30, 1));
// Platform 1
platformPos.push(vec3.fromValues(300, 100, 0));
platformSize.push(vec3.fromValues(100, 30, 1));

// Player
const playerPos = vec3.fromValues(200, 25, 0);
const playerSize = vec3.fromValues(50, 50, 1);
let playerBody, playerLinearVelocity;

const gravity = pl.Vec2(0, 35);
const world = pl.World(gravity);
const worldScale = 30;

const projViewMatrix = mat4.create();
const modelMatrix = mat4.create();
const mvpMatrix = mat4.create();

let uMvpLocation, uColorLocation;
let currentTime, deltaTime, lastTime;

const keyboard = new Keyboard()

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Ground
    gl.uniform3fv(uColorLocation, [0.450, 0.815, 0.443]);
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, groundPos);
    mat4.scale(modelMatrix, modelMatrix, groundSize);
    mat4.mul(mvpMatrix, projViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(uMvpLocation, false, mvpMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 6);    

    // Player
    gl.uniform3fv(uColorLocation, [1, 0.776, 0.4]);
    mat4.identity(modelMatrix);
    mat4.translate(modelMatrix, modelMatrix, playerPos);
    mat4.scale(modelMatrix, modelMatrix, playerSize);
    mat4.mul(mvpMatrix, projViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(uMvpLocation, false, mvpMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Platforms
    for (let i = 0; i < platformPos.length; i++)
    {
        gl.uniform3fv(uColorLocation, [0.450, 0.815, 0.443]);
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, platformPos[i]);
        mat4.scale(modelMatrix, modelMatrix, platformSize[i]);
        mat4.mul(mvpMatrix, projViewMatrix, modelMatrix);
        gl.uniformMatrix4fv(uMvpLocation, false, mvpMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

function update() {
    currentTime = Date.now();
    deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    world.step(deltaTime, 6, 2);

    playerLinearVelocity = playerBody.getLinearVelocity();

    if (keyboard.pressed("ArrowUp") || keyboard.pressed("w") || keyboard.pressed(" "))
    {
        playerLinearVelocity.y = -15;
    }

    if (keyboard.pressed("ArrowLeft") || keyboard.pressed("a"))
    {
        playerLinearVelocity.x = -5;
    }

    if (keyboard.pressed("ArrowRight") || keyboard.pressed("d"))
    {
        playerLinearVelocity.x = 5;
    }

    playerBody.setLinearVelocity(playerLinearVelocity);

    playerPos[0] = playerBody.getPosition().x * worldScale;
    playerPos[1] = playerBody.getPosition().y * worldScale;

    world.clearForces();

    draw();
    requestAnimationFrame(update);
}

function initVertexBuffers(program) {
    const vertPositions = [
        -0.5, -0.5, // First triangle
        -0.5, 0.5,
        0.5, -0.5,
        0.5, -0.5, // Second triangle
        -0.5, 0.5,
        0.5, 0.5
    ];

    const vertPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPositions), gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLocation);
}

function initPhysicsObjects() {
    // Groound
    let pos = pl.Vec2(groundPos[0] / worldScale, groundPos[1] / worldScale);
    const groundBody = world.createBody({ position: pos, type: "static" });
    let hx = groundSize[0] / worldScale / 2;
    let hy = groundSize[1] / worldScale / 2;
    const groundShape = pl.Box(hx, hy);
    groundBody.createFixture(groundShape, { friction: 0.9 });

    // Box
    pos = pl.Vec2(playerPos[0] / worldScale, playerPos[1] / worldScale);
    playerBody = world.createBody({ position: pos, type: "dynamic" });
    hx = playerSize[0] / worldScale / 2;
    hy = playerSize[1] / worldScale / 2;
    const boxShape = pl.Box(hx, hy);
    playerBody.createFixture(boxShape, { friction: 0.9 });
    playerBody.setFixedRotation(true);

    // Platforms
    for (let i = 0; i < platformPos.length; i++)
    {
        const pos = pl.Vec2(platformPos[i][0] / worldScale, platformPos[i][1] / worldScale);
        const platformBody = world.createBody({ position: pos, type: "static" });
        const hx = platformSize[i][0] / worldScale / 2;
        const hy = platformSize[i][1] / worldScale / 2;
        const platformShape = pl.Box(hx, hy);
        platformBody.createFixture(platformShape, { friction: 0.9 });
    }
}

async function init() {
    if (!initWebGLContext("renderCanvas")) return;
    gl.clearColor(0.862, 0.980, 0.972, 1.0);

    const program = await createShaderProgram("./assets/shaders/",
        "default.vert", "default.frag");
    initVertexBuffers(program);

    uMvpLocation = gl.getUniformLocation(program, "uMvpMatrix");
    uColorLocation = gl.getUniformLocation(program, "uColor")

    const projMatrix = mat4.create();
    mat4.ortho(projMatrix, 0, 400, 400, 0, 1, -1);
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [0, 0, 1], [0, 0, 0], [0, 1, 0]);
    mat4.mul(projViewMatrix, projMatrix, viewMatrix);

    initPhysicsObjects();

    lastTime = Date.now();
    update();
}

init();

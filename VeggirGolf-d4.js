/////////////////////////////////////////////////////////////////
//    S�nislausn � d�mi 4 � heimad�mum 6 � T�lvugraf�k
//     Forrit me� �remur mynstrum.  S�nir herbergi me� fj�rum
//     veggjum, g�lfi og lofti, hvert me� s�nu mynstrinu.  �a�
//     er h�gt a� ganga um herbergi�, en �a� er engin �rekstarv�rn.
//
//    Hj�lmt�r Hafsteinsson, mars 2018
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var numVertices = 6;

var program;

var pointsArray = [];
var texCoordsArray = [];

var texture;
var texVegg;
var texGolf;
var texLoft;

// Breytur fyrir hreyfingu �horfanda
var userXPos = 3.0; // Initial position of user
var userZPos = 6.0; //   in (x, z) coordinates, y is fixed


/* for collision */
var userprevX = 3.0;
var userprevZ = 6.0;


var userIncr = 0.1; // Size of forward/backward step
var userAngle = 270.0; // Direction of the user in degrees
var userXDir = 0.0; // X-coordinate of heading
var userZDir = -1.0; // Z-coordinate of heading


var movement = false;
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var proLoc;
var mvLoc;

/* board */
var board;

var direction = '';
// Hn�tar veggsins
var vertices = [
    vec4(-3.0, 0.0, 0.0, 1.0),
    vec4(3.0, 0.0, 0.0, 1.0),
    vec4(3.0, 1.0, 0.0, 1.0),
    vec4(3.0, 1.0, 0.0, 1.0),
    vec4(-3.0, 1.0, 0.0, 1.0),
    vec4(-3.0, 0.0, 0.0, 1.0),
    // Hn�tar g�lfsins (strax � eftir)
    vec4(-5.0, 0.0, 10.0, 1.0),
    vec4(5.0, 0.0, 10.0, 1.0),
    vec4(5.0, 0.0, 0.0, 1.0),
    vec4(5.0, 0.0, 0.0, 1.0),
    vec4(-5.0, 0.0, 0.0, 1.0),
    vec4(-5.0, 0.0, 10.0, 1.0)
];

// Mynsturhnit fyrir vegg
var texCoords = [
    vec2(0.0, 0.0),
    vec2(10.0, 0.0),
    vec2(10.0, 1.0),
    vec2(10.0, 1.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
    // Mynsturhnit fyrir g�lf
    vec2(0.0, 0.0),
    vec2(10.0, 0.0),
    vec2(10.0, 10.0),
    vec2(10.0, 10.0),
    vec2(0.0, 10.0),
    vec2(0.0, 0.0)
];


window.onload = function init() {
    /* mini map fyrir leik */


    /*************************************** */

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    /* read txt file */
    var read = new XMLHttpRequest();

    const URL = './demo.txt';
    /* false sync, true async */
    read.open('GET', URL, false);
    read.onload = () => {
        if (read.status >= 200 && read.status < 400) {
            board = read.response.split(/\r?\n/);
        } else {
            this.error();
        }
    };

    read.onerror = () => {
        this.error();
    };

    read.send();

    console.info(board);




    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Lesa inn og skilgreina mynstur fyrir vegg
    var veggImage = document.getElementById("VeggImage");
    texVegg = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texVegg);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, veggImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

    // Lesa inn og skilgreina mynstur fyrir g�lf
    var golfImage = document.getElementById("GolfImage");
    texGolf = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texGolf);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, golfImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Lesa inn og skilgreina mynstur fyrir loft
    var loftImage = document.getElementById("LoftImage");
    texLoft = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texLoft);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, loftImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);


    proLoc = gl.getUniformLocation(program, "projection");
    mvLoc = gl.getUniformLocation(program, "modelview");

    var proj = perspective(50.0, 1.0, 0.2, 100.0);
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));


    //event listeners for mouse
    canvas.addEventListener("mousedown", function (e) {
        movement = true;
        origX = e.clientX;
    });

    canvas.addEventListener("mouseup", function (e) {
        movement = false;
    });

    canvas.addEventListener("mousemove", function (e) {
        if (movement) {
            userAngle += 0.4 * (origX - e.clientX);
            userAngle %= 360.0;
            userXDir = Math.cos(radians(userAngle));
            userZDir = Math.sin(radians(userAngle));
            origX = e.clientX;
        }
    });

    // Event listener for keyboard
    window.addEventListener("keydown", function (e) {

        switch (e.keyCode) {
            case 87: // w
                userXPos += userIncr * userXDir;
                userZPos += userIncr * userZDir;
                direction = 'forward';
                break;
            case 83: // s
                userXPos -= userIncr * userXDir;
                userZPos -= userIncr * userZDir;
                direction = 'back';
                break;
            case 65: // a
                userXPos += userIncr * userZDir;
                userZPos -= userIncr * userXDir;
                direction = 'left';
                break;
            case 68: // d
                userXPos -= userIncr * userZDir;
                userZPos += userIncr * userXDir;
                direction = 'right';
                break;
        }

    });

    render();

}


var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var wallsCollision = [];

    var spaceZ = 0;
    for (let i = 0; i < board.length; i++) {
        var spaceX = 0;
        var wallRow = []
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j] === '-') {
                wallRow.push({
                    x: spaceX,
                    z: spaceZ,
                    sign: '-'
                });
            } else if (board[i][j] === '|') {
                wallRow.push({
                    x: spaceX,
                    z: spaceZ,
                    sign: '|'
                });
            }
            spaceX += 3;
        }
        wallsCollision.push(wallRow);
        spaceX = 0;
        spaceZ += 3;
    }

    /* collison */

    for (let i = 0; i < wallsCollision.length; i++) {
        for (let j = 0; j < wallsCollision[i].length; j++) {

            if (wallsCollision[i][j].x + 3 > userXPos && wallsCollision[i][j].x - 3 < userXPos && wallsCollision[i][j].z - 1 === Math.floor(userZPos) && wallsCollision[i][j].sign === '-') {
                if(userprevZ >= userZPos) {
                    userZPos += 1;
                } else {
                    userZPos -= 1;
                }
            }

            if (wallsCollision[i][j].z + 3 > userZPos && wallsCollision[i][j].z - 3 < userZPos && wallsCollision[i][j].x - 1 === Math.floor(userXPos) && wallsCollision[i][j].sign === '|') {
                if(userprevX >= userXPos) {
                    userXPos += 1;
                } else {
                    userXPos -= 1;
                }
            }
        }
    }
    // sta�setja �horfanda og me�h�ndla m�sarhreyfingu
    var mv = lookAt(vec3(userXPos, 0.5, userZPos), vec3(userXPos + userXDir, 0.5, userZPos + userZDir), vec3(0.0, 1.0, 0.0));


    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    var mv1 = mv;

    // Teikna g�lf me� mynstri/*
    gl.bindTexture(gl.TEXTURE_2D, texGolf);
    mv = mv1;
    mv = mult(mv, scalem(10.0, 10.0, 10.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, numVertices, numVertices);
    // Teikna loft me� mynstri
    /*
    gl.bindTexture( gl.TEXTURE_2D, texLoft );
    mv = mult( mv, translate( 0.0, 1.0, 0.0 ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays( gl.TRIANGLES, numVertices, numVertices );
    */
    // Teikna framvegg me� mynstri/*

    gl.bindTexture(gl.TEXTURE_2D, texVegg);


    var spaceZ = 0;
    for (let i = 0; i < board.length; i++) {

        var spaceX = 0;
        for (let j = 0; j < board[i].length; j++) {

            if (board[i][j] === '-') {
                /* main leikur */
                mv = mv1;
                mv = mult(mv, translate(spaceX, 0.0, spaceZ));
                gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
                gl.drawArrays(gl.TRIANGLES, 0, numVertices);
            } else if (board[i][j] === '|') {
                /* main leikur */
                mv = mv1;
                mv = mult(mv, translate(spaceX, 0.0, spaceZ));
                mv = mult(mv, rotateY(90.0));
                gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
                gl.drawArrays(gl.TRIANGLES, 0, numVertices);
            }
            spaceX += 3;
        }

        spaceX = 0;
        spaceZ += 3;


    }


    userprevX = userXPos;
    userprevZ = userZPos;
    requestAnimFrame(render);
}
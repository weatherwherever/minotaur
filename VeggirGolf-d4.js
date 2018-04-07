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

var mvLoc_minimap;

var wallHack = {
  count: 1,
  duration: 5000,
  active: false
};
/* board */
var board;

/* minimap */

var gl_minimap;

var direction = '';

/* ply */

var vBuffer;
var vBuffer2;
var vPosition;
var vNormal;
var nBuffer;
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
var wallsCollision = [];

/* ply */

var normals = [];

var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var normalMatrix, normalMatrixLoc;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 0.2, 0.0, 0.2, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 100.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  /* minimap */
  canvas_minimap = document.getElementById("minimap");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl_minimap = WebGLUtils.setupWebGL(canvas_minimap);
  if (!gl_minimap) {
    alert("WebGL isn't available");
  }

  gl_minimap.viewport(0, 0, canvas_minimap.width, canvas_minimap.height);
  gl_minimap.clearColor(0.9, 1.0, 1.0, 1.0);
  gl_minimap.enable(gl_minimap.DEPTH_TEST);
  program = initShaders(gl_minimap, "vertex-shader", "fragment-shader");
  gl_minimap.useProgram(program);

  var vBuffer = gl_minimap.createBuffer();
  gl_minimap.bindBuffer(gl_minimap.ARRAY_BUFFER, vBuffer);
  gl_minimap.bufferData(
    gl_minimap.ARRAY_BUFFER,
    flatten(vertices),
    gl_minimap.STATIC_DRAW
  );

  var vPosition = gl_minimap.getAttribLocation(program, "vPosition");
  gl_minimap.vertexAttribPointer(vPosition, 4, gl_minimap.FLOAT, false, 0, 0);
  gl_minimap.enableVertexAttribArray(vPosition);

  var tBuffer = gl_minimap.createBuffer();
  gl_minimap.bindBuffer(gl_minimap.ARRAY_BUFFER, tBuffer);
  gl_minimap.bufferData(
    gl_minimap.ARRAY_BUFFER,
    flatten(texCoords),
    gl_minimap.STATIC_DRAW
  );

  var vTexCoord = gl_minimap.getAttribLocation(program, "vTexCoord");
  gl_minimap.vertexAttribPointer(vTexCoord, 2, gl_minimap.FLOAT, false, 0, 0);
  gl_minimap.enableVertexAttribArray(vTexCoord);

  // Lesa inn og skilgreina mynstur fyrir vegg
  var veggImage = document.getElementById("VeggImage");
  texVegg = gl_minimap.createTexture();
  gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texVegg);
  gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
  gl_minimap.texImage2D(
    gl_minimap.TEXTURE_2D,
    0,
    gl_minimap.RGBA,
    gl_minimap.RGBA,
    gl_minimap.UNSIGNED_BYTE,
    veggImage
  );
  gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MIN_FILTER,
    gl_minimap.LINEAR_MIPMAP_LINEAR
  );
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MAG_FILTER,
    gl_minimap.LINEAR
  );

  gl_minimap.uniform1i(gl_minimap.getUniformLocation(program, "texture"), 0);

  // Lesa inn og skilgreina mynstur fyrir g�lf
  var golfImage = document.getElementById("GolfImage");
  texGolf = gl_minimap.createTexture();
  gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texGolf);
  gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
  gl_minimap.texImage2D(
    gl_minimap.TEXTURE_2D,
    0,
    gl_minimap.RGBA,
    gl_minimap.RGBA,
    gl_minimap.UNSIGNED_BYTE,
    golfImage
  );
  gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MIN_FILTER,
    gl_minimap.LINEAR_MIPMAP_LINEAR
  );
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MAG_FILTER,
    gl_minimap.LINEAR
  );

  // Lesa inn og skilgreina mynstur fyrir loft
  var loftImage = document.getElementById("LoftImage");
  texLoft = gl_minimap.createTexture();
  gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texLoft);
  gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
  gl_minimap.texImage2D(
    gl_minimap.TEXTURE_2D,
    0,
    gl_minimap.RGBA,
    gl_minimap.RGBA,
    gl_minimap.UNSIGNED_BYTE,
    loftImage
  );
  gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MIN_FILTER,
    gl_minimap.LINEAR_MIPMAP_LINEAR
  );
  gl_minimap.texParameteri(
    gl_minimap.TEXTURE_2D,
    gl_minimap.TEXTURE_MAG_FILTER,
    gl_minimap.LINEAR
  );

  gl_minimap.uniform1i(gl_minimap.getUniformLocation(program, "texture"), 0);

  proLoc = gl_minimap.getUniformLocation(program, "projection");
  mvLoc_minimap = gl_minimap.getUniformLocation(program, "modelview");

  var proj = perspective(50.0, 1.0, 0.2, 100.0);
  gl_minimap.uniformMatrix4fv(proLoc, false, flatten(proj));

  /****************************** */
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.9, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  /* read txt file */
  var read = new XMLHttpRequest();

  const URL = "./demo.txt";
  /* false sync, true async */
  read.open("GET", URL, false);
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
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    veggImage
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

  // Lesa inn og skilgreina mynstur fyrir g�lf
  var golfImage = document.getElementById("GolfImage");
  texGolf = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texGolf);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    golfImage
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Lesa inn og skilgreina mynstur fyrir loft
  var loftImage = document.getElementById("LoftImage");
  texLoft = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texLoft);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    loftImage
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

  proLoc = gl.getUniformLocation(program, "projection");
  mvLoc = gl.getUniformLocation(program, "modelview");

  var proj = perspective(50.0, 1.0, 0.2, 100.0);
  gl.uniformMatrix4fv(proLoc, false, flatten(proj));

  //event listeners for mouse
  canvas.addEventListener("mousedown", function(e) {
    movement = true;
    origX = e.clientX;
  });

  canvas.addEventListener("mouseup", function(e) {
    movement = false;
  });

  canvas.addEventListener("mousemove", function(e) {
    if (movement) {
      userAngle += 0.4 * (origX - e.clientX);
      userAngle %= 360.0;
      userXDir = Math.cos(radians(userAngle));
      userZDir = Math.sin(radians(userAngle));
      origX = e.clientX;
    }
  });

  // Event listener for keyboard
  window.addEventListener("keydown", function(e) {
    switch (e.keyCode) {
      case 87: // w
        userXPos += userIncr * userXDir;
        userZPos += userIncr * userZDir;
        direction = "forward";
        break;
      case 83: // s
        userXPos -= userIncr * userXDir;
        userZPos -= userIncr * userZDir;
        direction = "back";
        break;
      case 65: // a
        userXPos += userIncr * userZDir;
        userZPos -= userIncr * userXDir;
        direction = "left";
        break;
      case 68: // d
        userXPos -= userIncr * userZDir;
        userZPos += userIncr * userXDir;
        direction = "right";
        break;
      case 90: // z
        if (wallHack.count > 0) {
          wallHack.active = !wallHack.active;
          wallHack.start = Date.now();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);


    // get model
    var PR = PlyReader();
    var plyData = PR.read("minotaur-n.ply");

    plyvertices = plyData.points;
    plynormals = plyData.normals;

    gl_minimap.viewport(0, 0, canvas_minimap.width, canvas_minimap.height);
    gl_minimap.clearColor(0.9, 1.0, 1.0, 1.0);
    gl_minimap.enable(gl_minimap.DEPTH_TEST);
    program = initShaders(gl_minimap, "vertex-shader", "fragment-shader");
    gl_minimap.useProgram(program);

    vBufferMinimap = gl_minimap.createBuffer();
    gl_minimap.bindBuffer(gl_minimap.ARRAY_BUFFER, vBufferMinimap);
    gl_minimap.bufferData(gl_minimap.ARRAY_BUFFER, flatten(vertices), gl_minimap.STATIC_DRAW);

    vPosition = gl_minimap.getAttribLocation(program, "vPosition");
    gl_minimap.vertexAttribPointer(vPosition, 4, gl_minimap.FLOAT, false, 0, 0);
    gl_minimap.enableVertexAttribArray(vPosition);

    // Lesa inn og skilgreina mynstur fyrir vegg
    var veggImage = document.getElementById("VeggImage");
    texVegg = gl_minimap.createTexture();
    gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texVegg);
    gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
    gl_minimap.texImage2D(gl_minimap.TEXTURE_2D, 0, gl_minimap.RGBA, gl_minimap.RGBA, gl_minimap.UNSIGNED_BYTE, veggImage);
    gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MIN_FILTER, gl_minimap.LINEAR_MIPMAP_LINEAR);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MAG_FILTER, gl_minimap.LINEAR);

    gl_minimap.uniform1i(gl_minimap.getUniformLocation(program, "texture"), 0);

    // Lesa inn og skilgreina mynstur fyrir g�lf
    var golfImage = document.getElementById("GolfImage");
    texGolf = gl_minimap.createTexture();
    gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texGolf);
    gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
    gl_minimap.texImage2D(gl_minimap.TEXTURE_2D, 0, gl_minimap.RGBA, gl_minimap.RGBA, gl_minimap.UNSIGNED_BYTE, golfImage);
    gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MIN_FILTER, gl_minimap.LINEAR_MIPMAP_LINEAR);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MAG_FILTER, gl_minimap.LINEAR);

    // Lesa inn og skilgreina mynstur fyrir loft
    var loftImage = document.getElementById("LoftImage");
    texLoft = gl_minimap.createTexture();
    gl_minimap.bindTexture(gl_minimap.TEXTURE_2D, texLoft);
    gl_minimap.pixelStorei(gl_minimap.UNPACK_FLIP_Y_WEBGL, true);
    gl_minimap.texImage2D(gl_minimap.TEXTURE_2D, 0, gl_minimap.RGBA, gl_minimap.RGBA, gl_minimap.UNSIGNED_BYTE, loftImage);
    gl_minimap.generateMipmap(gl_minimap.TEXTURE_2D);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MIN_FILTER, gl_minimap.LINEAR_MIPMAP_LINEAR);
    gl_minimap.texParameteri(gl_minimap.TEXTURE_2D, gl_minimap.TEXTURE_MAG_FILTER, gl_minimap.LINEAR);

    gl_minimap.uniform1i(gl_minimap.getUniformLocation(program, "texture"), 0);


    proLoc = gl_minimap.getUniformLocation(program, "projection");
    mvLoc_minimap = gl_minimap.getUniformLocation(program, "modelview");

    var proj = perspective(50.0, 1.0, 0.2, 100.0);
    gl_minimap.uniformMatrix4fv(proLoc, false, flatten(proj));

    /****************************** */
    
    

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


    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    //
    //  Load shaders and initialize attribute buffers
    //

    // normals array attribute buffer
    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );
/*
    vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );
*/
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    vBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(plyvertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

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
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    proj = perspective(50.0, 1.0, 0.2, 100.0);
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess );

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
        break;
    }
  });

  render();
};

var render = function() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl_minimap.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var wallsCollision = [];

  var spaceZ = 0;
  for (let i = 0; i < board.length; i++) {
    var spaceX = 0;
    var wallRow = [];
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === "-") {
        wallRow.push({
          x: spaceX,
          z: spaceZ,
          sign: "-"
        });
      } else if (board[i][j] === "|") {
        wallRow.push({
          x: spaceX,
          z: spaceZ,
          sign: "|"
        });
      }
      spaceX += 3;
    }
    wallsCollision.push(wallRow);
    spaceX = 0;
    spaceZ += 3;
  }
  //wallhack weapon
  var timer = document.getElementById("timer");
  wallHack.elapsed = wallHack.active ? Date.now() - wallHack.start : null;
  timer.textContent = wallHack.active
    ? "þú hefur " +
      (wallHack.duration - wallHack.elapsed) +
      "ms til að fara í gegnum vegg"
    : null;

  if (wallHack.elapsed > wallHack.duration) {
    wallHack.active = false;
    wallHack.count--;
  }
  var weapons = document.getElementById("weapons");
  weapons.textContent = wallHack.count;

  /* collison */
  for (let i = 0; i < wallsCollision.length; i++) {
    for (let j = 0; j < wallsCollision[i].length; j++) {
      if (
        wallsCollision[i][j].x + 3 > userXPos &&
        wallsCollision[i][j].x - 3 < userXPos &&
        wallsCollision[i][j].z === Math.floor(userZPos) &&
        wallsCollision[i][j].sign === "-" &&
        !wallHack.active
      ) {
        if (userprevZ >= userZPos) {
          userZPos += 0.5;
        } else {
          userZPos -= 0.5;

    render();

}


var render = function () {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );
    
    
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl_minimap.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /* collison */

    for (let i = 0; i < wallsCollision.length; i++) {
        for (let j = 0; j < wallsCollision[i].length; j++) {

      if (
        wallsCollision[i][j].z + 3 > userZPos &&
        wallsCollision[i][j].z - 3 < userZPos &&
        wallsCollision[i][j].x === Math.floor(userXPos) &&
        wallsCollision[i][j].sign === "|" &&
        !wallHack.active
      ) {
        if (userprevX >= userXPos) {
          userXPos += 0.5;
        } else {
          userXPos -= 0.5;
        }
      }
    }
  }

  // sta�setja �horfanda og me�h�ndla m�sarhreyfingu
  var mv = lookAt(
    vec3(userXPos, 0.5, userZPos),
    vec3(userXPos + userXDir, 0.5, userZPos + userZDir),
    vec3(0.0, 1.0, 0.0)
  );

  var mvMiniMAP = lookAt(
    vec3(userXPos, 50, userZPos),
    vec3(userXPos + userXDir, 0.5, userZPos + userZDir),
    vec3(0.0, 1.0, 0.0)
  );

  gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mvMiniMAP));
  var tmp = mvMiniMAP;

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
      if (board[i][j] === "-") {
        /* main leikur */
        mv = mv1;
        mv = mult(mv, translate(spaceX, 0.0, spaceZ));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
        gl.drawArrays(gl.TRIANGLES, 0, numVertices);

        mv = tmp;
        mv = mult(mv, translate(spaceX, 0.0, spaceZ));
        gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mv));
        gl_minimap.drawArrays(gl.TRIANGLES, 0, numVertices);
      } else if (board[i][j] === "|") {
        /* main leikur */
        mv = mv1;
        mv = mult(mv, translate(spaceX, 0.0, spaceZ));
        mv = mult(mv, rotateY(90.0));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
        gl.drawArrays(gl.TRIANGLES, 0, numVertices);

        mv = tmp;
        mv = mult(mv, translate(spaceX, 0.0, spaceZ));
        mv = mult(mv, rotateY(90.0));
        gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mv));
        gl_minimap.drawArrays(gl.TRIANGLES, 0, numVertices);
      }
      spaceX += 3;
    }

    spaceX = 0;
    spaceZ += 3;
  }

    // sta�setja �horfanda og me�h�ndla m�sarhreyfingu
    var mv = lookAt(vec3(userXPos, 0.5, userZPos), vec3(userXPos + userXDir, 0.5, userZPos + userZDir), vec3(0.0, 1.0, 0.0));

    var mvMiniMAP = lookAt(vec3(userXPos, 50, userZPos), vec3(userXPos + userXDir, 0.5, userZPos + userZDir), vec3(0.0, 1.0, 0.0));


    gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mvMiniMAP));
    var tmp = mvMiniMAP;

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    var mv1 = mv;

    // Teikna g�lf me� mynstri/*
    gl.bindTexture(gl.TEXTURE_2D, texGolf);
    
    mv = mv1;
    mv = mult(mv, scalem(5.0, 5.0, 5.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, numVertices, numVertices);

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

                mv = tmp;
                mv = mult(mv, translate(spaceX, 0.0, spaceZ));
                gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mv));
                gl_minimap.drawArrays(gl.TRIANGLES, 0, numVertices);
            } else if (board[i][j] === '|') {
                /* main leikur */
                mv = mv1;
                mv = mult(mv, translate(spaceX, 0.0, spaceZ));
                mv = mult(mv, rotateY(90.0));
                gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
                gl.drawArrays(gl.TRIANGLES, 0, numVertices);

                
                mv = tmp;
                mv = mult(mv, translate(spaceX, 0.0, spaceZ));
                mv = mult(mv, rotateY(90.0));
                gl_minimap.uniformMatrix4fv(mvLoc_minimap, false, flatten(mv));
                gl_minimap.drawArrays(gl.TRIANGLES, 0, numVertices);
            }
            spaceX += 3;
        }

        spaceX = 0;
        spaceZ += 3;


    }

    gl.bindTexture( gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(tBuffer);
    gl.disableVertexAttribArray(vTexCoord);
    //// viðbætt

    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(normals) );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer2 );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(plyvertices) );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    modelViewMatrix = lookAt( vec3(0.0, 0.0, -3.0), at, up );
    modelViewMatrix = mult( modelViewMatrix, rotateY( 0 ) );
    modelViewMatrix = mult( modelViewMatrix, rotateX( 0 ) );

    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    gl.uniformMatrix4fv(mvLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );

    gl.drawArrays( gl.TRIANGLES, 0, plyvertices.length );


  userprevX = userXPos;
  userprevZ = userZPos;
  requestAnimFrame(render);
};

var width = window.innerWidth,
    height = window.innerHeight;

var key_u = false,
	key_d = false,
	key_l = false,
	key_r = false;

var user = null;
var users = Array();

var charaObj = null;
loadOBJ();
// ロードが終わるまで待つ
setTimeout( waitLoad, 1000 );
var socketio = null;
function waitLoad(){
	if( charaObj == null ){
		setTimeout( waitLoad, 1000 );
		return;
	}

	socketio = io();

	init();
	render();

	//--------
	// 受信処理
	// 新規応答
	socketio.on('init',function(msg){
		console.log('init: '+msg);
		user = createChara(msg);
	});

	// 場所受信
	socketio.on('pos',function(msg){
//		console.log('pos: '+msg);

		for( i in users ){
			users[i].exist = false;
		}
		for( i in msg ){
			if( msg[i].id == user.id ){
				// 自分は処理しない
				continue;
			}

			// 見知ったIDは更新
			update = false;
			for( j in users ){
				if( users[j].id == msg[i].id ){
					users[j].obj.position.x = msg[i].x;
					users[j].obj.position.z = msg[i].z;
					users[j].obj.rotation.y = msg[i].roty;
					users[j].name_mesh.rotation.setFromRotationMatrix(camera.matrix);
					users[j].name_mesh.position.set( users[j].obj.position.x, users[j].obj.position.y, users[j].obj.position.z );
					users[j].exist = true;

					update = true;
					break;
				}
			}
			// 知らないIDは作成
			if( update == false ){
				users.push(createChara(msg[i]));
			}
		}
		// 無くなったIDは削除
		for( i = users.length-1; i >= 0; i-- ){
			if( users[i].exist == false ){
				scene.remove( users[i].obj );
				scene.remove( users[i].name_mesh );
				users[i].name_geometry.dispose();
				users[i].name_material.dispose();
				users[i].name_texture.dispose();
				users.splice(i,1);
			}
		}
	});
}

// ステージの初期化
function init() {
    // renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor( 0x222222 ); // 背景色
    renderer.setSize( width, height );
    document.body.appendChild( renderer.domElement );

    // scene
    scene = new THREE.Scene();

    // camera
    var perscamera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 ); // fov(視野角),aspect,near,far
    var orthocamera = new THREE.OrthographicCamera( width / -2, width / 2, height / 2, height / -2, 1, 10000 );
    camera = perscamera;
    camera.position.set(300, 300, 300);
    camera.up.set(0, 1, 0);
    camera.lookAt({ x:0, y:0, z:0 });

    // add light ３点光にしてあげる
    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 1, 1, 1 );
    scene.add( light );
    var light = new THREE.DirectionalLight( 0x002288 );
    light.position.set( -1, -1, -1 );
    scene.add( light );
    var light = new THREE.AmbientLight( 0x444444 );
    scene.add( light );

    // controls （マウスとか）
	controls = new THREE.OrbitControls(camera);

    // XYZ の線
    var axis = new THREE.AxisHelper(1000);
    axis.position.set(0,0,0);
    scene.add(axis);

	// 地面
	var planeGeometry = new THREE.PlaneGeometry(1000, 1000);
	var planeMaterial = new THREE.MeshBasicMaterial({color: 0xeecccc});
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.rotation.x = -(Math.PI/2);
	scene.add(plane);
}

// 毎フレーム描画
function render(){
    requestAnimationFrame( render );

	if( user != null ){
		if( key_u == true ){
			user.dz -= 0.25;
			user.dz = Math.max(-4.5, user.dz);
		}else if( key_d == true ){
			user.dz += 0.25;
			user.dz = Math.min(4.5, user.dz);
		}else{
			user.dz /= 1.25;
		}
		if( key_l == true ){
			user.dx -= 0.25;
			user.dx = Math.max(-4.5, user.dx);
		}else if( key_r == true ){
			user.dx += 0.25;
			user.dx = Math.min(4.5, user.dx);
		}else{
			user.dx /= 1.25;
		}
		user.obj.position.x += user.dx;
		user.obj.position.z += user.dz;
		user.obj.position.x = Math.min( 450, user.obj.position.x );
		user.obj.position.x = Math.max(-450, user.obj.position.x );
		user.obj.position.z = Math.min( 450, user.obj.position.z );
		user.obj.position.z = Math.max(-450, user.obj.position.z );

		// 正面を向きたい
		if( user.dx != 0 || user.dz != 0 ){
			user.obj.rotation.y = Math.atan2(user.dx, user.dz);
		}

		user.name_mesh.rotation.setFromRotationMatrix(camera.matrix);
		user.name_mesh.position.set( user.obj.position.x, user.obj.position.y, user.obj.position.z );

		// 場所送信
		user.cnt++;
		if( user.cnt%5 == 0 ){
			send = {
				id: user.id,
				x: user.obj.position.x,
				z: user.obj.position.z,
				roty: user.obj.rotation.y
			};
			socketio.emit('pos', send);
		}
	}

	// 自分以外描画

    renderer.render( scene, camera );
}

// キャラオブジェロード
function loadOBJ() {
    // obj mtl を読み込んでいる時の処理
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    // obj mtl が読み込めなかったときのエラー処理
    var onError = function ( xhr ) {    };

    // obj mtlの読み込み
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath( 'model/'  );              // this/is/obj/path/
    mtlLoader.load( '12248_Bird_v1_L2.mtl', function( materials ) {
		materials.preload();
		var objLoader = new THREE.OBJLoader();
		objLoader.setMaterials( materials );
		objLoader.setPath( 'model/' );            // this/is/obj/path/
		objLoader.load( '12248_Bird_v1_L2.obj', function ( object ) {
			objmodel = object.clone();
			objmodel.scale.set(1, 1, 1);      // 縮尺の初期化
			objmodel.rotation.set(-(Math.PI/2), 0, 0);         // 角度の初期化
			objmodel.position.set(0, 0, 0);         // 位置の初期化

	    	// objをObject3Dで包む
	        charaObj = new THREE.Object3D();
	        charaObj.add(objmodel);

		}, onProgress, onError );
    });
}

// キャラオブジェ作成
function createChara( data )
{
	// 画像
	newObj = charaObj.clone();
	newObj.position.x = data.x;
	newObj.position.z = data.z;
	scene.add(newObj);

	// 名前プレート
	var texture = createTexture(data.id);
	var material = new THREE.MeshBasicMaterial({
		map: texture,
		side: THREE.DoubleSide,
		transparent: true
	});
	var geometry = new THREE.PlaneGeometry(texture_size.width, texture_size.height);
	mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	newUser = {
		id: data.id,
		obj: newObj,
		name_texture: texture,
		name_material: material,
		name_geometry: geometry,
		name_mesh: mesh,
		cnt: 0,
		dx: 0,
		dz: 0,
		exist: true
	};

	return newUser;
}

var font_family = "bold 30px 'Hiragino Kaku Gothic ProN' ,'メイリオ', sans-serif"
var texture_size = {
	width: 256,
	height: 256
};
function createTexture(text) {
	var canvas_ = document.createElement('canvas');
	canvas_.width = texture_size.width;
	canvas_.height = texture_size.height;

	var context = canvas_.getContext('2d');

	context.fillStyle = 'rgba(0, 0, 0, 0.0)';
	context.fillRect(0, 0, texture_size.width, texture_size.height);
	  
	var y_ = texture_size.height * 0.275;

	context.font = font_family;
	context.textAlign = 'left';
	context.fillStyle = "#ffffff";

	var x_ = context.measureText(text).width;
	x_ = (texture_size.width - x_) * 0.5;

	context.fillText(text, x_, y_);

	var texture_ = new THREE.Texture(canvas_);
	texture_.needsUpdate = true;

	return texture_;
}

// 三角関数
function degreeToRadian(degree)
{
	return degree * (Math.PI / 180);
}
function d2r(d)
{
	return degreeToRadian(d);
}
function radianToDegree(radian)
{
	return radian * (180 / Math.PI);
}
function r2d(r)
{
	return radianToDegree(r);
}

// キーを押した時の処理
document.onkeydown = KeyDownFunc;
function KeyDownFunc(e){
	switch(e.keyCode){
	case 87:
		key_u = true;
		break;
	case 83:
		key_d = true;
		break;
	case 65:
		key_l = true;
		break;
	case 68:
		key_r = true;
		break;
	}
}
document.onkeyup = KeyUpFunc;
function KeyUpFunc(e){
	switch(e.keyCode){
	case 87:
		key_u = false;
		break;
	case 83:
		key_d = false;
		break;
	case 65:
		key_l = false;
		break;
	case 68:
		key_r = false;
		break;
	}
}


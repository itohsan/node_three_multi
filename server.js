var express = require('express');
var app = express();
var http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 7000;
var uid = 0;
var users = Array();
var field_size = {
	x: 1000,
	z: 1000
};

// 静的ドキュメントの許可
app.use(express.static('public'));

// ルートドキュメント
app.get('/' , function(req, res){
	//res.send('hello world');
	res.sendFile(__dirname + '/public/index.html');
});

// コネクション
io.on('connection',function(socket){
	// 新規接続
	socket.uid = uid++;
	console.log('connect:'+socket.uid);

	user = {};
	user.id = socket.uid;
	user.x = (field_size.x*0.9)*Math.random()-(field_size.x*0.9/2);
	user.z = (field_size.z*0.9)*Math.random()-(field_size.z*0.9/2);
	users.push(user);
	io.to(socket.id).emit('init', user);

	// 場所受信
	socket.on('pos',function(msg){
		// 自分を移動
		for( i = 0; i < users.length; i++ ){
			if( users[i] != undefined && users[i].id == socket.uid ){
//				console.log('pos:'+msg);
				users[i].x = msg.x;
				users[i].z = msg.z;
				users[i].roty = msg.roty;
				break;
			}
		}

		// 場所配布
		io.emit('pos', users);
	});

	// 切断
    socket.on('disconnect', function() {
		// 自分を削除
		for( i = 0; i < users.length; i++ ){
			if( users[i] != undefined && users[i].id == socket.uid ){
				console.log('disconnect:'+socket.uid);
				users.splice(i,1);
				break;
			}
		}
    });
});

// サーバ起動
http.listen(PORT, function(){
	console.log('server listening. Port:' + PORT);
});
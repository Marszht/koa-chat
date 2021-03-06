const koa =require("koa");
const path=require("path");
var sio = require('socket.io');  
const app = new koa();
const mongoose=require("mongoose");
const jwt = require('jsonwebtoken');
const views = require('koa-views');
 const route =require("koa-route");
const bodyparser =require("koa-bodyparser");
const koaBody = require('koa-body');
const koaJwt =require("koa-jwt");
 mongoose.connect('mongodb://localhost:27017/bishe2');
const people =require("./lib/people");
const util = require('util')
const verify = util.promisify(jwt.verify) // 解密
const  staticServer = require('koa-static'); 

const allowPath=  ['/','/login','/register','/user/Login','/user/register','/chatList']; //数组中的路径不需要通过jwt验证
app.use(staticServer(path.join(__dirname,'public'))); 
/*JWT*/
//验证头部是否有token

app.use((ctx, next) => {
    return next().catch((err) => {
        if(err.status === 401){
            ctx.status = 401;
            ctx.body = 'Protected resource, use Authorization header to get access\n';
        }else{
            throw err;
        }
    });
  });  

app.use(koaJwt({secret:'hjwscrazy'}).unless({
        path:allowPath //数组中的路径不需要通过jwt验证
    }))
app.use(koaBody({
  multipart:true, // 支持文件上传
  formidable:{
    uploadDir:path.join(__dirname,'public/upload/'), // 设置文件上传目录
    keepExtensions: true,    // 保持文件的后缀
    maxFieldsSize:2 * 1024 * 1024, // 文件上传大小 
  }
})); 




//jwt解密 
 app.use(async(ctx,next)=>{ 
   const reqPath =ctx.path;
   if(allowPath.indexOf(reqPath)<0){
     const params={};
     const token = ctx.request.header.authorization; 
     const  payload = await verify(token.split(' ')[1], "hjwscrazy");
     params.username=payload.username;
     params.id=payload.id;
     ctx.request.userInfo=params;
   } 
    await next();
 });
 
//ejs模板渲染
app.use(views('view',{extension:'ejs'}));

//登录
app.use(route.get('/',async(ctx)=>{ 
	 await ctx.render('login',{})
})); 

//注册
app.use(route.get('/register',async(ctx)=>{ 
	 await ctx.render('userRegister',{})
}));

//聊天列表页面
app.use(route.get('/chatList',async(ctx)=>{  
	 await ctx.render('chatList',{})
}));
//聊天窗口
app.use(route.get('/chat',async(ctx)=>{ 
	 await ctx.render('chat',{})
}));




//操作数据库方法

//用户登录
app.use(route.post('/user/Login',people.dologin));//插入操作
//用户注册
app.use(route.post('/user/register',people.registerPeople));//插入操作

//渲染聊天列表页面聊天
app.use(route.get('/chat/getFriendList',people.chatPeopleList));

const server=app.listen(3000,function(){console.log("服务已经启动")});


var io = sio.listen(server);  
io.sockets.on("connection",function(socket){
   socket.on("join",function(name,img){ 
      socket.nickname=name;
      socket.headImage=img;
      socket.broadcast.emit("announcement",name+"join this chat");
   });
   socket.on("text",function(mes,fn){
    socket.broadcast.emit("text",socket.nickname,mes,socket.headImage);
    fn(Date.now());
   });
});

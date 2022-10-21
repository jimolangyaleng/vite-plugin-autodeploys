<h1 align="center">vite-plugin-autodeploys</h1>
<p align="center">前端自动化部署方案</p>

![fenjing](https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimg.jj20.com%2Fup%2Fallimg%2F1113%2F032120114622%2F200321114622-4-1200.jpg&refer=http%3A%2F%2Fimg.jj20.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1652344404&t=ff628030564042459fa619b274b204a0)


##使用

1.npm install vite-plugin-autodeploys   
2.vite.config.js中引入import vitePluginAutodeploys from 'vite-plugin-autodeploys'   
3.在plugin中添加并使用  
```javascript
plugins: [
  vue(),
  vitePluginAutodeploys({
    "dev":{
      host:'xxx.xxx.xxx.xxx',//服务器IP
      port:22,//服务器端口
      username:'xxxxxx',//服务器ssh登录用户名
      password:'xxxxxx',//服务器ssh登录密码
      serverpath:'/www/xxxx/xxxx',//服务器web目录 
    },
    "test":{
      host:'xxx.xxx.xxx.xxx',//服务器IP
      port:22,//服务器端口
      username:'xxxxxx',//服务器ssh登录用户名
      password:'xxxxxx',//服务器ssh登录密码
      serverpath:'/www/xxxx/xxxx',//服务器web目录
    }
    //...其他自定义环境
  }),
]
```
6.npm run build

#注意
- 当不输入0时只会打包zip包不会部署
 - serverpath参数路径 会自动检测是否存在不存在会创建目录 若存在会清空当前目录
 - vite.config.js中若未配置 build.outDir（打包文件名夹名称） 将会使用默认值 'dist';

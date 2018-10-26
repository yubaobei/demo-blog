// Notes:
// © Copyright 2017 EntIT Software LLC, a Micro Focus company
//
//  Permission is hereby granted, free of charge, to any person obtaining a
//  copy of this software and associated documentation files (the "Software"),
//  to deal in the Software without restriction, including without limitation
//  the rights to use, copy, modify, merge, publish, distribute, sublicense,
//  and/or sell copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.
const path = require('path')
const Logger = require('./framework/logger')
const session = require('express-session')
const formidableMiddleware = require('express-formidable')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const express = require('express')
const pkg = require('./package')
const http = require('http')
const https = require('https')
const fs = require('fs')
const bodyParser = require('body-parser')
const config = require('config-lite')(__dirname)
const {
  loadRoutes
} = require('./routes/index')
const {
  defaultMiddleware
} = require('./middlewares/default')

class Application {
  constructor (options = {}) {
    let defaultOpt = {
      port: config.port
    }
    this.app = express()
    this.options = Object.assign(defaultOpt, options)
    let loggerConfig = config.logger
    this.logger = new Logger(loggerConfig)
  }

  setMiddleWare () {
    this.logger.info('Start loading middleware...')
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.set('views', path.join(__dirname, 'views'))
    this.app.set('view engine', 'ejs')
    this.app.use(express.static(path.join(__dirname, 'public')))

    this.app.use(session({
      name: config.session.key, // 设置 cookie 中保存 session id 的字段名称
      secret: config.session.secret, // 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改
      resave: true, // 强制更新 session
      saveUninitialized: false, // 设置为 false，强制创建一个 session，即使用户未登录
      cookie: {
        maxAge: config.session.maxAge// 过期时间，过期后 cookie 中的 session id 自动删除
      },
      store: new MongoStore({// 将 session 存储到 mongodb
        url: config.mongodb// mongodb 地址
      })
    }))
    // flash 中间件，用来显示通知
    this.app.use(flash())

    // 处理表单及文件上传的中间件
    this.app.use(formidableMiddleware({
      uploadDir: path.join(__dirname, 'public/img'), // 上传文件目录
      keepExtensions: true// 保留后缀
    }))

    // show request path a
    this.app.use(defaultMiddleware)

    // 设置模板全局常量
    this.app.locals.blog = {
      title: pkg.name,
      description: pkg.description
    }

    // 添加模板必需的三个变量
    this.app.use(function (req, res, next) {
      res.locals.user = req.session.user
      res.locals.success = req.flash('success').toString()
      res.locals.error = req.flash('error').toString()
      next()
    })

    this.app.use(function (err, req, res, next) {
      req.flash('error', err.message)
      res.redirect('/posts')
    })
  }

  setRouter () {
    this.logger.info('Start loading routes...')
    loadRoutes(this.app)
  }

  run () {
    this.logger.info('Start running server...')
    let myblogServer = null
    if (process.env.NODE_ENV === 'production') {
      let keyFile = process.env.MY_BLOG_PRIVATEKEY
      let certFile = process.env.MY_BLOG__CERTFICATE
      let caFile = process.env.MY_BLOG_CA_FILE
      let options = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
        ca: [fs.readFileSync(caFile)]
      }
      myblogServer = https.createServer(options, this.app)
    } else {
      myblogServer = http.createServer(this.app)
    }
    this.setMiddleWare()
    this.setRouter()
    myblogServer.listen(this.options.port, () => {
      this.logger.info(`${pkg.name} listening on port ${myblogServer.address().port}`)
    })
    return {
      app: this.app,
      server: myblogServer
    }
  }
}

module.exports = Application

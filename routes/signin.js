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
const sha1 = require('sha1')
const express = require('express')
const router = express.Router()

const UserModel = require('../models/users')
const checkNotLogin = require('../middlewares/check').checkNotLogin

// GET /signin 登录页
router.get('/', checkNotLogin, function (req, res, next) {
  res.render('signin')
})

// POST /signin 用户登录
router.post('/', checkNotLogin, function (req, res, next) {
  const name = req.fields.name
  const password = req.fields.password

  // 校验参数
  try {
    if (!name.length) {
      throw new Error('请填写用户名')
    }
    if (!password.length) {
      throw new Error('请填写密码')
    }
  } catch (e) {
    req.flash('error', e.message)
    return res.redirect('back')
  }

  UserModel.getUserByName(name)
    .then(function (user) {
      if (!user) {
        req.flash('error', '用户不存在')
        return res.redirect('back')
      }
      // 检查密码是否匹配
      if (sha1(password) !== user.password) {
        req.flash('error', '用户名或密码错误')
        return res.redirect('back')
      }
      req.flash('success', '登录成功')
      // 用户信息写入 session
      delete user.password
      req.session.user = user
      // 跳转到主页
      res.redirect('/posts')
    })
    .catch(next)
})

module.exports = router

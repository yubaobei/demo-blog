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
const logger = require('winston')
require('winston-daily-rotate-file')
const { combine, timestamp, label, printf, colorize } = logger.format

class Logger {
  constructor (config) {
    let dailyFileName = `${config.logDir}/mybolg-%DATE%.log`
    let sbotFormat = printf(info => {
      info.stack = info.stack ? '\n' + info.stack : ''
      return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}${info.stack}`
    })
    let sbotFormatLabel = { label: config.logLabel }
    let sbotFormatTimestamp = { format: 'YYYY-MM-DD HH:mm:ss' }
    let enumerateErrorFormat = logger.format(info => {
      if (info.message instanceof Error) {
        info.message = Object.assign({
          message: info.message.message,
          stack: info.message.stack
        }, info.message)
      }

      if (info instanceof Error) {
        return Object.assign({
          message: info.message,
          stack: info.stack
        }, info)
      }

      return info
    })
    let dailyRotateFileTransport = new (logger.transports.DailyRotateFile)({
      filename: dailyFileName,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: config.maxLogFilesTime,
      level: config.logLevel
    })
    let consoleTransport = new (logger.transports.Console)({
      format: combine(
        label(sbotFormatLabel),
        timestamp(sbotFormatTimestamp),
        colorize(),
        sbotFormat
      ),
      level: config.logLevel
    })
    let transports = [
      consoleTransport,
      dailyRotateFileTransport
    ]

    logger.configure({
      format: combine(
        enumerateErrorFormat(),
        label(sbotFormatLabel),
        timestamp(sbotFormatTimestamp),
        sbotFormat
      ),
      transports,
      exitOnError: false
    })
    logger.warning = logger.warn
    return logger
  }
}

module.exports = Logger

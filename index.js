const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const GridFsStream = require('gridFs-stream');
const MethodOverride = require('method-override');
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const mongodb = 'mongodb://localhost:27017/mydb'
const connect = mongoose.createConnection(mongodb, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const app = express()
app.set('view engine', 'ejs')

app.use(bodyParser.json())
app.use(MethodOverride('_method'))
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            res.render('index', {
                files: false
            })
            return
        }
        files.map(file => {
            // 如果是以下图片类型我们就在前端展示出来，其余一律按附件处理，通过 isImage 来区分图片和非图片            
            const imageType = ['image/png', 'image/jpg', 'image/gif', 'image/jpeg']
            if (imageType.includes(file.contentType)) {
                file.isImage = true
            } else {
                file.isImage = false
            }
        })
        res.render('index', {
            files: files
        })
    })
})
// 定义gfs变量，后续我们进行数据库文件操作的时候可不能少
let gfs;
connect.once('open', () => {
    // 监听数据库开启，通过 gridfs-stream 中间件和数据库进行文件的出入控制    
    gfs = GridFsStream(connect.db, mongoose.mongo)
    gfs.collection('upload')
    // 它会在我们数据库中建立 upload.files(记录文件信息)  upload.chunks(存储文件块)
})

// 使用 multer-gridfs-storage Multer 中间件来讲我们上传的附件直接存储到MongoDb
const storage = new GridFsStorage({
    url: mongodb,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const fileinfo = {
                filename: file.originalname,
                bucketName: 'upload'
            }
            resolve(fileinfo)
        })
    }
})

const upload = multer({
    storage
})
app.post('/upload', upload.single('file'), (req, res) => {
    console.log(req);
    res.redirect('/')
})
// 删除文件
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'upload' }, (err) => {
        if (err) {
            return res.status(404).json({
                err: '删除的文件不存在！'
            })
        }
        res.redirect('/')
    })
})
// 图片
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: '文件不存在！'
            })
        }
        const imageType = ['image/png', 'image/jpg', 'image/gif', 'image/jpeg']
        if (imageType.includes(file.contentType)) {
            const readstream = gfs.createReadStream(file.filename)
            readstream.pipe(res)
        } else {
            return res.status(404).json({
                err: '非图片'
            })
        }
    })
})

const port = 3030
app.listen(port), () => {
    console.log(`serve is running`);
}

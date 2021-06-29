const express = require('express');
const app = express();
require('dotenv').config()
require('./database')
//const cors = require('cors')
const cookieParser = require('cookie-parser')

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-with, Content-type, Accept");
    
    console.log("headers")
    next();

})

const authRoutes = require('./routes/authRoutes');
//app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(authRoutes);

const http = require('http').createServer(app);

const socketio = require('socket.io')
const io = socketio(http);

function sendHeartbeat(){ 
    setTimeout(sendHeartbeat, 8000); 
    io.sockets.emit('ping', { beat : 1 }); 
} 

setTimeout(sendHeartbeat, 8000);

const {
    addUser,
    getUser,
    removeUser
} = require('./helper');
const Message = require('./models/Message');
const PORT = process.env.PORT;
const Room = require('./models/Room');

app.get('/', (req, res) => {
    res.send('conectado')
})

app.get('/set-cookies', (req, res) => {
    res.cookie('username', 'Tony');
    res.cookie('isAuthenticated', true, {
        maxAge: 24 * 60 * 60 * 1000
    });
    res.send('cookies are set');
})
app.get('/get-cookies', (req, res) => {
    const cookies = req.cookies;
    console.log(cookies);
    res.json(cookies);
})

io.on('connection', (socket) => {
    console.log(socket.id);
    console.log("connection 1")
    Room.find().then(result => {
        socket.emit('output-rooms', result)
        console.log("connection 2")
    })
    socket.on('create-room', name => {

        const room = new Room({
            name
        });
        room.save().then(result => {
            io.emit('room-created', result)
        })
    })
    socket.on('join', ({
        name,
        room_id,
        user_id
    }) => {
        const {
            error,
            user
        } = addUser({
            socket_id: socket.id,
            name,
            room_id,
            user_id
        })
        socket.join(room_id);
        console.log("connection 3")
        if (error) {
            console.log('join error', error)
        } else {
            console.log('join user', user)
        }
    })
    socket.on('sendMessage', (message, room_id, callback) => {
        const user = getUser(socket.id);
        const msgToStore = {
            name: user.name,
            user_id: user.user_id,
            room_id,
            text: message
        }
        console.log('message', msgToStore)
        const msg = new Message(msgToStore);
        msg.save().then(result => {
            io.to(room_id).emit('message', result);
            console.log("connection4")
            callback()
        })

    })
    
    socket.on('get-messages-history', room_id => {
        Message.find({
            room_id
        }).then(result => {
            console.log("connection5")
            socket.emit('output-messages', result)
        })
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        console.log('socket desconectado')
    })
});


http.listen(process.env.PORT, () => {
    console.log(`listening on port ${PORT}`);
});
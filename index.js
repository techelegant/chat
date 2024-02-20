const express = require("express")
const app = express()
const socketio = require("socket.io")
const port = process.env.port || 3000
const http = require("http")
const server = http.createServer(app)
const io = socketio(server)
const hbs = require("hbs")
const path = require("path")
const publicDirPath = path.join(__dirname,"../public")
const {addUser,removeUser,getUser,getUsersInRoom} = require("./users.js")

app.use(express.static(publicDirPath))
app.set("view engine","hbs")

const getmessagedisp = (username,message) => {
    return {
        username,
        message,
        createdAt: new Date().getTime()
    }
}
const getlocationdisp = (username,url) => {
    return {
        username,
        url,
        createdAt: new Date().getTime()
    }
}

io.on("connection",(socket) => {
    console.log("Connected!")

    //send message only for join room users
    socket.on("join",({username,room},callback) => {      
        const {error,user} = addUser({id: socket.id,username,room})

        if(error){
            return callback(error)
        }

        socket.join(user.room)        
        socket.emit("message",getmessagedisp("Admin",`Welcome to ${user.username} in ${user.room} room!`))        
        socket.broadcast.to(user.room).emit("message",getmessagedisp("Admin",`${user.username} has joined!`))

        io.to(user.room).emit("userlistinroom",{
            roomname: user.room,
            userdata: getUsersInRoom(user.room)
        })
        callback()
    })
    //send message to singal user from server
    //socket.emit("message",getmessagedisp("Welcome!"))

    //send message to other users about this current user connected
    //socket.broadcast.emit("message",getmessagedisp("New user is connected!"))
    
    //call event "sendmessage" which call from chat.js singal user 
    socket.on("sendmessage",(message,callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit("message",getmessagedisp(user.username,message))
        //send message to all user from server
        //io.emit("message",getmessagedisp(message))
        callback()
    })
    
    //call event "sendlocation" which call from chat.js singal user 
    socket.on("sendlocation",(location,callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit("locationmsg",getlocationdisp(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`))
        //send message to all user from server
        //io.emit("locationmsg",getlocationdisp(`https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on("disconnect",() => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit("message",getmessagedisp("Admin",`${user.username} has left!`))
            io.to(user.room).emit("userlistinroom",{ roomname: user.room, userdata: getUsersInRoom(user.room) })
        }
    })
})

server.listen(port,() => {
    console.log(`Server is up on ${port} port`)
})

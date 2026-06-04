const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

const rooms = {};

module.exports = (io) => {
    io.on('connection', (socket) => {

        socket.on('create-room', async ({ roomName, language, username }, cb) => {
            const roomId = uuidv4().slice(0, 8).toUpperCase();
            await Room.create({ roomId, name: roomName, language, code: '' });
            rooms[roomId] = new Set();
            cb({ roomId });
        });

        socket.on('join-room', async ({ roomId, username }, cb) => {
            const room = await Room.findOne({ roomId });
            if (!room) return cb({ error: 'Room not found' });
            socket.join(roomId);
            if (!rooms[roomId]) rooms[roomId] = new Set();
            rooms[roomId].add({ socketId: socket.id, username });
            cb({ code: room.code, language: room.language, roomName: room.name });
            socket.to(roomId).emit('user-joined', { username });
            io.to(roomId).emit('users-update', [...rooms[roomId]].map(u => u.username));
            socket.roomId = roomId;
            socket.username = username;
        });

        socket.on('code-change', async ({ roomId, code }) => {
            socket.to(roomId).emit('code-update', { code });
            await Room.findOneAndUpdate({ roomId }, { code });
        });

        socket.on('language-change', ({ roomId, language }) => {
            socket.to(roomId).emit('language-update', { language });
            Room.findOneAndUpdate({ roomId }, { language }).exec();
        });

        socket.on('disconnect', () => {
            const { roomId, username } = socket;
            if (roomId && rooms[roomId]) {
                rooms[roomId].forEach(u => {
                    if (u.socketId === socket.id) rooms[roomId].delete(u);
                });
                io.to(roomId).emit('user-left', { username });
                io.to(roomId).emit('users-update', [...rooms[roomId]].map(u => u.username));
            }
        });
    });
};
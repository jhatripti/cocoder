const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

const rooms = {};

module.exports = (io) => {
    io.on('connection', (socket) => {

        socket.on('create-room', async ({ roomName, language, username }, cb) => {
            const roomId = uuidv4().slice(0, 8).toUpperCase();
            await Room.create({ roomId, name: roomName, language, code: '' });
            rooms[roomId] = new Map();
            cb({ roomId });
        });

        socket.on('join-room', async ({ roomId, username }, cb) => {
            const room = await Room.findOne({ roomId });
            if (!room) return cb({ error: 'Room not found' });

            socket.join(roomId);
            if (!rooms[roomId]) rooms[roomId] = new Map();

            // Use socketId as key to avoid duplicates
            rooms[roomId].set(socket.id, username);

            cb({ code: room.code, language: room.language, roomName: room.name });
            socket.to(roomId).emit('user-joined', { username });

            // Send unique usernames
            io.to(roomId).emit('users-update', [...rooms[roomId].values()]);

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
                rooms[roomId].delete(socket.id);
                io.to(roomId).emit('user-left', { username });
                io.to(roomId).emit('users-update', [...rooms[roomId].values()]);
            }
        });
    });
};
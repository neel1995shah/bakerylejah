export const initSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', (role) => {
      // e.g. role = "manager" or "worker_user_id"
      socket.join(role);
      console.log(`Socket ${socket.id} joined room ${role}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
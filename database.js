const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = { users: [], posts: [], messages: [], likes: [] };
        writeData(initialData);
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const users = {
    getAll: (exceptId) => {
        const data = readData();
        return data.users.filter(u => u.id !== exceptId).map(u => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
        });
    },
    getById: (id) => {
        const data = readData();
        return data.users.find(u => u.id === id);
    },
    getByEmail: (email) => {
        const data = readData();
        return data.users.find(u => u.email === email);
    },
    insert: (user) => {
        const data = readData();
        const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
        const newUser = { id: newId, ...user };
        data.users.push(newUser);
        writeData(data);
        return { lastInsertRowid: newId };
    },
    update: (id, updates) => {
        const data = readData();
        const index = data.users.findIndex(u => u.id === id);
        if (index !== -1) {
            data.users[index] = { ...data.users[index], ...updates };
            writeData(data);
        }
    }
};

const posts = {
    getAll: () => {
        const data = readData();
        return data.posts;
    },
    insert: (post) => {
        const data = readData();
        const newId = data.posts.length > 0 ? Math.max(...data.posts.map(p => p.id)) + 1 : 1;
        const newPost = { id: newId, ...post, created_at: new Date().toISOString() };
        data.posts.push(newPost);
        writeData(data);
        return { lastInsertRowid: newId };
    }
};

const messages = {
    getBetween: (userId, otherId) => {
        const data = readData();
        return data.messages.filter(m => 
            (m.sender_id === userId && m.receiver_id === otherId) ||
            (m.sender_id === otherId && m.receiver_id === userId)
        );
    },
    insert: (message) => {
        const data = readData();
        const newId = data.messages.length > 0 ? Math.max(...data.messages.map(m => m.id)) + 1 : 1;
        const newMessage = { id: newId, ...message, created_at: new Date().toISOString() };
        data.messages.push(newMessage);
        writeData(data);
        return { lastInsertRowid: newId };
    }
};

const likes = {
    insert: (userId, likedId) => {
        const data = readData();
        if (!data.likes.find(l => l.user_id === userId && l.liked_id === likedId)) {
            data.likes.push({ user_id: userId, liked_id: likedId });
            writeData(data);
        }
    },
    checkMatch: (userId, likedId) => {
        const data = readData();
        return data.likes.some(l => l.user_id === userId && l.liked_id === likedId) &&
               data.likes.some(l => l.user_id === likedId && l.liked_id === userId);
    }
};

module.exports = { users, posts, messages, likes };

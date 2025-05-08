// Temporary mock Firebase admin for development
const mockAdmin = {
    auth() {
        return {
            verifyIdToken: async function() {
                return { uid: 'test-user' };
            },
            createUser: async function() {
                return { uid: 'test-user' };
            }
        };
    }
};

module.exports = mockAdmin;
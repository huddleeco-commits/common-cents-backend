const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 Auth middleware called');
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🔐 Token extracted:', token ? 'Yes' : 'No');

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ JWT verification failed:', err.message);
            console.log('❌ JWT_SECRET configured:', !!process.env.JWT_SECRET);
            return res.status(403).json({ success: false, error: 'Invalid token' });
        }
        
        // Preserve all user data from JWT
        console.log('✅ Token verified, user ID:', user.id);
        console.log('✅ Is admin?:', user.is_admin);
        req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            is_admin: user.is_admin || false
        };
        next();
    });
}

// Admin check middleware - must be used AFTER authenticateToken
function isAdmin(req, res, next) {
    if (!req.user) {
        console.log('❌ isAdmin: No user on request');
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    if (!req.user.is_admin) {
        console.log('❌ isAdmin: User is not admin:', req.user.id);
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    console.log('✅ isAdmin: Admin access granted for user:', req.user.id);
    next();
}

module.exports = { authenticateToken, isAdmin };